import React, { useEffect, useState } from 'react';
import { useAudioPlayer } from './AudioPlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Repeat, Repeat1, Shuffle, Maximize2, Music, Heart, Settings } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import WaveformVisualizer from './WaveformVisualizer';

export default function GlobalAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    repeatMode,
    isShuffle,
    audioRef,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    changeVolume,
    toggleRepeat,
    toggleShuffle,
    setIsFullscreen,
    setCurrentTime,
    setDuration,
  } = useAudioPlayer();

  const [visualizerType, setVisualizerType] = useState('waveform'); // 'waveform' or 'bars'

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    
    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', updateDuration);
    audio.addEventListener('ended', handleEnded);

    // Set initial volume
    audio.volume = volume / 100;

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [repeatMode, volume]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (value) => {
    changeVolume(value[0]);
  };

  const toggleMute = () => {
    changeVolume(volume === 0 ? 70 : 0);
  };

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 pb-20 lg:pb-0"
      >
        <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-violet-900/95 backdrop-blur-3xl border-t border-violet-500/20 shadow-[0_-10px_50px_rgba(139,92,246,0.15)]">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 via-pink-600/5 to-blue-600/5 opacity-50" />
          
          <div className="relative max-w-[1800px] mx-auto px-6 py-4">
            <audio 
              ref={audioRef} 
              src={currentTrack.audio_url || currentTrack.stream_audio_url}
              preload="auto"
              crossOrigin="anonymous"
            />

            <div className="space-y-3">
              {/* Waveform Visualizer - Full Width */}
              <div className="w-full hidden lg:block">
                <WaveformVisualizer
                  audioRef={audioRef}
                  isPlaying={isPlaying}
                  height={60}
                  className="rounded-xl bg-slate-800/30 border border-violet-500/10"
                />
              </div>

              {/* Main Controls Row */}
              <div className="flex items-center gap-6">
                {/* Track Info & Album Art */}
                <div className="flex items-center gap-4 min-w-0 flex-1 lg:max-w-xs">
                  <div 
                    className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer group shadow-lg"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <img
                      src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <Maximize2 className="h-6 w-6 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-semibold text-base truncate mb-0.5">
                      {currentTrack.title}
                    </h4>
                    <p className="text-slate-400 text-sm truncate">
                      {currentTrack.style || 'Unknown Style'}
                    </p>
                  </div>
                </div>

                {/* Center Playback Controls */}
                <div className="flex-1 max-w-3xl hidden lg:flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleShuffle}
                      className={cn(
                        "h-9 w-9 rounded-lg transition-all",
                        isShuffle 
                          ? "text-violet-400 bg-violet-500/20 hover:bg-violet-500/30" 
                          : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                      )}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={playPrevious}
                      className="h-10 w-10 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>

                    <Button
                      size="icon"
                      onClick={togglePlayPause}
                      className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:shadow-[0_0_40px_rgba(139,92,246,0.7)] transition-all"
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6 ml-0.5" />
                      )}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={playNext}
                      className="h-10 w-10 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleRepeat}
                      className={cn(
                        "h-9 w-9 rounded-lg transition-all",
                        repeatMode !== 'off' 
                          ? "text-violet-400 bg-violet-500/20 hover:bg-violet-500/30" 
                          : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                      )}
                    >
                      {repeatMode === 'one' ? (
                        <Repeat1 className="h-4 w-4" />
                      ) : (
                        <Repeat className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Progress Bar with Time */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-violet-400 w-12 text-right tabular-nums">
                      {formatTime(currentTime)}
                    </span>
                    <div className="flex-1 relative group">
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={(value) => seek(value[0])}
                        className="cursor-pointer [&>span:first-child]:h-1.5 [&>span:first-child]:bg-gradient-to-r [&>span:first-child]:from-violet-500/20 [&>span:first-child]:to-pink-500/20 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:bg-gradient-to-br [&_[role=slider]]:from-violet-500 [&_[role=slider]]:to-pink-500 [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-violet-500/50"
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-400 w-12 tabular-nums">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Mobile Play/Pause */}
                <div className="lg:hidden">
                  <Button
                    size="icon"
                    onClick={togglePlayPause}
                    className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white shadow-lg"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>
                </div>

                {/* Right Controls - Volume & Actions */}
                <div className="hidden lg:flex items-center gap-3 flex-1 justify-end max-w-xs">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : volume < 50 ? (
                      <Volume1 className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                  <div className="w-28">
                    <Slider
                      value={[volume]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="cursor-pointer [&>span:first-child]:h-1 [&>span:first-child]:bg-slate-700 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-400 w-10 tabular-nums">{volume}%</span>

                  <div className="w-px h-6 bg-slate-700" />

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsFullscreen(true)}
                    className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}