import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const AudioPlayerContext = createContext(null);

const normalizeAudioUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  return url;
};

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

  const expanded = [...raw];
  for (const candidate of raw) {
    if (candidate.startsWith('http://')) {
      expanded.push(`https://${candidate.slice(7)}`);
    } else if (candidate.startsWith('https://')) {
      expanded.push(`http://${candidate.slice(8)}`);
    }
  }

  return Array.from(new Set(expanded));
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

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
};

export function AudioPlayerProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [repeatMode, setRepeatMode] = useState('off'); // off, all, one
  const [isShuffle, setIsShuffle] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioSettings, setAudioSettings] = useState(null);
  const audioRef = useRef(null);
  const pendingPlayRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    base44.auth.me()
      .then((user) => {
        if (!mounted || !user?.audio_settings) return;
        const settings = typeof user.audio_settings === 'string'
          ? JSON.parse(user.audio_settings)
          : user.audio_settings;
        setAudioSettings(settings);
        if (typeof settings.defaultVolume === 'number') {
          const nextVolume = Math.max(0, Math.min(100, settings.defaultVolume));
          setVolume(nextVolume);
          if (audioRef.current) audioRef.current.volume = nextVolume / 100;
        }
        if (settings.autoplayNext === true) setRepeatMode('all');
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Play a specific track
  const playTrack = async (track, trackQueue = []) => {
    const sourceCandidates = buildAudioCandidates(track);
    if (sourceCandidates.length === 0) {
      toast.error('This track does not have a playable audio URL yet');
      return;
    }

    if (currentTrack?.id === track.id && isPlaying) {
      // If clicking the same playing track, pause it
      pauseTrack();
      return;
    }

    pendingPlayRef.current = track.id || sourceCandidates[0];
    setCurrentTrack({ ...track, __resolvedAudioSource: sourceCandidates[0] });
    setCurrentTime(0);
    setDuration(Number(track.duration) || 0);
    
    if (trackQueue.length > 0) {
      const playableQueue = trackQueue.filter(item => getTrackAudioSource(item));
      setQueue(playableQueue);
      const index = playableQueue.findIndex(t => t.id === track.id);
      setQueueIndex(index >= 0 ? index : 0);
    }

    const tryPlay = async (attempt = 0) => {
      const audio = audioRef.current;
      if (!audio) {
        if (attempt < 8) window.setTimeout(() => tryPlay(attempt + 1), 60);
        return;
      }
      try {
        const candidate = sourceCandidates[Math.min(attempt, sourceCandidates.length - 1)];
        if (audio.src !== candidate) audio.src = candidate;
        audio.volume = volume / 100;
        audio.load();
        await audio.play();
        pendingPlayRef.current = null;
        setCurrentTrack((prev) => prev ? { ...prev, __resolvedAudioSource: candidate } : prev);
        setIsPlaying(true);
      } catch (error) {
        if (attempt < sourceCandidates.length - 1) {
          window.setTimeout(() => tryPlay(attempt + 1), 120);
        } else {
          pendingPlayRef.current = null;
          setIsPlaying(false);
          console.error('Playback error:', error);
          toast.error('Playback failed: track URL is unreachable');
        }
      }
    };

    window.setTimeout(() => tryPlay(), 0);
  };

  useEffect(() => {
    const source = getTrackAudioSource(currentTrack);
    if (!currentTrack || !source || !pendingPlayRef.current) return undefined;
    const timer = window.setTimeout(async () => {
      if (audioRef.current && pendingPlayRef.current) {
        try {
          audioRef.current.volume = volume / 100;
          await audioRef.current.play();
          pendingPlayRef.current = null;
          setIsPlaying(true);
        } catch (error) {
          console.error('Playback error:', error);
        }
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [currentTrack, volume]);

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      pauseTrack();
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Playback error:', error);
      }
    }
  };

  const playNext = () => {
    if (queue.length === 0) return;
    
    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return;
      }
    }
    
    setQueueIndex(nextIndex);
    playTrack(queue[nextIndex], queue);
  };

  const playPrevious = () => {
    if (queue.length === 0) return;
    
    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      seek(0);
      return;
    }
    
    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }
    
    setQueueIndex(prevIndex);
    playTrack(queue[prevIndex], queue);
  };

  const seek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const changeVolume = (newVolume) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const toggleRepeat = () => {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const addToQueue = (track) => {
    setQueue([...queue, track]);
  };

  const removeFromQueue = (index) => {
    const newQueue = queue.filter((_, i) => i !== index);
    setQueue(newQueue);
    if (queueIndex >= index && queueIndex > 0) {
      setQueueIndex(queueIndex - 1);
    }
  };

  const clearQueue = () => {
    setQueue([]);
    setQueueIndex(0);
  };

  const value = {
    // State
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    repeatMode,
    isShuffle,
    isFullscreen,
    audioSettings,
    audioRef,
    
    // Actions
    playTrack,
    pauseTrack,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    changeVolume,
    toggleRepeat,
    toggleShuffle,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setIsFullscreen,
    setCurrentTime,
    setDuration,
    setIsPlaying,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}
