import React, { useEffect, useRef, useState } from 'react';
import { getTrackAudioSource, useAudioPlayer } from './AudioPlayerContext';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Volume1, Heart,
  Repeat, Repeat1, Shuffle, List, Maximize2, ChevronDown
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
    playerVisible, setPlayerVisible, setCurrentTime, setDuration, setIsPlaying,
  } = useAudioPlayer();

  const progressBarRef = useRef(null);
  const volumeBarRef = useRef(null);
  const mobileProgressRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [liked, setLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // ── AUDIO ELEMENT: always mounted, src managed imperatively ──────────
  // We render a single persistent <audio> ref, never remount it.
  // AudioPlayerContext.playTrack() sets audio.src directly.

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
    const onError = (e) => {
      console.warn('Audio error:', e.target?.error);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('loadeddata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('canplay', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    audio.volume = volume / 100;

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('loadeddata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('canplay', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, [repeatMode, volume, isDragging, audioRef, setCurrentTime, setDuration, setIsPlaying]);

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
    setIsDragging(true);
    setDragTime(pct0 * duration);

    const move = (me) => {
      if (!ref.current) return;
      setDragTime(getSeekPct(me, ref.current) * duration);
    };
    const up = (me) => {
      if (ref.current) seek(getSeekPct(me, ref.current) * duration);
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
      changeVolume(Math.round(Math.max(0, Math.min((clientX - rect.left) / rect.width, 1)) * 100));
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
      {/* ── PERSISTENT AUDIO ELEMENT — never remounted ── */}
      <audio
        ref={audioRef}
        preload="auto"
        style={{ display: 'none' }}
        onTimeUpdate={(e) => !isDragging && setCurrentTime(e.currentTarget.currentTime || 0)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (!isNaN(d) && isFinite(d)) setDuration(d);
        }}
      />

      <AnimatePresence>
        {currentTrack && playerVisible && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={cn(
              "fixed left-0 right-0 z-50 lg:bottom-0",
              currentPageName === 'Create'
                ? "bottom-0"
                : "bottom-[calc(56px+env(safe-area-inset-bottom,0px))]"
            )}
          >
            {/* ── MOBILE ── */}
            <div className="lg:hidden">
              {/* Seek bar */}
              <div
                ref={mobileProgressRef}
                className="relative w-full h-[3px] cursor-pointer touch-none bg-white/10"
                onMouseDown={(e) => startSeek(e, mobileProgressRef)}
                onTouchStart={(e) => startSeek(e, mobileProgressRef)}
              >
                <div
                  className="absolute top-0 left-0 h-full transition-none"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22c55e, #86efac)' }}
                />
              </div>

              {/* Player bar */}
              <div className="bg-[#111118]/97 backdrop-blur-2xl border-t border-white/[0.06]">
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
                      className="w-11 h-11 rounded-full flex items-center justify-center text-black font-bold shadow-lg neon-green-glow"
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
                    {/* Hide player toggle */}
                    <button
                      className="w-7 h-7 flex items-center justify-center text-white/25 hover:text-white/60"
                      onClick={() => setPlayerVisible(false)}
                      title="Hide player"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── DESKTOP ── */}
            <div className="hidden lg:block bg-[#0d0d14]/98 backdrop-blur-2xl border-t border-white/[0.05]">
              <div className="flex items-center gap-4 px-5 py-2.5 max-w-[1800px] mx-auto">

                {/* Left — album art + track info */}
                <div className="flex items-center gap-3 w-72 flex-shrink-0">
                  <div
                    className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg flex-shrink-0 cursor-pointer"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <img src={coverImg} alt={currentTrack.title} className="w-full h-full object-cover" />
                    {isPlaying && (
                      <div className="absolute inset-0 flex items-end justify-center gap-[2px] bg-black/25 pb-1">
                        {[0.7, 1, 0.5, 0.9].map((h, i) => (
                          <span key={i} className="w-[2px] rounded-full bg-green-400"
                            style={{ height: '45%', transformOrigin: 'bottom', animation: `beat-bar ${0.45 + h * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm truncate">{currentTrack.title}</p>
                    <p className="text-white/55 text-xs truncate">{currentTrack.style || 'AI Generated'}</p>
                  </div>
                  <button
                    onClick={() => setLiked(!liked)}
                    className={cn('flex-shrink-0 transition-all w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10', liked ? 'text-green-400' : 'text-white/35 hover:text-white/65')}
                  >
                    <Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Center — controls + seek */}
                <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <button onClick={toggleShuffle} className={cn('w-8 h-8 flex items-center justify-center rounded-full transition-all', isShuffle ? 'text-green-400' : 'text-white/35 hover:text-white/70')}>
                      <Shuffle className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={playPrevious} className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-all">
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <button
                      onClick={togglePlayPause}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-black shadow-xl transition-transform hover:scale-105 active:scale-95 neon-green-glow"
                      style={{ background: '#22c55e' }}
                    >
                      {isPlaying ? <Pause className="h-5 w-5 fill-black" /> : <Play className="h-5 w-5 fill-black ml-0.5" />}
                    </button>
                    <button onClick={playNext} className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-all">
                      <SkipForward className="h-4 w-4" />
                    </button>
                    <button onClick={toggleRepeat} className={cn('w-8 h-8 flex items-center justify-center rounded-full transition-all', repeatMode !== 'off' ? 'text-green-400' : 'text-white/35 hover:text-white/70')}>
                      {repeatMode === 'one' ? <Repeat1 className="h-3.5 w-3.5" /> : <Repeat className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Seek bar */}
                  <div className="w-full flex items-center gap-2 max-w-lg">
                    <span className="text-[11px] text-white/50 tabular-nums w-9 text-right">{fmt(displayTime)}</span>
                    <div
                      ref={progressBarRef}
                      className="flex-1 h-1.5 relative rounded-full cursor-pointer touch-none group"
                      onMouseDown={(e) => startSeek(e, progressBarRef)}
                      onTouchStart={(e) => startSeek(e, progressBarRef)}
                    >
                      <div className="absolute inset-0 bg-white/10 rounded-full" />
                      <div className="absolute top-0 left-0 h-full rounded-full transition-none" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #22c55e, #86efac)' }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${pct}% - 6px)` }} />
                    </div>
                    <span className="text-[11px] text-white/50 tabular-nums w-9">{fmt(duration)}</span>
                  </div>
                </div>

                {/* Right — volume + extras */}
                <div className="flex items-center gap-2 w-56 flex-shrink-0 justify-end">
                  <button onClick={() => setShowQueue(v => !v)} className={cn('w-8 h-8 flex items-center justify-center rounded-full transition-all', showQueue ? 'text-green-400 bg-green-400/10' : 'text-white/35 hover:text-white/70 hover:bg-white/10')}>
                    <List className="h-4 w-4" />
                  </button>
                  <button onClick={() => changeVolume(volume === 0 ? 70 : 0)} className="text-white/45 hover:text-white transition-colors w-7 h-7 flex items-center justify-center">
                    {volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 50 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <div
                    ref={volumeBarRef}
                    className="w-24 relative h-1.5 rounded-full cursor-pointer touch-none group"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                    onMouseDown={startVolume}
                    onTouchStart={startVolume}
                  >
                    <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${volume}%`, background: 'linear-gradient(90deg, #22c55e, #86efac)' }} />
                    <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${volume}% - 5px)` }} />
                  </div>
                  <button onClick={() => setIsFullscreen(true)} className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  {/* Hide player on desktop */}
                  <button onClick={() => setPlayerVisible(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-white/25 hover:text-white/60 hover:bg-white/10 transition-all" title="Hide player">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SHOW PLAYER BUTTON when hidden ── */}
      <AnimatePresence>
        {currentTrack && !playerVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setPlayerVisible(true)}
            className="fixed bottom-20 right-4 z-50 lg:bottom-4 w-12 h-12 rounded-full flex items-center justify-center shadow-xl"
            style={{ background: '#22c55e', boxShadow: '0 0 20px rgba(34,197,94,0.5)' }}
            title="Show player"
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-black text-black" /> : <Play className="h-5 w-5 fill-black text-black ml-0.5" />}
          </motion.button>
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
