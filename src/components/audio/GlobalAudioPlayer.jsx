import React, { useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from './AudioPlayerContext';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Volume1, Maximize2,
  Repeat, Repeat1, Shuffle, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import FullscreenPlayer from './FullscreenPlayer';
import { resumeAudioContext } from '@/lib/audioContext';

export default function GlobalAudioPlayer() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    repeatMode, isShuffle, audioRef, togglePlayPause, playNext, playPrevious,
    seek, changeVolume, toggleRepeat, toggleShuffle, setIsFullscreen,
    setCurrentTime, setDuration,
  } = useAudioPlayer();

  const progressRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => { if (!isDragging) setCurrentTime(audio.currentTime); };
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
  }, [repeatMode, volume, isDragging]);

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const pct = duration > 0 ? ((isDragging ? dragTime : currentTime) / duration) * 100 : 0;

  const handleProgressClick = (e) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    seek(ratio * duration);
  };

  const handleProgressMouseDown = (e) => {
    setIsDragging(true);
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setDragTime((x / rect.width) * duration);

    const onMove = (me) => {
      const r = progressRef.current?.getBoundingClientRect();
      if (!r) return;
      const nx = Math.max(0, Math.min(me.clientX - r.left, r.width));
      setDragTime((nx / r.width) * duration);
    };
    const onUp = (me) => {
      const r = progressRef.current?.getBoundingClientRect();
      if (r) {
        const nx = Math.max(0, Math.min(me.clientX - r.left, r.width));
        seek((nx / r.width) * duration);
      }
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <>
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
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-50 pb-[60px] lg:pb-0"
          >
            {/* Gradient seek bar — full width, interactive */}
            <div
              ref={progressRef}
              className="absolute top-0 left-0 right-0 h-[3px] cursor-pointer group"
              onClick={handleProgressClick}
              onMouseDown={handleProgressMouseDown}
            >
              {/* track */}
              <div className="absolute inset-0 bg-white/10" />
              {/* fill */}
              <div
                className="absolute top-0 left-0 h-full transition-none"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #a855f7, #ec4899, #f43f5e)',
                  boxShadow: '0 0 8px rgba(168,85,247,0.8)',
                }}
              />
              {/* thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${pct}% - 6px)` }}
              />
            </div>

            {/* Player body */}
            <div className="bg-black/70 backdrop-blur-2xl border-t border-white/[0.06]">
              {/* Mobile */}
              <div className="lg:hidden flex items-center gap-3 px-3 py-2.5">
                <div
                  className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow-lg cursor-pointer"
                  onClick={() => setIsFullscreen(true)}
                >
                  <img
                    src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 flex items-end justify-center gap-[2px] bg-black/20 pb-1.5">
                      {[0.2, 0.5, 0.3, 0.7, 0.4].map((d, i) => (
                        <span key={i}
                          className="w-[2px] rounded-full"
                          style={{
                            background: 'linear-gradient(to top, #7c3aed, #ec4899)',
                            animationName: 'mobileViz',
                            animationDuration: `${0.5 + d}s`,
                            animationDelay: `${d * 0.2}s`,
                            animationTimingFunction: 'ease-in-out',
                            animationIterationCount: 'infinite',
                            animationDirection: 'alternate',
                            height: '40%',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsFullscreen(true)}>
                  <p className="text-white font-semibold text-sm truncate">{currentTrack.title}</p>
                  <p className="text-white/40 text-xs truncate">{currentTrack.style || 'AI Generated'}</p>
                </div>

                <div className="flex items-center gap-0.5">
                  <button
                    className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                    onClick={() => playPrevious()}
                  >
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg shadow-violet-500/30"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                    onClick={() => togglePlayPause()}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>
                  <button
                    className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors"
                    onClick={() => playNext()}
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden lg:flex items-center gap-5 px-6 py-3 max-w-[1800px] mx-auto">
                {/* Left: art + info */}
                <div className="flex items-center gap-3 w-72 flex-shrink-0">
                  <div
                    className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg flex-shrink-0 cursor-pointer group"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <img
                      src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm truncate">{currentTrack.title}</p>
                    <p className="text-white/40 text-xs truncate">{currentTrack.style || 'AI Generated'}</p>
                  </div>
                  <button
                    onClick={() => setLiked(!liked)}
                    className={cn('flex-shrink-0 transition-all', liked ? 'text-pink-400 scale-110' : 'text-white/30 hover:text-white/60')}
                  >
                    <Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Center: controls + seek */}
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleShuffle}
                      className={cn('w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10', isShuffle ? 'text-violet-400' : 'text-white/40')}
                    >
                      <Shuffle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={playPrevious}
                      className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <button
                      onClick={togglePlayPause}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-xl shadow-violet-500/30 transition-transform hover:scale-105 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)' }}
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                    </button>
                    <button
                      onClick={playNext}
                      className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-all"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                    <button
                      onClick={toggleRepeat}
                      className={cn('w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white/10', repeatMode !== 'off' ? 'text-violet-400' : 'text-white/40')}
                    >
                      {repeatMode === 'one' ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Seek bar */}
                  <div className="w-full flex items-center gap-2">
                    <span className="text-[11px] text-white/35 tabular-nums w-8 text-right">{fmt(currentTime)}</span>
                    <div
                      ref={progressRef}
                      className="flex-1 h-[3px] relative rounded-full overflow-hidden cursor-pointer group/seek"
                      onClick={handleProgressClick}
                      onMouseDown={handleProgressMouseDown}
                    >
                      <div className="absolute inset-0 bg-white/10 rounded-full" />
                      <div
                        className="absolute top-0 left-0 h-full rounded-full transition-none"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #6d28d9, #a855f7, #ec4899)',
                          boxShadow: '0 0 6px rgba(168,85,247,0.6)',
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity"
                        style={{ left: `calc(${pct}% - 6px)` }}
                      />
                    </div>
                    <span className="text-[11px] text-white/35 tabular-nums w-8">{fmt(duration)}</span>
                  </div>
                </div>

                {/* Right: volume + expand */}
                <div className="flex items-center gap-3 w-52 flex-shrink-0 justify-end">
                  <button
                    onClick={() => changeVolume(volume === 0 ? 70 : 0)}
                    className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                  >
                    {volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 50 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 relative h-[3px] rounded-full overflow-hidden group/vol cursor-pointer"
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      changeVolume(Math.round(((e.clientX - r.left) / r.width) * 100));
                    }}
                  >
                    <div className="absolute inset-0 bg-white/10 rounded-full" />
                    <div
                      className="absolute top-0 left-0 h-full rounded-full"
                      style={{
                        width: `${volume}%`,
                        background: 'linear-gradient(90deg, #6d28d9, #ec4899)',
                      }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow opacity-0 group-hover/vol:opacity-100 transition-opacity"
                      style={{ left: `calc(${volume}% - 5px)` }}
                    />
                  </div>
                  <Volume2 className="h-4 w-4 text-white/30 flex-shrink-0" />
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FullscreenPlayer />

      <style>{`
        @keyframes mobileViz {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}