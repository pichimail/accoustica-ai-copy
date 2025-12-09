import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Maximize2 } from 'lucide-react';
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
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // off, all, one
  const [isShuffle, setIsShuffle] = useState(false);
  const [visualizerData, setVisualizerData] = useState(Array(60).fill(0));
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (repeatMode === 'all') {
        audio.currentTime = 0;
        audio.play();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [src, repeatMode]);

  // Initialize audio visualizer
  useEffect(() => {
    if (!audioRef.current || !isPlaying) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      
      const source = audioContextRef.current.createMediaElementSource(audioRef.current);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVisualizer = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const normalizedData = Array.from(dataArray).slice(0, 60).map(v => v / 255);
      setVisualizerData(normalizedData);
      
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    updateVisualizer();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current || !src) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
      onPlay?.();
    }
    setIsPlaying(!isPlaying);
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
    audioRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
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
        <audio ref={audioRef} src={src} preload="metadata" />
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
            step={1}
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
      "relative rounded-3xl overflow-hidden border border-white/10",
      "bg-gradient-to-br from-slate-900/95 via-purple-900/30 to-slate-900/95 backdrop-blur-2xl",
      className
    )}>
      {/* Gradient Border Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 via-purple-500 via-pink-500 to-orange-500 opacity-50 blur-xl"></div>
      
      <div className="relative z-10 p-6">
        <audio ref={audioRef} src={src} preload="metadata" />
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          {coverImage && (
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-xl">
              <img 
                src={coverImage} 
                alt={title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-white font-semibold truncate text-lg">{title}</h4>
            )}
            {artist && (
              <p className="text-slate-400 text-sm truncate">{artist}</p>
            )}
          </div>

          {/* Fullscreen Button (Mobile) */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onOpenFullscreen}
            className="lg:hidden text-slate-400 hover:text-white hover:bg-white/10"
          >
            <Maximize2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Waveform Visualizer */}
        <div className="relative h-24 mb-4 rounded-xl bg-black/20 backdrop-blur-sm border border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-4">
            {visualizerData.map((value, index) => {
              const progress = currentTime / duration;
              const barProgress = index / visualizerData.length;
              const isPast = barProgress <= progress;
              
              return (
                <motion.div
                  key={index}
                  className="flex-1 rounded-full"
                  style={{
                    height: `${Math.max(20, value * 100)}%`,
                    background: isPast 
                      ? 'linear-gradient(to top, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #f97316)'
                      : 'rgba(100, 116, 139, 0.3)',
                    boxShadow: isPast ? '0 0 10px rgba(139, 92, 246, 0.5)' : 'none',
                  }}
                  animate={{
                    height: `${Math.max(20, value * 100)}%`,
                  }}
                  transition={{ duration: 0.1 }}
                />
              );
            })}
          </div>

          {/* Time markers */}
          <div className="absolute bottom-2 left-4 right-4 flex justify-between text-[10px] text-slate-500">
            {[0, 0.25, 0.5, 0.75, 1].map((point, i) => (
              <span key={i}>{formatTime(duration * point)}</span>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs text-slate-400 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1 cursor-pointer"
          />
          <span className="text-xs text-slate-400 w-12">
            {formatTime(duration)}
          </span>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/10"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-24 cursor-pointer hidden md:block"
            />
          </div>
          
          {/* Center Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsShuffle(!isShuffle)}
              className={cn(
                "h-9 w-9 hover:bg-white/10",
                isShuffle ? "text-cyan-400" : "text-slate-400 hover:text-white"
              )}
            >
              <Shuffle className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={skipBackward}
              className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/10"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              onClick={togglePlay}
              disabled={!src}
              className="h-14 w-14 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 text-white shadow-lg shadow-purple-500/50"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={skipForward}
              className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/10"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={toggleRepeat}
              className={cn(
                "h-9 w-9 hover:bg-white/10",
                repeatMode !== 'off' ? "text-cyan-400" : "text-slate-400 hover:text-white"
              )}
            >
              {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </Button>
          </div>

          {/* Right spacer for balance */}
          <div className="w-32 hidden md:block" />
        </div>
      </div>
    </div>
  );
}