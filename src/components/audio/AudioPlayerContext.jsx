import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AudioPlayerContext = createContext();

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
    if (currentTrack?.id === track.id && isPlaying) {
      // If clicking the same playing track, pause it
      pauseTrack();
      return;
    }

    setCurrentTrack(track);
    
    if (trackQueue.length > 0) {
      setQueue(trackQueue);
      const index = trackQueue.findIndex(t => t.id === track.id);
      setQueueIndex(index >= 0 ? index : 0);
    }

    // Wait for next tick to ensure audio ref is updated
    setTimeout(async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Playback error:', error);
        }
      }
    }, 100);
  };

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
