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

function MiniVisualizer({ audioRef, isPlaying, colors }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const analyserRef = useRef(null);
  const srcRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.85;
      if (!srcRef.current) {
        srcRef.current = ctx.createMediaElementSource(audio);
      }
      srcRef.current.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    } catch {}
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      let bars = 48;
      let data = new Uint8Array(bars);
      if (analyser && isPlaying) {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        for (let i = 0; i < bars; i++) {
          data[i] = buf[Math.floor((i / bars) * buf.length)];
        }
      } else {
        for (let i = 0; i < bars; i++) {
          data[i] = Math.random() * 20 + 5;
        }
      }

      const barW = W / bars;
      for (let i = 0; i < bars; i++) {
        const v = isPlaying ? (data[i] / 255) : (Math.sin(Date.now() / 1000 + i * 0.4) * 0.08 + 0.05);
        const h = Math.max(2, v * H * 0.85);
        const x = i * barW + barW * 0.2;
        const w = barW * 0.6;

        const grad = ctx.createLinearGradient(x, H - h, x, H);
        grad.addColorStop(0, colors[0] || 'rgba(124,58,237,');
        grad.addColorStop(1, colors[1] || 'rgba(236,72,153,');

        // thin smoky lines
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = typeof grad.addColorStop === 'function' ? `rgba(168,85,247,0.12)` : 'rgba(168,85,247,0.1)';
        ctx.fillRect(x, H - h * 1.4, w, h * 1.4);

        ctx.globalAlpha = 0.7;
        ctx.fillStyle = `rgba(168,85,247,${v * 0.8})`;
        ctx.fillRect(x, H - h, w, h);

        ctx.globalAlpha = 1;
        const g2 = ctx.createLinearGradient(x, H - h, x, H);
        g2.addColorStop(0, `rgba(139,92,246,${v})`);
        g2.addColorStop(0.5, `rgba(168,85,247,${v * 0.7})`);
        g2.addColorStop(1, `rgba(236,72,153,${v * 0.4})`);
        ctx.fillStyle = g2;
        ctx.fillRect(x, H - h, w * 0.3, h);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, colors]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={120}
      className="w-full h-full"
      style={{ imageRendering: 'pixelated' }}
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
        case 'r': toggleRepeat(); break;
        case 's': toggleShuffle(); break;
        case 'f': toggleNativeFullscreen(); break;
        case 'Escape': setIsFullscreen(false); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, isPlaying, currentTime, duration, volume]);

  // Native fullscreen
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
  const lyricsRef = useRef(null);

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

  const handleSeek = (e) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    seek((x / rect.width) * duration);
  };

  if (!currentTrack) return null;

  const vizColors = ['rgba(124,58,237,', 'rgba(236,72,153,'];

  return (
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[200] overflow-hidden flex flex-col"
          style={{ background: '#06040f' }}
        >
          {/* Ambient art BG */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {currentTrack.cover_image_url && (
              <img
                src={currentTrack.cover_image_url}
                className="absolute inset-0 w-full h-full object-cover scale-125 blur-[80px] opacity-[0.12]"
                alt=""
              />
            )}
            <div className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse 120% 60% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%), radial-gradient(ellipse 80% 40% at 80% 100%, rgba(236,72,153,0.08) 0%, transparent 60%)',
              }}
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
            <button
              onClick={() => setIsFullscreen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
            >
              <ChevronDown className="h-5 w-5" />
            </button>

            <div className="text-center">
              <p className="text-[11px] font-semibold text-white/30 uppercase tracking-[0.2em]">Now Playing</p>
            </div>

            <button
              onClick={toggleNativeFullscreen}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
            >
              {isNativeFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>

          {/* Main area — two column on desktop, single on mobile */}
          <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden px-4 lg:px-8">
            {/* Left: Album Art (lg only) + always visible art (mobile) */}
            <div className="lg:w-[340px] xl:w-[380px] flex-shrink-0 flex flex-col items-center justify-center gap-4 py-4">
              {/* Album Art */}
              <motion.div
                animate={{ scale: isPlaying ? 1 : 0.92 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="relative"
              >
                <div
                  className="w-64 h-64 lg:w-72 lg:h-72 xl:w-80 xl:h-80 rounded-3xl overflow-hidden shadow-2xl"
                  style={{
                    boxShadow: `0 20px 60px rgba(124,58,237,0.35), 0 0 0 1px rgba(255,255,255,0.06)`,
                  }}
                >
                  <img
                    src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Pulse ring when playing */}
                {isPlaying && (
                  <div className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{
                      boxShadow: '0 0 0 0 rgba(124,58,237,0.4)',
                      animation: 'pulse-ring 2s ease-out infinite',
                    }}
                  />
                )}
              </motion.div>

              {/* Track info */}
              <div className="text-center px-4">
                <h1 className="text-xl font-bold text-white truncate max-w-xs">{currentTrack.title}</h1>
                <p className="text-sm text-white/40 mt-0.5">{currentTrack.style || 'AI Generated'}</p>
              </div>

              {/* Like btn */}
              <button
                onClick={() => setLiked(!liked)}
                className={cn('transition-all', liked ? 'text-pink-400 scale-110' : 'text-white/30 hover:text-white/60')}
              >
                <Heart className="h-5 w-5" fill={liked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Right: Tab content */}
            <div className="flex-1 flex flex-col min-h-0 lg:pl-8 lg:border-l border-white/[0.04]">
              {/* Tab bar */}
              <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 mb-4 flex-shrink-0">
                {TABS.map(({ id, icon: TabIcon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                      activeTab === id
                        ? 'text-white'
                        : 'text-white/30 hover:text-white/60'
                    )}
                    style={activeTab === id ? {
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(236,72,153,0.3))',
                    } : {}}
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
                    <motion.div
                      key="viz"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex items-center justify-center p-4"
                    >
                      <div className="w-full h-32 lg:h-48 rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.04]">
                        <MiniVisualizer audioRef={audioRef} isPlaying={isPlaying} colors={vizColors} />
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'lyrics' && (
                    <motion.div
                      key="lyrics"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full overflow-y-auto px-2 py-4 space-y-3"
                      ref={lyricsRef}
                    >
                      {lyricLines.length > 0 ? lyricLines.map((line, i) => (
                        <p
                          key={i}
                          data-active={i === currentLyricIdx ? 'true' : 'false'}
                          className={cn(
                            'text-center transition-all duration-300 leading-relaxed',
                            i === currentLyricIdx
                              ? 'text-white text-lg font-semibold'
                              : i === currentLyricIdx - 1 || i === currentLyricIdx + 1
                              ? 'text-white/40 text-base'
                              : 'text-white/15 text-sm'
                          )}
                        >
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
                    <motion.div
                      key="art"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex items-center justify-center p-4"
                    >
                      <div className="max-w-xs w-full aspect-square rounded-3xl overflow-hidden shadow-2xl"
                        style={{ boxShadow: '0 20px 60px rgba(124,58,237,0.3)' }}>
                        <img
                          src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'}
                          alt={currentTrack.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
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
                      {queue.length > 0 ? queue.filter(t => t.status === 'ready').map((track, i) => (
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
          <div className="relative z-10 flex-shrink-0 px-5 pb-6 pt-3 space-y-4">
            {/* Seek bar */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/30 tabular-nums w-10 text-right">{fmt(currentTime)}</span>
              <div
                ref={progressRef}
                className="flex-1 h-1 relative rounded-full cursor-pointer group/bar"
                onClick={handleSeek}
              >
                <div className="absolute inset-0 bg-white/10 rounded-full" />
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-none"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #6d28d9, #a855f7, #ec4899)',
                    boxShadow: '0 0 8px rgba(168,85,247,0.7)',
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-xl opacity-0 group-hover/bar:opacity-100 transition-opacity"
                  style={{ left: `calc(${pct}% - 8px)` }}
                />
              </div>
              <span className="text-[11px] text-white/30 tabular-nums w-10">{fmt(duration)}</span>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleShuffle}
                className={cn('w-10 h-10 flex items-center justify-center rounded-full transition-all hover:bg-white/10', isShuffle ? 'text-violet-400' : 'text-white/30')}
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                onClick={playPrevious}
                className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <SkipBack className="h-6 w-6" />
              </button>
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={togglePlayPause}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)', boxShadow: '0 8px 32px rgba(124,58,237,0.5)' }}
              >
                {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
              </motion.button>
              <button
                onClick={playNext}
                className="w-12 h-12 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-all"
              >
                <SkipForward className="h-6 w-6" />
              </button>
              <button
                onClick={toggleRepeat}
                className={cn('w-10 h-10 flex items-center justify-center rounded-full transition-all hover:bg-white/10', repeatMode !== 'off' ? 'text-violet-400' : 'text-white/30')}
              >
                {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 max-w-xs mx-auto">
              <button onClick={() => changeVolume(volume === 0 ? 70 : 0)} className="text-white/30 hover:text-white/60 transition-colors">
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 50 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <div
                className="flex-1 h-1 relative rounded-full cursor-pointer group/vol"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  changeVolume(Math.round(((e.clientX - r.left) / r.width) * 100));
                }}
              >
                <div className="absolute inset-0 bg-white/10 rounded-full" />
                <div
                  className="absolute top-0 left-0 h-full rounded-full"
                  style={{ width: `${volume}%`, background: 'linear-gradient(90deg, #6d28d9, #ec4899)' }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover/vol:opacity-100 transition-opacity"
                  style={{ left: `calc(${volume}% - 6px)` }}
                />
              </div>
              <Volume2 className="h-4 w-4 text-white/30" />
            </div>

            {/* Keyboard hint */}
                <p className="text-center text-[10px] text-white/15 tracking-widest">
                  Space · ← → Seek · ↑ ↓ Volume · N Next · P Prev · F Fullscreen · Esc Close
                </p>
              </div>
              </motion.div>
            )}
            </AnimatePresence>
            );
            }

            // pulse-ring injected once
            const styleEl = document.createElement('style');
            styleEl.textContent = `
            @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
            70% { box-shadow: 0 0 0 20px rgba(124,58,237,0); }
            100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
            }
            @keyframes mobileViz {
            from { transform: scaleY(0.3); }
            to { transform: scaleY(1); }
            }
            `;
            if (typeof document !== 'undefined' && !document.getElementById('accoustica-anim')) {
            styleEl.id = 'accoustica-anim';
            document.head.appendChild(styleEl);
            }