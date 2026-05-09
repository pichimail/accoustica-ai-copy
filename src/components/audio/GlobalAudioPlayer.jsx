import React, { useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from './AudioPlayerContext';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Volume1, Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import FullscreenPlayer from './FullscreenPlayer';
import { resumeAudioContext } from '@/lib/audioContext';

export default function GlobalAudioPlayer({ currentPageName }) {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    repeatMode, isShuffle, audioRef, togglePlayPause, playNext, playPrevious,
    seek, changeVolume, toggleRepeat, toggleShuffle, setIsFullscreen,
    setCurrentTime, setDuration, setIsPlaying,
  } = useAudioPlayer();

  const progressBarRef = useRef(null);
  const volumeBarRef = useRef(null);
  const mobileProgressRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [liked, setLiked] = useState(false);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => { if (!isDragging) setCurrentTime(audio.currentTime || 0); };
    const updateDuration = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) setDuration(audio.duration);
    };
    const handleEnded = () => {
      if (repeatMode === 'one') { audio.currentTime = 0; audio.play(); }
      else playNext();
    };
    const onPlay = () => {
      resumeAudioContext();
      setIsPlaying(true);
      updateDuration();
    };
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('loadeddata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('canplay', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.volume = volume / 100;
    updateDuration();
    updateTime();

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('loadeddata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('canplay', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [currentTrack?.id, currentTrack?.audio_url, currentTrack?.stream_audio_url, repeatMode, volume, isDragging, audioRef, setCurrentTime, setDuration, setIsPlaying]);

  const fmt = (s) => {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const displayTime = isDragging ? dragTime : currentTime;
  const pct = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;

  // Universal seek helper
  const getSeekPct = (e, el) => {
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return x / rect.width;
  };

  const startSeek = (e, ref) => {
    if (!duration || !ref.current) return;
    e.preventDefault();
    const pct0 = getSeekPct(e, ref.current);
    const t0 = pct0 * duration;
    setIsDragging(true);
    setDragTime(t0);

    const move = (me) => {
      if (!ref.current) return;
      const p = getSeekPct(me, ref.current);
      setDragTime(p * duration);
    };
    const up = (me) => {
      if (ref.current) {
        const p = getSeekPct(me, ref.current);
        seek(p * duration);
      }
      setIsDragging(false);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };

  // Volume
  const startVolume = (e) => {
    e.preventDefault();
    const getV = (ev) => {
      if (!volumeBarRef.current) return;
      const rect = volumeBarRef.current.getBoundingClientRect();
      const clientX = ev.touches ? ev.touches[0].clientX : (ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX);
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      changeVolume(Math.round((x / rect.width) * 100));
    };
    getV(e);
    const move = (me) => getV(me);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };

  const coverImg = currentTrack?.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop';

  return (
    <>
      {currentTrack && (
        <audio
          key={currentTrack.id || currentTrack.audio_url || currentTrack.stream_audio_url}
          ref={audioRef}
          src={currentTrack.audio_url || currentTrack.stream_audio_url}
          preload="auto"
          crossOrigin="anonymous"
          onTimeUpdate={(e) => !isDragging && setCurrentTime(e.currentTarget.currentTime || 0)}
          onLoadedMetadata={(e) => {
            const nextDuration = e.currentTarget.duration;
            if (!isNaN(nextDuration) && isFinite(nextDuration)) setDuration(nextDuration);
          }}
        />
      )}

      <AnimatePresence>
        {currentTrack && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={cn(
              "fixed left-0 right-0 z-50 lg:bottom-0",
              currentPageName === 'Create'
                ? "bottom-0"
                : "bottom-[calc(64px+env(safe-area-inset-bottom,0px))]"
            )}
          >
            {/* ── MOBILE ── */}
            <div className="lg:hidden">
              {/* Seek bar - thin colored line above player */}
              <div
                ref={mobileProgressRef}
                className="relative w-full h-[3px] cursor-pointer touch-none bg-white/10"
                onMouseDown={(e) => startSeek(e, mobileProgressRef)}
                onTouchStart={(e) => startSeek(e, mobileProgressRef)}
              >
                <div
                  className="absolute top-0 left-0 h-full transition-none"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #22c55e, #86efac)',
                  }}
                />
              </div>

              {/* Player bar */}
              <div className="bg-[#111118]/95 backdrop-blur-2xl border-t border-white/[0.04]">
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Art */}
                  <button
                    className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-lg"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <img src={coverImg} alt={currentTrack.title} className="w-full h-full object-cover" />
                    {isPlaying && (
                      <div className="absolute inset-0 flex items-end justify-center gap-[2px] bg-black/20 pb-1">
                        {[0.6, 1, 0.4, 0.8, 0.5].map((h, i) => (
                          <span key={i} className="w-[2px] rounded-full bg-green-400"
                            style={{ height: '50%', transformOrigin: 'bottom', animation: `beat-bar ${0.5 + h * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                    )}
                  </button>

                  {/* Info */}
                  <button className="flex-1 min-w-0 text-left" onClick={() => setIsFullscreen(true)}>
                    <p className="text-white font-semibold text-sm truncate leading-tight">{currentTrack.title}</p>
                    <p className="text-white/50 text-xs truncate">{fmt(displayTime)} · {fmt(duration)}</p>
                  </button>

                  {/* Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white"
                      onClick={playPrevious}
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <button
                      className="w-12 h-12 rounded-full flex items-center justify-center text-black font-bold shadow-lg neon-green-glow"
                      style={{ background: '#22c55e' }}
                      onClick={togglePlayPause}
                    >
                      {isPlaying ? <Pause className="h-5 w-5 fill-black" /> : <Play className="h-5 w-5 fill-black ml-0.5" />}
                    </button>
                    <button
                      className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white"
                      onClick={playNext}
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── DESKTOP ── */}
            <div className="hidden lg:block bg-[#0d0d14]/98 backdrop-blur-2xl border-t border-white/[0.05]">
              {/* Top seek bar */}
              <div
                ref={progressBarRef}
                className="absolute top-0 left-0 right-0 h-[3px] cursor-pointer touch-none"
                onMouseDown={(e) => startSeek(e, progressBarRef)}
                onTouchStart={(e) => startSeek(e, progressBarRef)}
              >
                <div className="absolute inset-0 bg-white/10" />
                <div
                  className="absolute top-0 left-0 h-full transition-none"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22c55e, #86efac)' }}
                />
              </div>

              <div className="flex items-center gap-4 px-6 py-3 max-w-[1800px] mx-auto">
                {/* Left — track info */}
                <div className="flex items-center gap-3 w-64 flex-shrink-0">
                  <div
                    className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg flex-shrink-0 cursor-pointer"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <img src={coverImg} alt={currentTrack.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm truncate">{currentTrack.title}</p>
                    <p className="text-white/45 text-xs truncate">{currentTrack.style || 'AI Generated'}</p>
                  </div>
                  <button
                    onClick={() => setLiked(!liked)}
                    className={cn('flex-shrink-0 transition-all', liked ? 'text-green-400' : 'text-white/30 hover:text-white/60')}
                  >
                    <Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Center — controls + inline seek */}
                <div className="flex-1 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <button onClick={playPrevious} className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-all">
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <button
                      onClick={togglePlayPause}
                      className="w-12 h-12 rounded-full flex items-center justify-center text-black shadow-xl transition-transform hover:scale-105 active:scale-95 neon-green-glow"
                      style={{ background: '#22c55e' }}
                    >
                      {isPlaying ? <Pause className="h-5 w-5 fill-black" /> : <Play className="h-5 w-5 fill-black ml-0.5" />}
                    </button>
                    <button onClick={playNext} className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-all">
                      <SkipForward className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Inline desktop seek bar */}
                  <div className="w-full flex items-center gap-2 max-w-md">
                    <span className="text-[11px] text-white/40 tabular-nums w-9 text-right">{fmt(displayTime)}</span>
                    <div
                      ref={progressBarRef}
                      className="flex-1 h-1 relative rounded-full cursor-pointer touch-none group"
                      onMouseDown={(e) => startSeek(e, progressBarRef)}
                      onTouchStart={(e) => startSeek(e, progressBarRef)}
                    >
                      <div className="absolute inset-0 bg-white/10 rounded-full" />
                      <div
                        className="absolute top-0 left-0 h-full rounded-full transition-none"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22c55e, #86efac)' }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                        style={{ left: `calc(${pct}% - 6px)` }}
                      />
                    </div>
                    <span className="text-[11px] text-white/40 tabular-nums w-9">{fmt(duration)}</span>
                  </div>
                </div>

                {/* Right — volume */}
                <div className="flex items-center gap-2 w-48 flex-shrink-0 justify-end">
                  <button
                    onClick={() => changeVolume(volume === 0 ? 70 : 0)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    {volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 50 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <div
                    ref={volumeBarRef}
                    className="flex-1 relative h-1.5 rounded-full cursor-pointer touch-none"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                    onMouseDown={startVolume}
                    onTouchStart={startVolume}
                  >
                    <div
                      className="absolute top-0 left-0 h-full rounded-full"
                      style={{ width: `${volume}%`, background: 'linear-gradient(90deg, #22c55e, #86efac)' }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow"
                      style={{ left: `calc(${volume}% - 6px)` }}
                    />
                  </div>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FullscreenPlayer />

      <style>{`
        @keyframes beat-bar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </>
  );
}
