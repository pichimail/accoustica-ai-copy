import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export default function FullscreenPlayer({ 
  track, 
  isOpen, 
  onClose,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  audioRef
}) {
  const [repeatMode, setRepeatMode] = useState('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [visualizerData, setVisualizerData] = useState(Array(40).fill(0));
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Parse lyrics with timestamps
  const parseLyrics = (lyrics) => {
    if (!lyrics) return [];
    
    const lines = lyrics.split('\n').filter(line => line.trim());
    return lines.map((line, index) => ({
      time: (duration / lines.length) * index,
      text: line.trim()
    }));
  };

  const lyricLines = parseLyrics(track?.lyrics);

  // Update current lyric based on time
  useEffect(() => {
    if (!lyricLines.length) return;
    
    const currentIndex = lyricLines.findIndex((lyric, index) => {
      const nextLyric = lyricLines[index + 1];
      return currentTime >= lyric.time && (!nextLyric || currentTime < nextLyric.time);
    });
    
    if (currentIndex !== -1) {
      setCurrentLyricIndex(currentIndex);
    }
  }, [currentTime, lyricLines]);

  // Visualizer setup
  useEffect(() => {
    if (!audioRef?.current || !isPlaying || !isOpen) return;

    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128;
        
        const source = audioContextRef.current.createMediaElementSource(audioRef.current);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (error) {
        console.error('Audio context error:', error);
        return;
      }
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVisualizer = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const normalizedData = Array.from(dataArray).slice(0, 40).map(v => v / 255);
      setVisualizerData(normalizedData);
      
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    updateVisualizer();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isOpen, audioRef]);

  const handleVolumeChange = (value) => {
    if (!audioRef?.current) return;
    const newVolume = value[0];
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef?.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const skipForward = () => {
    if (!audioRef?.current || !duration) return;
    const newTime = Math.min(duration, currentTime + 10);
    audioRef.current.currentTime = newTime;
    onSeek?.([newTime]);
  };

  const skipBackward = () => {
    if (!audioRef?.current) return;
    const newTime = Math.max(0, currentTime - 10);
    audioRef.current.currentTime = newTime;
    onSeek?.([newTime]);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[100] bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col safe-top safe-bottom">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <ChevronDown className="h-6 w-6" />
              </Button>
              <div className="text-center">
                <p className="text-sm text-slate-400">Now Playing</p>
                <p className="text-xs text-slate-500">{track.style}</p>
              </div>
              <div className="w-10" />
            </div>

            {/* Album Art */}
            <div className="flex-1 flex items-center justify-center px-6 py-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative"
              >
                <div className="w-80 h-80 rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/50">
                  <img 
                    src={track.cover_image_url} 
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Visualizer Overlay */}
                <div className="absolute -bottom-6 left-0 right-0 h-20 flex items-end justify-center gap-1 px-8">
                  {visualizerData.map((value, index) => (
                    <motion.div
                      key={index}
                      className="flex-1 rounded-full"
                      style={{
                        height: `${Math.max(10, value * 100)}%`,
                        background: 'linear-gradient(to top, #06b6d4, #3b82f6, #8b5cf6, #ec4899)',
                        boxShadow: '0 0 10px rgba(139, 92, 246, 0.8)',
                      }}
                      animate={{
                        height: `${Math.max(10, value * 100)}%`,
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Track Info & Lyrics */}
            <div className="px-6 py-4">
              <h1 className="text-3xl font-bold text-white text-center mb-2">{track.title}</h1>
              <p className="text-slate-400 text-center mb-6">{track.style}</p>

              {/* Lyrics Display */}
              {lyricLines.length > 0 && (
                <div className="h-24 overflow-hidden mb-6">
                  <div className="space-y-2 text-center">
                    {lyricLines.map((lyric, index) => (
                      <motion.p
                        key={index}
                        initial={{ opacity: 0.3 }}
                        animate={{ 
                          opacity: index === currentLyricIndex ? 1 : 0.3,
                          scale: index === currentLyricIndex ? 1.1 : 1,
                          y: (currentLyricIndex - index) * -30
                        }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "text-lg font-medium transition-all",
                          index === currentLyricIndex 
                            ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400" 
                            : "text-slate-500"
                        )}
                      >
                        {lyric.text}
                      </motion.p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="px-6 mb-4">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={onSeek}
                className="cursor-pointer mb-2"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-center gap-4 mb-6">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={cn(
                    "h-10 w-10 hover:bg-white/10",
                    isShuffle ? "text-cyan-400" : "text-slate-400"
                  )}
                >
                  <Shuffle className="h-5 w-5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={skipBackward}
                  className="h-12 w-12 text-white hover:bg-white/10"
                >
                  <SkipBack className="h-6 w-6" />
                </Button>

                <Button
                  size="icon"
                  onClick={onTogglePlay}
                  className="h-20 w-20 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-600 text-white shadow-2xl shadow-purple-500/50"
                >
                  {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={skipForward}
                  className="h-12 w-12 text-white hover:bg-white/10"
                >
                  <SkipForward className="h-6 w-6" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    const modes = ['off', 'all', 'one'];
                    const currentIndex = modes.indexOf(repeatMode);
                    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
                  }}
                  className={cn(
                    "h-10 w-10 hover:bg-white/10",
                    repeatMode !== 'off' ? "text-cyan-400" : "text-slate-400"
                  )}
                >
                  {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                </Button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-3 justify-center">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-48 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}