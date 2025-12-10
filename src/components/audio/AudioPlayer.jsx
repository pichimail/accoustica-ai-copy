import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Volume1, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Maximize2 } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

export default function AudioPlayer({ 
  src, 
  title, 
  artist,
  coverImage,
  minimal = false,
  onPlay,
  onOpenFullscreen,
  className 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [previousVolume, setPreviousVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [visualizerData, setVisualizerData] = useState(Array(60).fill(0));
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceNodeRef = useRef(null);

  // Initialize audio and set volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set initial volume (0-100 scale to 0-1)
    audio.volume = volume / 100;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else if (repeatMode === 'all') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        setIsPlaying(false);
      }
    };

    const handleCanPlay = () => {
      updateDuration();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Try to load
    if (src) {
      audio.load();
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [src, repeatMode]);

  // Initialize audio visualizer with proper audio context handling
  useEffect(() => {
    if (!audioRef.current || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128;
        
        if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceNodeRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
        }
      }

      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVisualizer = () => {
        if (!analyserRef.current || !isPlaying) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const normalizedData = Array.from(dataArray).slice(0, 60).map(v => v / 255);
        setVisualizerData(normalizedData);
        
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();
    } catch (error) {
      console.error('Visualizer error:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    if (!audioRef.current || !src) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Resume audio context if needed
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        await audioRef.current.play();
        onPlay?.();
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleSeek = (value) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    setVolume(newVolume);
    audioRef.current.volume = newVolume / 100;
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      const volToRestore = previousVolume > 0 ? previousVolume : 70;
      setVolume(volToRestore);
      audioRef.current.volume = volToRestore / 100;
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, currentTime + 10);
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, currentTime - 10);
  };

  const toggleRepeat = () => {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (minimal) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <audio ref={audioRef} src={src} preload="auto" crossOrigin="anonymous" />
        <Button
          size="icon"
          variant="ghost"
          onClick={togglePlay}
          disabled={!src}
          className="h-10 w-10 rounded-full bg-violet-500/20 hover:bg-violet-500/30 text-violet-400"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>
        <div className="flex-1">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
        </div>
        <span className="text-xs text-slate-400 w-16 text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-800",
      className
    )}>
      <div className="relative z-10 px-4 py-3">
        <audio ref={audioRef} src={src} preload="auto" crossOrigin="anonymous" />
        
        <div className="flex items-center gap-4">
          {/* Album Art */}
          {coverImage && (
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={coverImage} 
                alt={title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Track Info & Progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex-1 min-w-0 mr-4">
                {title && (
                  <h4 className="text-white font-medium truncate text-sm">{title}</h4>
                )}
                {artist && (
                  <p className="text-slate-400 text-xs truncate">{artist}</p>
                )}
              </div>
              
              {/* Fullscreen Button (Mobile) */}
              <Button
                size="icon"
                variant="ghost"
                onClick={onOpenFullscreen}
                className="lg:hidden h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Compact Waveform */}
            <div className="relative h-8 mb-2 rounded-lg bg-slate-800/50 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center gap-[1px] px-2">
                {visualizerData.map((value, index) => {
                  const progress = currentTime / duration;
                  const barProgress = index / visualizerData.length;
                  const isPast = barProgress <= progress;
                  
                  return (
                    <motion.div
                      key={index}
                      className="flex-1 rounded-full"
                      style={{
                        height: `${Math.max(15, value * 80)}%`,
                        background: isPast 
                          ? 'linear-gradient(to top, #06b6d4, #3b82f6, #8b5cf6, #ec4899)'
                          : 'rgba(100, 116, 139, 0.3)',
                      }}
                      animate={{
                        height: `${Math.max(15, value * 80)}%`,
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Progress Slider */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-9 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="flex-1 cursor-pointer h-1"
              />
              <span className="text-[10px] text-slate-400 w-9">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={skipBackward}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 hidden sm:flex"
            >
              <SkipBack className="h-3 w-3" />
            </Button>

            <Button
              size="icon"
              onClick={togglePlay}
              disabled={!src}
              className="h-10 w-10 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 text-white shadow-lg"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={skipForward}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 hidden sm:flex"
            >
              <SkipForward className="h-3 w-3" />
            </Button>

            {/* Volume Controls */}
            <div className="hidden md:flex items-center gap-2 ml-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleMute}
                className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : volume < 50 ? (
                  <Volume1 className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
              <div className="w-24">
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
              <span className="text-xs text-slate-400 w-8">{volume}%</span>
            </div>

            {/* Repeat Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleRepeat}
              className={cn(
                "h-8 w-8 hidden lg:flex",
                repeatMode === 'off' ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-violet-400 hover:text-violet-300 hover:bg-slate-800"
              )}
            >
              {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}