 
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  Repeat, Repeat1, Shuffle, Volume2, VolumeX, Volume1,
  Heart, MicVocal, ListMusic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from './AudioPlayerContext';

// ── BEAT VISUALIZER CANVAS ─────────────────────────────────────────
function BeatVisualizer({ audioRef, isPlaying }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const srcRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Set up Web Audio once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const setup = () => {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || window['webkitAudioContext'];
          if (!AudioContextClass) return;
          audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        const ctx = audioCtxRef.current;
        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.82;
          if (!srcRef.current) {
            srcRef.current = ctx.createMediaElementSource(audio);
          }
          srcRef.current.connect(analyser);
          analyser.connect(ctx.destination);
          analyserRef.current = analyser;
        }
      } catch (e) { /* cross-origin or already connected */ }
    };
    audio.addEventListener('play', setup, { once: false });
    setup();
    return () => audio.removeEventListener('play', setup);
  }, [audioRef]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frameId;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      const bars = 64;
      const data = new Uint8Array(bars);

      if (analyserRef.current) {
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        for (let i = 0; i < bars; i++) {
          data[i] = buf[Math.floor((i / bars) * buf.length)];
        }
      } else {
        // Idle animation
        const t = Date.now() / 1000;
        for (let i = 0; i < bars; i++) {
          data[i] = (Math.sin(t * 2 + i * 0.4) * 0.5 + 0.5) * 40 + 10;
        }
      }

      const barW = W / bars;
      for (let i = 0; i < bars; i++) {
        const v = data[i] / 255;
        const bH = Math.max(3, v * H * 0.7);
        const x = i * barW;
        const w = Math.max(1, barW - 2);

        // Glow
        ctx.globalAlpha = v * 0.3;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(x, H - bH * 1.4, w, bH * 1.4);

        // Main bar
        ctx.globalAlpha = 0.5 + v * 0.5;
        const grad = ctx.createLinearGradient(0, H - bH, 0, H);
        grad.addColorStop(0, `rgba(34,197,94,${v})`);
        grad.addColorStop(0.5, `rgba(192,132,252,${v * 0.8})`);
        grad.addColorStop(1, `rgba(244,114,182,${v * 0.6})`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, H - bH, w, bH);
      }
      ctx.globalAlpha = 1;
      frameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying]);

  return (
    <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
  );
}

// ── MAIN FULLSCREEN PLAYER ─────────────────────────────────────────
export default function FullscreenPlayer() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, repeatMode, isShuffle, queue,
    audioRef, togglePlayPause, playNext, playPrevious, seek, changeVolume,
    toggleRepeat, toggleShuffle, isFullscreen, setIsFullscreen, playTrack,
  } = useAudioPlayer();

  const [activeTab, setActiveTab] = useState('art');
  const [liked, setLiked] = useState(false);
  const [currentLyricIdx, setCurrentLyricIdx] = useState(0);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const lyricsRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const fmt = (s) => {
    if (!s || isNaN(s) || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const displayTime = isDragging ? dragTime : currentTime;
  const pct = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;

  // Keyboard controls
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e) => {
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlayPause(); break;
        case 'ArrowRight': seek(Math.min(duration, currentTime + 10)); break;
        case 'ArrowLeft': seek(Math.max(0, currentTime - 10)); break;
        case 'Escape': setIsFullscreen(false); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, currentTime, duration]);

  // Lyric parsing & sync
  const lyricLines = (() => {
    if (!currentTrack?.lyrics || !duration) return [];
    const lines = currentTrack.lyrics.split('\n').filter(l => l.trim());
    return lines.map((text, i) => ({ time: (duration / lines.length) * i, text: text.trim() }));
  })();

  useEffect(() => {
    if (!lyricLines.length) return;
    const idx = lyricLines.findIndex((l, i) => {
      const next = lyricLines[i + 1];
      return currentTime >= l.time && (!next || currentTime < next.time);
    });
    if (idx !== -1 && idx !== currentLyricIdx) setCurrentLyricIdx(idx);
  }, [currentTime, lyricLines.length]);

  useEffect(() => {
    if (activeTab === 'lyrics' && lyricsRef.current) {
      const el = lyricsRef.current.querySelector('[data-active="true"]');
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLyricIdx, activeTab]);

  // Seek handlers
  const getSeekPct = (e, el) => {
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
  };

  const startSeek = (e) => {
    if (!progressRef.current || !duration) return;
    e.preventDefault();
    const p = getSeekPct(e, progressRef.current);
    setIsDragging(true);
    setDragTime(p * duration);

    const move = (me) => {
      if (!progressRef.current) return;
      setDragTime(getSeekPct(me, progressRef.current) * duration);
    };
    const up = (me) => {
      if (progressRef.current) seek(getSeekPct(me, progressRef.current) * duration);
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
      if (!volumeRef.current) return;
      const rect = volumeRef.current.getBoundingClientRect();
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

  if (!currentTrack) return null;

  const coverImg = currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop';

  const TABS = [
    { id: 'art', label: 'Art' },
    { id: 'lyrics', label: 'Lyrics' },
    { id: 'visualizer', label: 'Visualizer' },
    { id: 'queue', label: 'Queue' },
  ];

  return (
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
          style={{ background: '#08080f' }}
        >
          {/* Blurred album background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={coverImg}
              className="absolute inset-0 w-full h-full object-cover scale-125"
              style={{ filter: 'blur(80px)', opacity: 0.12 }}
              alt=""
            />
            {/* Purple/pink gradient overlay */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(192,132,252,0.2) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(244,114,182,0.15) 0%, transparent 70%)'
            }} />
            <div className="absolute inset-0 bg-[#08080f]/70" />
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
            <button
              onClick={() => setIsFullscreen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">Now Playing</p>
            <button
              onClick={() => setLiked(!liked)}
              className={cn('w-10 h-10 flex items-center justify-center rounded-full transition-all',
                liked ? 'text-pink-400' : 'text-white/40 hover:text-white/70')}
            >
              <Heart className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Album Art — circular, prominent */}
          <div className="relative z-10 flex justify-center px-8 flex-shrink-0 mb-5">
            <motion.div
              animate={{ scale: isPlaying ? 1 : 0.9 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="relative"
            >
              <div
                className="w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden"
                style={{
                  boxShadow: isPlaying
                    ? '0 0 60px rgba(192,132,252,0.5), 0 0 120px rgba(244,114,182,0.25), 0 20px 60px rgba(0,0,0,0.5)'
                    : '0 20px 60px rgba(0,0,0,0.4)',
                  animation: isPlaying ? 'pulse-ring 2.5s ease-out infinite' : 'none',
                }}
              >
                <img src={coverImg} alt={currentTrack.title} className="w-full h-full object-cover" />
              </div>
            </motion.div>
          </div>

          {/* Track Info */}
          <div className="relative z-10 text-center px-8 flex-shrink-0 mb-4">
            <h1 className="text-white text-2xl font-bold tracking-tight">{currentTrack.title}</h1>
            <p className="text-white/50 text-sm mt-1">{currentTrack.style || 'AI Generated'}</p>
          </div>

          {/* Tab Content Area */}
          <div className="relative z-10 flex-1 min-h-0 px-5 mb-2 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'lyrics' && (
                <motion.div
                  key="lyrics"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full overflow-y-auto"
                  ref={lyricsRef}
                  style={{ paddingBottom: '1rem' }}
                >
                  {lyricLines.length > 0 ? (
                    <div className="space-y-4 py-4 text-center">
                      {lyricLines.map((line, i) => (
                        <p
                          key={i}
                          data-active={i === currentLyricIdx ? 'true' : 'false'}
                          className={cn(
                            'transition-all duration-500 leading-relaxed px-4',
                            i === currentLyricIdx
                              ? 'text-white text-xl font-bold'
                              : Math.abs(i - currentLyricIdx) === 1
                              ? 'text-white/50 text-base'
                              : 'text-white/20 text-sm'
                          )}
                        >
                          {line.text}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/20">
                      <MicVocal className="h-10 w-10 mb-3" />
                      <p className="text-sm">No lyrics available</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'art' && (
                <motion.div
                  key="art"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-center justify-center"
                >
                  <div className="w-full aspect-video max-h-full rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 20px 60px rgba(192,132,252,0.2)' }}>
                    <img src={coverImg} alt={currentTrack.title} className="w-full h-full object-cover" />
                  </div>
                </motion.div>
              )}

              {activeTab === 'visualizer' && (
                <motion.div
                  key="visualizer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex items-end rounded-2xl overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <BeatVisualizer audioRef={audioRef} isPlaying={isPlaying} />
                </motion.div>
              )}

              {activeTab === 'queue' && (
                <motion.div
                  key="queue"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto space-y-1 py-2"
                >
                  {queue.filter(t => t.status === 'ready').map((track) => (
                    <button
                      key={track.id}
                      onClick={() => playTrack(track, queue)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                        track.id === currentTrack.id ? 'bg-white/10' : 'hover:bg-white/[0.04]'
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                        {track.cover_image_url
                          ? <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
                          : <ListMusic className="h-4 w-4 text-white/30 m-auto mt-3" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', track.id === currentTrack.id ? 'text-green-400' : 'text-white')}>
                          {track.title}
                        </p>
                        <p className="text-xs text-white/30 truncate">{track.style || 'AI Generated'}</p>
                      </div>
                      {track.id === currentTrack.id && isPlaying && (
                        <div className="flex items-end gap-[2px] h-4 flex-shrink-0">
                          {[1, 0.6, 0.8].map((h, j) => (
                            <span key={j} className="w-[2px] rounded-full bg-green-400"
                              style={{ height: `${h * 100}%`, animation: `beat-bar ${0.5 + j * 0.2}s ease-in-out infinite alternate` }}
                            />
                          ))}
                        </div>
                      )}
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

          {/* Bottom Controls */}
          <div className="relative z-10 flex-shrink-0 px-5 pb-10 pt-2 space-y-5">
            {/* Seek bar — green like reference */}
            <div className="flex items-center gap-3">
              <span className="text-white/40 text-xs tabular-nums w-10 text-right">{fmt(displayTime)}</span>
              <div
                ref={progressRef}
                className="flex-1 relative h-1 rounded-full cursor-pointer touch-none group"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                onMouseDown={startSeek}
                onTouchStart={startSeek}
              >
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-none"
                  style={{ width: `${pct}%`, background: '#22c55e' }}
                />
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-xl transition-opacity"
                  style={{
                    left: `calc(${pct}% - 8px)`,
                    background: '#22c55e',
                    boxShadow: '0 0 12px rgba(34,197,94,0.7)',
                  }}
                />
              </div>
              <span className="text-white/40 text-xs tabular-nums w-10">{fmt(duration)}</span>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={toggleShuffle}
                className={cn('w-10 h-10 flex items-center justify-center rounded-full transition-all',
                  isShuffle ? 'text-green-400' : 'text-white/30 hover:text-white/60')}
              >
                <Shuffle className="h-5 w-5" />
              </button>
              <button
                onClick={playPrevious}
                className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <SkipBack className="h-6 w-6" />
              </button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={togglePlayPause}
                className="w-16 h-16 rounded-full flex items-center justify-center text-black font-bold shadow-2xl neon-green-glow"
                style={{ background: '#22c55e' }}
              >
                {isPlaying ? <Pause className="h-7 w-7 fill-black" /> : <Play className="h-7 w-7 fill-black ml-1" />}
              </motion.button>
              <button
                onClick={playNext}
                className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <SkipForward className="h-6 w-6" />
              </button>
              <button
                onClick={toggleRepeat}
                className={cn('w-10 h-10 flex items-center justify-center rounded-full transition-all',
                  repeatMode !== 'off' ? 'text-green-400' : 'text-white/30 hover:text-white/60')}
              >
                {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 max-w-xs mx-auto">
              <button onClick={() => changeVolume(volume === 0 ? 70 : 0)} className="text-white/30 hover:text-white/60 transition-colors">
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 50 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <div
                ref={volumeRef}
                className="flex-1 h-1 relative rounded-full cursor-pointer touch-none"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                onMouseDown={startVolume}
                onTouchStart={startVolume}
              >
                <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${volume}%`, background: '#22c55e' }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow" style={{ left: `calc(${volume}% - 6px)` }} />
              </div>
              <Volume2 className="h-4 w-4 text-white/30" />
            </div>

            {/* Tab pills */}
            <div className="flex items-center justify-center gap-2">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-white/15 text-white'
                      : 'text-white/30 hover:text-white/60'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('fs-anim')) {
  const s = document.createElement('style');
  s.id = 'fs-anim';
  s.textContent = `
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(192,132,252,0.5), 0 20px 60px rgba(0,0,0,0.5); }
      70%  { box-shadow: 0 0 0 20px rgba(192,132,252,0), 0 20px 60px rgba(0,0,0,0.5); }
      100% { box-shadow: 0 0 0 0 rgba(192,132,252,0), 0 20px 60px rgba(0,0,0,0.5); }
    }
    @keyframes beat-bar {
      from { transform: scaleY(0.3); }
      to   { transform: scaleY(1); }
    }
  `;
  document.head.appendChild(s);
}