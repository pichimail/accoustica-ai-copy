import React, { useEffect } from 'react';
import { useAudioPlayer } from './AudioPlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Repeat, Repeat1, Shuffle, Maximize2, Music } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedVisualizer from './EnhancedVisualizer';

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
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-violet-900/50 backdrop-blur-2xl border-t border-white/10 shadow-2xl">
          <div className="max-w-[1600px] mx-auto px-4 py-3">
            <audio 
              ref={audioRef} 
              src={currentTrack.audio_url || currentTrack.stream_audio_url}
              preload="auto"
              crossOrigin="anonymous"
            />

            <div className="flex items-center gap-4">
              {/* Track Info & Album Art */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div 
                  className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer group"
                  onClick={() => setIsFullscreen(true)}
                >
                  <img
                    src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-white font-medium text-sm truncate">
                    {currentTrack.title}
                  </h4>
                  <p className="text-slate-400 text-xs truncate">
                    {currentTrack.style || 'Unknown Artist'}
                  </p>
                </div>
              </div>

              {/* Center Controls */}
              <div className="flex-1 max-w-2xl hidden lg:block">
                <div className="flex flex-col gap-1">
                  {/* Mini Visualizer */}
                  <div className="mb-1">
                    <EnhancedVisualizer
                      audioRef={audioRef}
                      isPlaying={isPlaying}
                      height={40}
                      className="rounded-lg overflow-hidden"
                    />
                  </div>
                  
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleShuffle}
                      className={cn(
                        "h-8 w-8 hidden xl:flex",
                        isShuffle ? "text-violet-400" : "text-slate-400 hover:text-white"
                      )}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={playPrevious}
                      className="h-9 w-9 text-slate-300 hover:text-white hover:bg-white/10"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      onClick={togglePlayPause}
                      className="h-10 w-10 rounded-full bg-white hover:bg-white/90 text-slate-900 shadow-lg"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5 ml-0.5" />
                      )}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={playNext}
                      className="h-9 w-9 text-slate-300 hover:text-white hover:bg-white/10"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleRepeat}
                      className={cn(
                        "h-8 w-8 hidden xl:flex",
                        repeatMode !== 'off' ? "text-violet-400" : "text-slate-400 hover:text-white"
                      )}
                    >
                      {repeatMode === 'one' ? (
                        <Repeat1 className="h-4 w-4" />
                      ) : (
                        <Repeat className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-10 text-right">
                      {formatTime(currentTime)}
                    </span>
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={(value) => seek(value[0])}
                      className="flex-1 cursor-pointer"
                    />
                    <span className="text-xs text-slate-400 w-10">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>
                </div>
              </div>

              {/* Mobile Play/Pause */}
              <div className="lg:hidden">
                <Button
                  size="icon"
                  onClick={togglePlayPause}
                  className="h-10 w-10 rounded-full bg-white hover:bg-white/90 text-slate-900"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
              </div>

              {/* Right Controls - Volume */}
              <div className="hidden lg:flex items-center gap-3 flex-1 justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  className="h-8 w-8 text-slate-400 hover:text-white"
                >
                  {volume === 0 ? (
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

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsFullscreen(true)}
                  className="h-8 w-8 text-slate-400 hover:text-white ml-2"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}