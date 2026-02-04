import React, { useEffect, useState } from 'react';
import { useAudioPlayer } from './AudioPlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Repeat, Repeat1, Shuffle, Maximize2, Music, Heart, Settings } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import WaveformVisualizer from './WaveformVisualizer';
import VisualizerSettings from './VisualizerSettings';

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
  const [colorPalette, setColorPalette] = useState('violet');
  const [sensitivity, setSensitivity] = useState(100);
  const [smoothness, setSmoothness] = useState(50);
  const [showSettings, setShowSettings] = useState(false);

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
        <div className="relative bg-slate-900/30 backdrop-blur-lg border-t border-white/10">
          <div className="relative max-w-[1800px] mx-auto px-4 py-2">
            <audio 
              ref={audioRef} 
              src={currentTrack.audio_url || currentTrack.stream_audio_url}
              preload="auto"
              crossOrigin="anonymous"
            />

            <div className="space-y-2">
              {/* Main Controls Row */}
              <div className="flex items-center gap-3">
                {/* Track Info & Album Art */}
                <div className="flex items-center gap-2 min-w-0 flex-1 lg:max-w-xs">
                  <div 
                    className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer group"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <img
                      src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <Maximize2 className="h-4 w-4 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-white font-medium text-sm truncate">
                      {currentTrack.title}
                    </h4>
                    <p className="text-slate-400 text-xs truncate">
                      {currentTrack.style || 'Unknown Style'}
                    </p>
                  </div>
                </div>

                {/* Center Playback Controls */}
                <div className="flex-1 hidden lg:flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={playPrevious}
                    className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    onClick={togglePlayPause}
                    className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={playNext}
                    className="h-8 w-8 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>

                  <span className="text-xs font-medium text-slate-400 w-10 text-right tabular-nums ml-2">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 relative group">
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={(value) => seek(value[0])}
                      className="cursor-pointer [&>span:first-child]:h-1 [&>span:first-child]:bg-white/20 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-400 w-10 tabular-nums">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Mobile Play/Pause */}
                <div className="lg:hidden">
                  <Button
                    size="icon"
                    onClick={togglePlayPause}
                    className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>
                </div>

                {/* Right Controls - Volume & Actions */}
                <div className="hidden lg:flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : volume < 50 ? (
                      <Volume1 className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="w-20">
                    <Slider
                      value={[volume]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="cursor-pointer [&>span:first-child]:h-1 [&>span:first-child]:bg-white/20 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0"
                    />
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsFullscreen(true)}
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visualizer Settings Dialog */}
        <VisualizerSettings
          open={showSettings}
          onClose={() => setShowSettings(false)}
          visualizerType={visualizerType}
          setVisualizerType={setVisualizerType}
          colorPalette={colorPalette}
          setColorPalette={setColorPalette}
          sensitivity={sensitivity}
          setSensitivity={setSensitivity}
          smoothness={smoothness}
          setSmoothness={setSmoothness}
        />
      </motion.div>
    </AnimatePresence>
  );
}