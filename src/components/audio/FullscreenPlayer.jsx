/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  Repeat, Repeat1, Shuffle, Volume2, VolumeX, Volume1,
  Heart, Maximize, Minimize, MicVocal, ListMusic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from './AudioPlayerContext';

// ─── Full-canvas background visualizer ────────────────────────────────────────
function BgVisualizer({ audioRef, isPlaying }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const srcRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.88;
      if (!srcRef.current) {
        srcRef.current = ctx.createMediaElementSource(audio);
      }
      srcRef.current.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    } catch (_) {}
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      const analyser = analyserRef.current;
      const BARS = 80;
      const dataArr = new Uint8Array(BARS);
      if (analyser && isPlaying) {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        for (let i = 0; i < BARS; i++) {
          dataArr[i] = buf[Math.floor((i / BARS) * buf.length * 0.7)];
        }
      } else {
        for (let i = 0; i < BARS; i++) {
          dataArr[i] = Math.sin(Date.now() / 2000 + i * 0.3) * 20 + 22;
        }
      }

      const barW = W / BARS;

      for (let i = 0; i < BARS; i++) {
        const v = dataArr[i] / 255;
        const bH = Math.max(4, v * H * 0.75);
        const x = i * barW;
        const w = barW * 0.6;

        // Glow shadow
        ctx.save();
        ctx.shadowBlur = 24 * v;
        ctx.shadowColor = `rgba(139,92,246,${v * 0.9})`;

        // Gradient bar - bottom centered
        const g = ctx.createLinearGradient(x, H, x, H - bH);
        g.addColorStop(0, `rgba(236,72,153,${v * 0.6})`);
        g.addColorStop(0.5, `rgba(139,92,246,${v * 0.85})`);
        g.addColorStop(1, `rgba(99,102,241,${v * 0.4})`);
        ctx.fillStyle = g;
        ctx.fillRect(x + barW * 0.2, H - bH, w, bH);
        ctx.restore();

        // Mirror top
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.scale(1, -1);
        ctx.translate(0, -H);
        const gm = ctx.createLinearGradient(x, H * 0.5, x, H * 0.5 - bH * 0.4);
        gm.addColorStop(0, `rgba(139,92,246,${v})`);
        gm.addColorStop(1, `rgba(139,92,246,0)`);
        ctx.fillStyle = gm;
        ctx.fillRect(x + barW * 0.2, H - bH * 0.4, w, bH * 0.4);
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.85 }}
    />
  );
}

// ─── Main FullscreenPlayer ─────────────────────────────────────────────────────
export default function FullscreenPlayer() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, repeatMode, isShuffle, queue,
    audioRef, togglePlayPause, playNext, playPrevious, seek, changeVolume,
    toggleRepeat, toggleShuffle, isFullscreen, setIsFullscreen, playTrack,
  } = useAudioPlayer();

  const [activeTab, setActiveTab] = useState('lyrics');
  const [liked, setLiked] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [currentLyricIdx, setCurrentLyricIdx] = useState(0);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const volRef = useRef(null);
  const lyricsRef = useRef(null);
  const isDraggingProgress = useRef(false);
  const isDraggingVol = useRef(false);
  const [dragPct, setDragPct] = useState(null);

  // Keyboard controls
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e) => {
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlayPause(); break;
        case 'ArrowRight': seek(Math.min(duration, currentTime + 10)); break;
        case 'ArrowLeft': seek(Math.max(0, currentTime - 10)); break;
        case 'ArrowUp': e.preventDefault(); changeVolume(Math.min(100, volume + 5)); break;
        case 'ArrowDown': e.preventDefault(); changeVolume(Math.max(0, volume - 5)); break;
        case 'n': playNext(); break;
        case 'p': playPrevious(); break;
        case 'Escape': setIsFullscreen(false); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, isPlaying, currentTime, duration, volume]);

  const toggleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsNativeFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Lyric sync
  const parseLyrics = (lyrics, dur) => {
    if (!lyrics || !dur) return [];
    const lines = lyrics.split('\n').filter(l => l.trim());
    return lines.map((text, i) => ({ time: (dur / lines.length) * i, text: text.trim() }));
  };
  const lyricLines = parseLyrics(currentTrack?.lyrics, duration);

  useEffect(() => {
    if (!lyricLines.length) return;
    const idx = lyricLines.findIndex((l, i) => {
      const next = lyricLines[i + 1];
      return currentTime >= l.time && (!next || currentTime < next.time);
    });
    if (idx !== -1) setCurrentLyricIdx(idx);
  }, [currentTime]);

  useEffect(() => {
    if (activeTab === 'lyrics' && lyricsRef.current) {
      const active = lyricsRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLyricIdx, activeTab]);

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const displayPct = dragPct !== null ? dragPct : (duration > 0 ? (currentTime / duration) * 100 : 0);

  // Seek helpers
  const getProgressRatio = (clientX) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
  };
  const getVolRatio = (clientX) => {
    const rect = volRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
  };

  const onProgressMouseDown = useCallback((e) => {
    if (!duration) return;
    isDraggingProgress.current = true;
    setDragPct(getProgressRatio(e.clientX) * 100);
    const onMove = (me) => setDragPct(getProgressRatio(me.clientX) * 100);
    const onUp = (me) => {
      seek(getProgressRatio(me.clientX) * duration);
      isDraggingProgress.current = false;
      setDragPct(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [duration, seek]);

  const onProgressTouchStart = useCallback((e) => {
    if (!duration) return;
    isDraggingProgress.current = true;
    setDragPct(getProgressRatio(e.touches[0].clientX) * 100);
    const onMove = (te) => setDragPct(getProgressRatio(te.touches[0].clientX) * 100);
    const onEnd = (te) => {
      seek(getProgressRatio(te.changedTouches[0].clientX) * duration);
      isDraggingProgress.current = false;
      setDragPct(null);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  }, [duration, seek]);

  const onVolMouseDown = useCallback((e) => {
    changeVolume(Math.round(getVolRatio(e.clientX) * 100));
    const onMove = (me) => changeVolume(Math.round(getVolRatio(me.clientX) * 100));
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [changeVolume]);

  const onVolTouchStart = useCallback((e) => {
    e.preventDefault();
    changeVolume(Math.round(getVolRatio(e.touches[0].clientX) * 100));
    const onMove = (te) => changeVolume(Math.round(getVolRatio(te.touches[0].clientX) * 100));
    const onEnd = () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [changeVolume]);

  if (!currentTrack) return null;

  const TABS = [
    { id: 'lyrics', icon: MicVocal, label: 'Lyrics' },
    { id: 'queue', icon: ListMusic, label: 'Queue' },
  ];

  return (
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[200] overflow-hidden"
          style={{ background: '#06040f' }}
        >
          {/* ── Layer 1: Album art blur background ── */}
          <div className="absolute inset-0 pointer-events-none">
            {currentTrack.cover_image_url && (
              <img
                src={currentTrack.cover_image_url}
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-[100px] opacity-20"
                alt=""
              />
            )}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 150% 80% at 50% 100%, rgba(124,58,237,0.18) 0%, transparent 65%)' }} />
          </div>

          {/* ── Layer 2: Full-canvas live visualizer ── */}
          <div className="absolute inset-0 pointer-events-none">
            <BgVisualizer audioRef={audioRef} isPlaying={isPlaying} />
          </div>

          {/* ── Layer 3: Glass overlay ── */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(6,4,15,0.92) 0%, rgba(6,4,15,0.55) 40%, rgba(6,4,15,0.25) 100%)' }} />

          {/* ── Layer 4: UI floating over glass ── */}
          <div className="absolute inset-0 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-2 flex-shrink-0">
              <button
                onClick={() => setIsFullscreen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.2em]">Now Playing</p>
              <button
                onClick={toggleNativeFullscreen}
                className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
              >
                {isNativeFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>

            {/* Album Art + Info — top portion */}
            <div className="flex flex-col items-center px-6 pt-4 pb-2 flex-shrink-0">
              <motion.div
                animate={{ scale: isPlaying ? 1 : 0.9 }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                className="relative mb-4"
              >
                <div
                  className="w-52 h-52 sm:w-64 sm:h-64 rounded-3xl overflow-hidden"
                  style={{ boxShadow: '0 24px 80px rgba(124,58,237,0.5), 0 0 0 1px rgba(255,255,255,0.07)' }}
                >
                  <img
                    src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isPlaying && (
                  <div className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
                )}
              </motion.div>

              <div className="flex items-center gap-4 w-full max-w-xs">
                <div className="flex-1 text-center">
                  <h1 className="text-lg font-bold text-white truncate">{currentTrack.title}</h1>
                  <p className="text-sm text-white/40 mt-0.5">{currentTrack.style || 'AI Generated'}</p>
                </div>
                <button onClick={() => setLiked(!liked)} className={cn('transition-all flex-shrink-0', liked ? 'text-pink-400 scale-110' : 'text-white/30 hover:text-white/60')}>
                  <Heart className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* Seek bar */}
            <div className="flex items-center gap-3 px-6 py-2 flex-shrink-0">
              <span className="text-[11px] text-white/40 tabular-nums w-10 text-right">
                {fmt(dragPct !== null ? (dragPct / 100) * duration : currentTime)}
              </span>
              <div
                ref={progressRef}
                className="flex-1 h-1.5 relative rounded-full cursor-pointer select-none touch-none group/bar"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onMouseDown={onProgressMouseDown}
                onTouchStart={onProgressTouchStart}
              >
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-none"
                  style={{
                    width: `${displayPct}%`,
                    background: 'linear-gradient(90deg, #6d28d9, #a855f7, #ec4899)',
                    boxShadow: '0 0 10px rgba(168,85,247,0.8)',
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-xl pointer-events-none"
                  style={{ left: `calc(${displayPct}% - 8px)` }}
                />
              </div>
              <span className="text-[11px] text-white/40 tabular-nums w-10">{fmt(duration)}</span>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-4 px-6 py-2 flex-shrink-0">
              <button onClick={toggleShuffle} className={cn('w-10 h-10 flex items-center justify-center rounded-full transition-all', isShuffle ? 'text-violet-400' : 'text-white/30 hover:text-white/60')}>
                <Shuffle className="h-5 w-5" />
              </button>
              <button onClick={playPrevious} className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-all" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <SkipBack className="h-6 w-6" />
              </button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={togglePlayPause}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)', boxShadow: '0 8px 40px rgba(124,58,237,0.6)' }}
              >
                {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
              </motion.button>
              <button onClick={playNext} className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-all" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <SkipForward className="h-6 w-6" />
              </button>
              <button onClick={toggleRepeat} className={cn('w-10 h-10 flex items-center justify-center rounded-full transition-all', repeatMode !== 'off' ? 'text-violet-400' : 'text-white/30 hover:text-white/60')}>
                {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 px-10 py-1 flex-shrink-0">
              <button onClick={() => changeVolume(volume === 0 ? 70 : 0)} className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 50 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <div
                ref={volRef}
                className="flex-1 h-1 relative rounded-full cursor-pointer select-none touch-none"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onMouseDown={onVolMouseDown}
                onTouchStart={onVolTouchStart}
              >
                <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${volume}%`, background: 'linear-gradient(90deg, #6d28d9, #ec4899)' }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow pointer-events-none" style={{ left: `calc(${volume}% - 6px)` }} />
              </div>
              <Volume2 className="h-4 w-4 text-white/30 flex-shrink-0" />
            </div>

            {/* Tabs panel — glassy bottom sheet */}
            <div className="flex-1 mx-4 mb-4 mt-2 rounded-3xl overflow-hidden flex flex-col min-h-0" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Tab bar */}
              <div className="flex gap-1 p-1.5 flex-shrink-0">
                {TABS.map(({ id, icon: TabIcon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-2xl text-xs font-semibold transition-all', activeTab === id ? 'text-white' : 'text-white/30 hover:text-white/60')}
                    style={activeTab === id ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.5), rgba(236,72,153,0.4))' } : {}}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {activeTab === 'lyrics' && (
                    <motion.div key="lyrics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto px-4 py-3 space-y-2" ref={lyricsRef}>
                      {lyricLines.length > 0 ? lyricLines.map((line, i) => (
                        <p key={i} data-active={i === currentLyricIdx ? 'true' : 'false'}
                          className={cn('text-center transition-all duration-300 leading-relaxed py-0.5', i === currentLyricIdx ? 'text-white text-base font-semibold' : i === currentLyricIdx - 1 || i === currentLyricIdx + 1 ? 'text-white/40 text-sm' : 'text-white/15 text-xs')}
                        >{line.text}</p>
                      )) : (
                        <div className="flex flex-col items-center justify-center h-full text-white/20">
                          <MicVocal className="h-10 w-10 mb-3" />
                          <p className="text-sm">No lyrics available</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                  {activeTab === 'queue' && (
                    <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto space-y-1 p-2">
                      {queue.filter(t => t.status === 'ready').map((track) => (
                        <button key={track.id} onClick={() => playTrack(track, queue)}
                          className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all', track.id === currentTrack.id ? 'bg-white/10' : 'hover:bg-white/[0.04]')}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                            {track.cover_image_url ? <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" /> : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', track.id === currentTrack.id ? 'text-violet-300' : 'text-white')}>{track.title}</p>
                            <p className="text-xs text-white/30 truncate">{track.style || 'AI Generated'}</p>
                          </div>
                        </button>
                      ))}
                      {queue.filter(t => t.status === 'ready').length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-white/20 pt-10">
                          <ListMusic className="h-10 w-10 mb-3" />
                          <p className="text-sm">Queue is empty</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Inject animations once
if (typeof document !== 'undefined' && !document.getElementById('accoustica-fs-anim')) {
  const s = document.createElement('style');
  s.id = 'accoustica-fs-anim';
  s.textContent = `
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(124,58,237,0.5); }
      70%  { box-shadow: 0 0 0 24px rgba(124,58,237,0); }
      100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
    }
    @keyframes mobileViz { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
  `;
  document.head.appendChild(s);
}