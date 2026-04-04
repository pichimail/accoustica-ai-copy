/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  Repeat, Repeat1, Shuffle, Volume2, VolumeX, Volume1,
  Heart, Maximize, Minimize, MicVocal, ImageIcon, Activity,
  ListMusic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from './AudioPlayerContext';

const TABS = [
  { id: 'visualizer', icon: Activity, label: 'Visualizer' },
  { id: 'lyrics', icon: MicVocal, label: 'Lyrics' },
  { id: 'art', icon: ImageIcon, label: 'Art' },
  { id: 'queue', icon: ListMusic, label: 'Queue' },
];

// Full-screen canvas visualizer that fills the entire background
function BackgroundVisualizer({ audioRef, isPlaying }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const srcRef = useRef(null);
  const ctxAudioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (!ctxAudioRef.current) {
        ctxAudioRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = ctxAudioRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.88;
      if (!srcRef.current) {
        srcRef.current = ctx.createMediaElementSource(audio);
      }
      srcRef.current.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    } catch { }
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

      const bars = 80;
      let data = new Uint8Array(bars);
      if (analyserRef.current && isPlaying) {
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        for (let i = 0; i < bars; i++) {
          data[i] = buf[Math.floor((i / bars) * buf.length)];
        }
      } else {
        for (let i = 0; i < bars; i++) {
          data[i] = Math.sin(Date.now() / 1200 + i * 0.35) * 15 + 18;
        }
      }

      const barW = W / bars;
      for (let i = 0; i < bars; i++) {
        const v = data[i] / 255;
        const h = Math.max(4, v * H * 0.55);
        const x = i * barW;
        const w = barW - 1;

        // Glow layer
        ctx.globalAlpha = v * 0.18;
        ctx.fillStyle = `rgba(124,58,237,1)`;
        ctx.fillRect(x, H - h * 1.6, w, h * 1.6);

        // Main bar — bottom half
        ctx.globalAlpha = 0.55 + v * 0.35;
        const grad = ctx.createLinearGradient(x, H - h, x, H);
        grad.addColorStop(0, `rgba(168,85,247,${v * 0.9})`);
        grad.addColorStop(0.5, `rgba(124,58,237,${v * 0.7})`);
        grad.addColorStop(1, `rgba(236,72,153,${v * 0.5})`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, H - h, w, h);

        // Top half mirror (softer)
        ctx.globalAlpha = 0.18 + v * 0.15;
        const gradTop = ctx.createLinearGradient(x, H / 2, x, H / 2 - h * 0.7);
        gradTop.addColorStop(0, `rgba(168,85,247,${v * 0.4})`);
        gradTop.addColorStop(1, `rgba(168,85,247,0)`);
        ctx.fillStyle = gradTop;
        ctx.fillRect(x, H / 2 - h * 0.7, w, h * 0.7);
      }

      ctx.globalAlpha = 1;
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
      style={{ opacity: 0.7 }}
    />
  );
}

export default function FullscreenPlayer() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, repeatMode, isShuffle, queue,
    audioRef, togglePlayPause, playNext, playPrevious, seek, changeVolume,
    toggleRepeat, toggleShuffle, isFullscreen, setIsFullscreen, playTrack,
  } = useAudioPlayer();

  const [activeTab, setActiveTab] = useState('visualizer');
  const [liked, setLiked] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [currentLyricIdx, setCurrentLyricIdx] = useState(0);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const lyricsRef = useRef(null);

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
      setIsNativeFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsNativeFullscreen(false);
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

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Seek
  const getSeekTime = (e) => {
    if (!progressRef.current || !duration) return 0;
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  };

  const handleSeekStart = (e) => {
    e.preventDefault();
    seek(getSeekTime(e));
    const move = (me) => seek(getSeekTime(me));
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

  // Volume
  const handleVolumeStart = (e) => {
    e.preventDefault();
    const getVol = (ev) => {
      if (!volumeRef.current) return;
      const rect = volumeRef.current.getBoundingClientRect();
      const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      changeVolume(Math.round((x / rect.width) * 100));
    };
    getVol(e);
    const move = (me) => getVol(me);
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

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[200] overflow-hidden flex flex-col"
          style={{ background: '#06040f' }}
        >
          {/* ── FULL-SCREEN VISUALIZER BACKGROUND ── */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Blurred album art */}
            {currentTrack.cover_image_url && (
              <img
                src={currentTrack.cover_image_url}
                className="absolute inset-0 w-full h-full object-cover scale-125 opacity-[0.07]"
                style={{ filter: 'blur(60px)' }}
                alt=""
              />
            )}
            {/* Live visualizer canvas */}
            <BackgroundVisualizer audioRef={audioRef} isPlaying={isPlaying} />
            {/* OLED frost overlay */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(6,4,15,0.5) 0%, rgba(6,4,15,0.85) 100%)',
            }} />
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
            <button onClick={() => setIsFullscreen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/[0.08]">
              <ChevronDown className="h-5 w-5" />
            </button>
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.2em]">Now Playing</p>
            <button onClick={toggleNativeFullscreen}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 backdrop-blur-md hover:bg-white/10 text-white/70 hover:text-white transition-all border border-white/[0.08]">
              {isNativeFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>

          {/* Main layout */}
          <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden px-4 lg:px-8">
            {/* Left — Album Art */}
            <div className="lg:w-[340px] xl:w-[380px] flex-shrink-0 flex flex-col items-center justify-center gap-4 py-4">
              <motion.div
                animate={{ scale: isPlaying ? 1 : 0.91 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="relative"
              >
                <div className="w-60 h-60 lg:w-72 lg:h-72 xl:w-80 xl:h-80 rounded-3xl overflow-hidden shadow-2xl"
                  style={{ boxShadow: '0 20px 60px rgba(124,58,237,0.4), 0 0 0 1px rgba(255,255,255,0.06)' }}>
                  <img
                    src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isPlaying && (
                  <div className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{ animation: 'pulse-ring-fs 2s ease-out infinite' }}
                  />
                )}
              </motion.div>

              <div className="text-center px-4">
                <h1 className="text-xl font-bold text-white truncate max-w-xs">{currentTrack.title}</h1>
                <p className="text-sm text-white/40 mt-0.5">{currentTrack.style || 'AI Generated'}</p>
              </div>

              <button onClick={() => setLiked(!liked)}
                className={cn('transition-all', liked ? 'text-pink-400 scale-110' : 'text-white/30 hover:text-white/60')}>
                <Heart className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Right — Tab content */}
            <div className="flex-1 flex flex-col min-h-0 lg:pl-8 lg:border-l border-white/[0.06]">
              {/* Tab bar */}
              <div className="flex items-center gap-1 bg-white/[0.04] backdrop-blur-md rounded-xl p-1 mb-4 flex-shrink-0 border border-white/[0.06]">
                {TABS.map(({ id, icon: TabIcon, label }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                      activeTab === id ? 'text-white' : 'text-white/30 hover:text-white/60')}
                    style={activeTab === id ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.5), rgba(236,72,153,0.3))' } : {}}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-hidden rounded-2xl">
                <AnimatePresence mode="wait">
                  {activeTab === 'visualizer' && (
                    <motion.div key="viz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-full flex items-center justify-center">
                      <div className="w-full h-full rounded-2xl overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <p className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                          Visualizer active in background
                        </p>
                        {/* Smaller inline viz preview */}
                        <BackgroundVisualizer audioRef={audioRef} isPlaying={isPlaying} />
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'lyrics' && (
                    <motion.div key="lyrics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-full overflow-y-auto px-2 py-4 space-y-3" ref={lyricsRef}>
                      {lyricLines.length > 0 ? lyricLines.map((line, i) => (
                        <p key={i} data-active={i === currentLyricIdx ? 'true' : 'false'}
                          className={cn('text-center transition-all duration-300 leading-relaxed',
                            i === currentLyricIdx ? 'text-white text-lg font-semibold'
                              : i === currentLyricIdx - 1 || i === currentLyricIdx + 1 ? 'text-white/40 text-base'
                              : 'text-white/15 text-sm')}>
                          {line.text}
                        </p>
                      )) : (
                        <div className="flex flex-col items-center justify-center h-full text-white/20">
                          <MicVocal className="h-10 w-10 mb-3" />
                          <p className="text-sm">No lyrics available</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'art' && (
                    <motion.div key="art" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-full flex items-center justify-center p-4">
                      <div className="max-w-xs w-full aspect-square rounded-3xl overflow-hidden shadow-2xl"
                        style={{ boxShadow: '0 20px 60px rgba(124,58,237,0.3)' }}>
                        <img src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'}
                          alt={currentTrack.title} className="w-full h-full object-cover" />
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'queue' && (
                    <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-full overflow-y-auto space-y-1 py-2">
                      {queue.length > 0 ? queue.filter(t => t.status === 'ready').map((track) => (
                        <button key={track.id} onClick={() => playTrack(track, queue)}
                          className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                            track.id === currentTrack.id ? 'bg-white/10' : 'hover:bg-white/[0.04]')}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                            {track.cover_image_url
                              ? <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><Activity className="h-4 w-4 text-white/30" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', track.id === currentTrack.id ? 'text-violet-300' : 'text-white')}>{track.title}</p>
                            <p className="text-xs text-white/30 truncate">{track.style || 'AI Generated'}</p>
                          </div>
                          {track.id === currentTrack.id && isPlaying && (
                            <div className="flex items-end gap-[2px] h-4">
                              {[1, 0.6, 0.8].map((h, j) => (
                                <span key={j} className="w-[2px] rounded-full bg-violet-400"
                                  style={{ height: `${h * 100}%`, animation: `mobileViz ${0.5 + j * 0.2}s ease-in-out infinite alternate` }} />
                              ))}
                            </div>
                          )}
                        </button>
                      )) : (
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

          {/* Bottom controls */}
          <div className="relative z-10 flex-shrink-0 px-5 pb-8 pt-3 space-y-4">
            {/* Seek bar */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/30 tabular-nums w-10 text-right">{fmt(currentTime)}</span>
              <div ref={progressRef}
                className="flex-1 h-1.5 relative rounded-full cursor-pointer touch-none"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
              >
                <div className="absolute top-0 left-0 h-full rounded-full transition-none"
                  style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6d28d9, #a855f7, #ec4899)', boxShadow: '0 0 8px rgba(168,85,247,0.7)' }}
                />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-xl"
                  style={{ left: `calc(${pct}% - 8px)` }}
                />
              </div>
              <span className="text-[11px] text-white/30 tabular-nums w-10">{fmt(duration)}</span>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-3">
              <button onClick={toggleShuffle} className={cn('w-10 h-10 flex items-center justify-center rounded-full transition-all hover:bg-white/10', isShuffle ? 'text-violet-400' : 'text-white/30')}>
                <Shuffle className="h-4 w-4" />
              </button>
              <button onClick={playPrevious} className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all">
                <SkipBack className="h-6 w-6" />
              </button>
              <motion.button whileTap={{ scale: 0.93 }} onClick={togglePlayPause}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)', boxShadow: '0 8px 32px rgba(124,58,237,0.5)' }}>
                {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
              </motion.button>
              <button onClick={playNext} className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all">
                <SkipForward className="h-6 w-6" />
              </button>
              <button onClick={toggleRepeat} className={cn('w-10 h-10 flex items-center justify-center rounded-full transition-all hover:bg-white/10', repeatMode !== 'off' ? 'text-violet-400' : 'text-white/30')}>
                {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 max-w-xs mx-auto">
              <button onClick={() => changeVolume(volume === 0 ? 70 : 0)} className="text-white/30 hover:text-white/60 transition-colors">
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 50 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <div ref={volumeRef}
                className="flex-1 h-1.5 relative rounded-full cursor-pointer touch-none"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onMouseDown={handleVolumeStart}
                onTouchStart={handleVolumeStart}
              >
                <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${volume}%`, background: 'linear-gradient(90deg, #6d28d9, #ec4899)' }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow" style={{ left: `calc(${volume}% - 6px)` }} />
              </div>
              <Volume2 className="h-4 w-4 text-white/30" />
            </div>

            <p className="text-center text-[10px] text-white/15 tracking-widest hidden lg:block">
              Space · ← → Seek · ↑ ↓ Volume · N Next · P Prev · Esc Close
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('accoustica-anim')) {
  const s = document.createElement('style');
  s.id = 'accoustica-anim';
  s.textContent = `
    @keyframes pulse-ring-fs {
      0%   { box-shadow: 0 0 0 0   rgba(124,58,237,0.45); }
      70%  { box-shadow: 0 0 0 24px rgba(124,58,237,0); }
      100% { box-shadow: 0 0 0 0   rgba(124,58,237,0); }
    }
    @keyframes mobileViz {
      from { transform: scaleY(0.3); }
      to   { transform: scaleY(1); }
    }
  `;
  document.head.appendChild(s);
}