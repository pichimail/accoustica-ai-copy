// @ts-nocheck
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
// TODO_EXPORT_REPLACE_WITH_GOOGLE_AUTH: base44.auth.me() → NextAuth session
import { base44 } from '@/api/exportClient';
import * as trackClient from '@/api/trackClient';
import * as musicClient from '@/api/musicClient';
import { toast } from 'sonner';
import { ensureAudioContext, resumeAudioContext } from '@/lib/audioContext';

const AudioPlayerContext = createContext(null);
const PLAYBACK_STORAGE_KEY = 'accoustica_playback_state_v1';

const readStoredPlayback = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PLAYBACK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.currentTrack || !getTrackAudioSource(parsed.currentTrack)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStoredPlayback = (state) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAYBACK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can fail in private mode or under quota pressure. Playback must continue.
  }
};

const clearStoredPlayback = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PLAYBACK_STORAGE_KEY);
  } catch {}
};

export const normalizeAudioUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  return url;
};

export const getTrackAudioSource = (track) => (
  track?.__resolvedAudioSource
  || track?.stream_audio_url
  || track?.audio_url
  || track?.streamAudioUrl
  || track?.audioUrl
  || track?.sourceAudioUrl
  || track?.url
  || ''
);

const buildAudioCandidates = (track) => {
  const raw = [
    track?.__resolvedAudioSource,
    track?.stream_audio_url,
    track?.audio_url,
    track?.streamAudioUrl,
    track?.audioUrl,
    track?.sourceAudioUrl,
    track?.url,
  ].map(normalizeAudioUrl).filter(Boolean);
  return Array.from(new Set(raw));
};

// Fetch fresh audio URLs from the API when stored URLs expire
const refreshTrackUrls = async (track) => {
  if (!track?.task_id) return null;
  try {
    const res = await musicClient.getDetails(track.task_id);
    const sunoTracks = res?.data?.tracks || [];
    let match = sunoTracks.find(t => t.id === track.external_audio_id);
    if (!match && sunoTracks.length > 0) match = sunoTracks[0];
    if (match) {
      const freshUrl = match.stream_audio_url || match.audio_url || match.audioUrl || match.streamAudioUrl;
      if (freshUrl) {
        await trackClient.updateTrack(track.id, {
          audio_url: match.audio_url || match.audioUrl || freshUrl,
          stream_audio_url: match.stream_audio_url || match.streamAudioUrl || freshUrl,
        });
        return freshUrl;
      }
    }
  } catch (e) {
    console.warn('Failed to refresh track URLs:', e);
  }
  return null;
};

// Wait for audio to be ready to play, with timeout.
// Resolves on the FIRST of: canplay OR loadedmetadata (readyState >= 1) so playback
// starts as soon as the browser has enough to begin buffering — no long stalls.
const waitForCanPlay = (audio, timeoutMs = 6000) => {
  return new Promise((resolve, reject) => {
    // Already has current data — play right away
    if (audio.readyState >= 2) { resolve(); return; }
    let done = false;
    const cleanup = () => {
      done = true;
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('loadeddata', onReady);
      audio.removeEventListener('error', onError);
      clearTimeout(timer);
    };
    const onReady = () => { if (!done) { cleanup(); resolve(); } };
    const onError = (e) => { if (!done) { cleanup(); reject(e); } };
    const timer = setTimeout(() => {
      // Don't hard-fail on timeout — try playing anyway, browser may still stream
      if (!done) { cleanup(); resolve(); }
    }, timeoutMs);
    audio.addEventListener('canplay', onReady, { once: true });
    audio.addEventListener('loadeddata', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
  });
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return context;
};

export function AudioPlayerProvider({ children }) {
  const restoredPlaybackRef = useRef(readStoredPlayback());
  const restoredPlayback = restoredPlaybackRef.current;
  const restoredTrack = restoredPlayback?.currentTrack || null;
  const restoredQueue = Array.isArray(restoredPlayback?.queue) ? restoredPlayback.queue : [];

  const [currentTrack, setCurrentTrack] = useState(restoredTrack);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(Number(restoredPlayback?.currentTime) || 0);
  const [duration, setDuration] = useState(Number(restoredPlayback?.duration || restoredTrack?.duration) || 0);
  const [volume, setVolume] = useState(Number(restoredPlayback?.volume) || 70);
  const [queue, setQueue] = useState(restoredQueue);
  const [queueIndex, setQueueIndex] = useState(Number(restoredPlayback?.queueIndex) || 0);
  const [repeatMode, setRepeatMode] = useState(restoredPlayback?.repeatMode || 'off');
  const [isShuffle, setIsShuffle] = useState(!!restoredPlayback?.isShuffle);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(!!restoredTrack);
  const [audioSettings, setAudioSettings] = useState(null);

  // audioRef is populated by GlobalAudioPlayer's callback ref
  const audioRef = useRef(null);
  // Cancel stale load operations
  const loadingIdRef = useRef(null);
  const volumeRef = useRef(Number(restoredPlayback?.volume) || 70);
  const restoredSeekAppliedRef = useRef(false);

  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Persist enough playback state to restore the player after refresh.
  useEffect(() => {
    if (!currentTrack) {
      clearStoredPlayback();
      return;
    }

    writeStoredPlayback({
      currentTrack,
      currentTime,
      duration,
      volume,
      queue,
      queueIndex,
      repeatMode,
      isShuffle,
      savedAt: Date.now(),
    });
  }, [currentTrack, currentTime, duration, volume, queue, queueIndex, repeatMode, isShuffle]);

  // On refresh, rehydrate the hidden audio node with the previous source and seek position.
  // It intentionally does not auto-play because mobile browsers block autoplay without user action.
  useEffect(() => {
    if (restoredSeekAppliedRef.current || !currentTrack || !audioRef.current) return;
    const source = normalizeAudioUrl(getTrackAudioSource(currentTrack));
    if (!source) return;

    const audio = audioRef.current;
    restoredSeekAppliedRef.current = true;
    audio.crossOrigin = 'anonymous';
    audio.src = source;
    audio.__lastSrc = source;
    audio.volume = volumeRef.current / 100;
    audio.preload = 'metadata';
    audio.load();

    const seekTo = Math.max(0, Number(restoredPlaybackRef.current?.currentTime) || 0);
    const applySeek = () => {
      if (seekTo > 0 && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(seekTo, Math.max(0, audio.duration - 0.25));
        setCurrentTime(audio.currentTime);
      }
    };

    audio.addEventListener('loadedmetadata', applySeek, { once: true });
    return () => audio.removeEventListener('loadedmetadata', applySeek);
  }, [currentTrack]);

  // Load user audio settings once
  useEffect(() => {
    let mounted = true;
    base44.auth.me()
      .then((user) => {
        if (!mounted || !user?.audio_settings) return;
        const settings = typeof user.audio_settings === 'string'
          ? JSON.parse(user.audio_settings)
          : user.audio_settings;
        setAudioSettings(settings);
        if (typeof settings.defaultVolume === 'number' && !restoredPlaybackRef.current?.volume) {
          const v = Math.max(0, Math.min(100, settings.defaultVolume));
          setVolume(v);
          volumeRef.current = v;
          if (audioRef.current) audioRef.current.volume = v / 100;
        }
        if (settings.autoplayNext === true && !restoredPlaybackRef.current?.repeatMode) setRepeatMode('all');
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const playTrack = useCallback(async (track, trackQueue = []) => {
    ensureAudioContext();
    resumeAudioContext();

    const candidates = buildAudioCandidates(track);
    if (candidates.length === 0) {
      toast.error('This track does not have a playable audio URL yet');
      return;
    }

    // Toggle play/pause for the same track
    if (currentTrack?.id === track.id) {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        ensureAudioContext();
        resumeAudioContext();
        setIsPlaying(true); // optimistic — instant UI response
        try {
          // If the source got dropped, restore it before playing
          if (!audio.src && audio.__lastSrc) { audio.src = audio.__lastSrc; audio.load(); }
          await audio.play();
        } catch (e) {
          setIsPlaying(false);
          console.error('Resume play failed:', e);
        }
      }
      return;
    }

    const loadId = Date.now() + Math.random();
    loadingIdRef.current = loadId;

    setPlayerVisible(true);
    setCurrentTrack({ ...track, __resolvedAudioSource: candidates[0] });
    setCurrentTime(0);
    setDuration(Number(track.duration) || 0);
    setIsPlaying(true); // optimistic — instant UI response on first click

    if (trackQueue.length > 0) {
      const playableQueue = trackQueue.filter(t => getTrackAudioSource(t));
      setQueue(playableQueue);
      const idx = playableQueue.findIndex(t => t.id === track.id);
      setQueueIndex(idx >= 0 ? idx : 0);
    }

    const attemptPlay = async (urlIndexOrUrl, refreshed = false) => {
      if (loadingIdRef.current !== loadId) return;

      let audio = audioRef.current;
      if (!audio) {
        // Audio element not mounted yet — retry
        const retryCount = typeof urlIndexOrUrl === 'number' ? urlIndexOrUrl : 0;
        if (retryCount < 20) {
          setTimeout(() => attemptPlay(retryCount), 50);
        }
        return;
      }

      const url = refreshed ? urlIndexOrUrl : candidates[Math.min(urlIndexOrUrl, candidates.length - 1)];

      try {
        audio.pause();
        audio.removeAttribute('src');

        // crossOrigin MUST be set before src for AudioContext CORS to work
        audio.crossOrigin = 'anonymous';
        audio.src = url;
        audio.__lastSrc = url;
        audio.volume = volumeRef.current / 100;
        audio.preload = 'auto';
        audio.load();

        await waitForCanPlay(audio, 6000);

        if (loadingIdRef.current !== loadId) return;

        ensureAudioContext();
        resumeAudioContext();
        await audio.play();

        if (loadingIdRef.current !== loadId) return;
        setIsPlaying(true);
        setCurrentTrack(prev => prev ? { ...prev, __resolvedAudioSource: url } : prev);

      } catch (error) {
        if (loadingIdRef.current !== loadId) return;
        console.warn('Playback attempt failed:', typeof urlIndexOrUrl === 'number' ? `URL[${urlIndexOrUrl}]` : 'refreshed', error?.message || error);

        if (!refreshed) {
          const nextIndex = (typeof urlIndexOrUrl === 'number' ? urlIndexOrUrl : 0) + 1;
          if (nextIndex < candidates.length) {
            setTimeout(() => attemptPlay(nextIndex), 150);
          } else {
            // Try to refresh from API
            const freshUrl = await refreshTrackUrls(track);
            if (freshUrl && loadingIdRef.current === loadId) {
              await attemptPlay(freshUrl, true);
            } else if (loadingIdRef.current === loadId) {
              setIsPlaying(false);
              toast.error('Playback failed — try refreshing the page.');
            }
          }
        } else {
          setIsPlaying(false);
          toast.error('Playback failed — try refreshing the page.');
        }
      }
    };

    // Start first attempt (0ms delay — immediate)
    attemptPlay(0);
  }, [currentTrack, isPlaying]);

  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureAudioContext();
    resumeAudioContext();
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        const source = normalizeAudioUrl(getTrackAudioSource(currentTrack));
        if (!audio.src && source) {
          audio.crossOrigin = 'anonymous';
          audio.src = source;
          audio.__lastSrc = source;
          audio.load();
          await waitForCanPlay(audio, 6000);
        }
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        setIsPlaying(false);
        console.error('togglePlayPause error:', error);
      }
    }
  }, [currentTrack, isPlaying]);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') nextIndex = 0;
      else return;
    }
    setQueueIndex(nextIndex);
    playTrack(queue[nextIndex], queue);
  }, [queue, queueIndex, repeatMode, playTrack]);

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return;
    if (currentTime > 3) { seek(0); return; }
    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) prevIndex = queue.length - 1;
    setQueueIndex(prevIndex);
    playTrack(queue[prevIndex], queue);
  }, [queue, queueIndex, currentTime, playTrack]);

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const changeVolume = useCallback((newVolume) => {
    const v = Math.max(0, Math.min(100, newVolume));
    setVolume(v);
    volumeRef.current = v;
    if (audioRef.current) audioRef.current.volume = v / 100;
  }, []);

  const toggleRepeat = useCallback(() => {
    const modes = ['off', 'all', 'one'];
    setRepeatMode(prev => modes[(modes.indexOf(prev) + 1) % modes.length]);
  }, []);

  const toggleShuffle = useCallback(() => setIsShuffle(s => !s), []);
  const addToQueue = useCallback((track) => setQueue(q => [...q, track]), []);
  const removeFromQueue = useCallback((index) => {
    setQueue(q => q.filter((_, i) => i !== index));
    setQueueIndex(qi => qi >= index && qi > 0 ? qi - 1 : qi);
  }, []);
  const clearQueue = useCallback(() => { setQueue([]); setQueueIndex(0); }, []);

  const value = {
    currentTrack, isPlaying, currentTime, duration, volume,
    queue, queueIndex, repeatMode, isShuffle, isFullscreen, playerVisible,
    audioSettings, audioRef,
    playTrack, pauseTrack, togglePlayPause, playNext, playPrevious,
    seek, changeVolume, toggleRepeat, toggleShuffle,
    addToQueue, removeFromQueue, clearQueue,
    setIsFullscreen, setPlayerVisible, setCurrentTime, setDuration, setIsPlaying,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}