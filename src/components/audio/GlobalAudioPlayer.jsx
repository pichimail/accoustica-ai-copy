import React, { useEffect } from 'react';
import { useAudioPlayer } from './AudioPlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Volume1, Maximize2 } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import FullscreenPlayer from './FullscreenPlayer';
import { resumeAudioContext } from '@/lib/audioContext';

export default function GlobalAudioPlayer() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    repeatMode, audioRef, togglePlayPause, playNext, playPrevious,
    seek, changeVolume, setIsFullscreen, setCurrentTime, setDuration,
  } = useAudioPlayer();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) setDuration(audio.duration);
    };
    const handleEnded = () => {
      if (repeatMode === 'one') { audio.currentTime = 0; audio.play(); }
      else playNext();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', resumeAudioContext);
    audio.volume = volume / 100;

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', resumeAudioContext);
    };
  }, [repeatMode, volume]);

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  // Determine progress pct for gradient bar tint
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Hidden audio element always mounted */}
      {currentTrack && (
        <audio
          ref={audioRef}
          src={currentTrack.audio_url || currentTrack.stream_audio_url}
          preload="auto"
          crossOrigin="anonymous"
        />
      )}

      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 pb-[68px] lg:pb-0"
          >
            {/* Seek progress accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-violet-500 via-pink-500 to-violet-400 transition-none"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="bg-black/50 backdrop-blur-xl border-t border-white/8">
              <div className="max-w-[1800px] mx-auto">
                {/* Mobile: tap to fullscreen row */}
                <div
                  className="lg:hidden flex items-center gap-3 px-3 py-2 cursor-pointer active:bg-white/5"
                  onClick={() => setIsFullscreen(true)}
                >
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                    <img
                      src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                    {isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center gap-0.5 bg-black/20">
                        {[0.3,0.7,0.5].map((d,i) => (
                          <span key={i} className="w-0.5 rounded-full bg-white animate-bounce"
                            style={{ height: '60%', animationDelay: `${d}s`, animationDuration: '0.7s' }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{currentTrack.title}</p>
                    <p className="text-white/40 text-xs truncate">{currentTrack.style || 'Unknown Style'}</p>
                  </div>
                  {/* Mobile controls */}
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost"
                      className="h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                      onClick={(e) => { e.stopPropagation(); playPrevious(); }}>
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button size="icon"
                      className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/40"
                      onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}>
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </Button>
                    <Button size="icon" variant="ghost"
                      className="h-9 w-9 rounded-full text-white/70 hover:text-white hover:bg-white/10"
                      onClick={(e) => { e.stopPropagation(); playNext(); }}>
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Desktop row */}
                <div className="hidden lg:flex items-center gap-4 px-5 py-2.5">
                  {/* Album + track info */}
                  <div className="flex items-center gap-3 min-w-0 w-64 flex-shrink-0 cursor-pointer"
                    onClick={() => setIsFullscreen(true)}>
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden group shadow-lg flex-shrink-0">
                      <img
                        src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <Maximize2 className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{currentTrack.title}</p>
                      <p className="text-white/40 text-xs truncate">{currentTrack.style || 'Unknown Style'}</p>
                    </div>
                  </div>

                  {/* Center controls + seek */}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center justify-center gap-2">
                      <Button size="icon" variant="ghost" onClick={playPrevious}
                        className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-full">
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button size="icon" onClick={togglePlayPause}
                        className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white shadow-lg shadow-violet-500/30">
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={playNext}
                        className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-full">
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40 tabular-nums w-9 text-right">{fmt(currentTime)}</span>
                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={(v) => seek(v[0])}
                        className="flex-1 cursor-pointer [&>span:first-child]:h-1 [&>span:first-child]:bg-white/15 [&_[data-disabled]_[role=slider]]:hidden [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-gradient-to-br [&_[role=slider]]:from-violet-400 [&_[role=slider]]:to-pink-400 [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-md"
                      />
                      <span className="text-xs text-white/40 tabular-nums w-9">{fmt(duration)}</span>
                    </div>
                  </div>

                  {/* Volume + expand */}
                  <div className="flex items-center gap-2 w-44 flex-shrink-0 justify-end">
                    <button onClick={() => changeVolume(volume === 0 ? 70 : 0)} className="text-white/40 hover:text-white transition-colors">
                      {volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 50 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <Slider
                      value={[volume]}
                      max={100}
                      step={1}
                      onValueChange={(v) => changeVolume(v[0])}
                      className="w-24 cursor-pointer [&>span:first-child]:h-1 [&>span:first-child]:bg-white/15 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0"
                    />
                    <Button size="icon" variant="ghost" onClick={() => setIsFullscreen(true)}
                      className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10 rounded-full">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Player */}
      <FullscreenPlayer />
    </>
  );
}