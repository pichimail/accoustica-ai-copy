// @ts-nocheck
import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Rewind, FastForward, Maximize2,
  Share2, Download, Mic2, X, Music2,
  Shuffle, Repeat, Repeat1, Volume2, VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from './AudioPlayerContext.jsx';
import { ensureAudioContext, resumeAudioContext, getAudioAnalyser } from '@/lib/audioContext';
import FullscreenPlayer from './FullscreenPlayer';
import { toast } from 'sonner';
import LyricsView from './LyricsView';
import ShareTrackDialog from '@/components/collaboration/ShareTrackDialog';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(s) {
  if (!s || isNaN(s) || !isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Spinning Vinyl Disc  — click to open fullscreen
// ─────────────────────────────────────────────────────────────────────────────
function VinylDisc({ src, isPlaying, onClick }) {
  const discRef = useRef(null);
  const rotRef  = useRef(0);
  const tsRef   = useRef(null);

  useEffect(() => {
    if (!isPlaying) { tsRef.current = null; return; }
    let raf;
    const tick = (ts) => {
      if (tsRef.current !== null) {
        rotRef.current = (rotRef.current + (ts - tsRef.current) * 0.016) % 360;
        if (discRef.current) discRef.current.style.transform = `rotate(${rotRef.current}deg)`;
      }
      tsRef.current = ts;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); tsRef.current = null; };
  }, [isPlaying]);

  return (
    <button
      onClick={onClick}
      aria-label="Open fullscreen player"
      className="flex-shrink-0 relative rounded-full overflow-visible outline-none"
      style={{ width: 'clamp(36px, 7.5vh, 54px)', height: 'clamp(36px, 7.5vh, 54px)' }}
    >
      {isPlaying && (
        <div
          className="absolute -inset-[3px] rounded-full pointer-events-none"
          style={{ boxShadow: '0 0 10px rgba(34,197,94,0.55), 0 0 22px rgba(168,85,247,0.35), 0 0 40px rgba(34,197,94,0.18)' }}
        />
      )}
      <div ref={discRef} className="absolute inset-0 rounded-full overflow-hidden" style={{ willChange: 'transform' }}>
        <img
          src={src || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&h=120&fit=crop'}
          alt="Album art"
          className="absolute inset-0 w-full h-full object-cover rounded-full"
          draggable={false}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle,
              transparent 0%, transparent 27%,
              rgba(0,0,0,0.45) 28%, transparent 29%,
              transparent 37%, rgba(0,0,0,0.30) 38%, transparent 39%,
              transparent 47%, rgba(0,0,0,0.22) 48%, transparent 49%,
              transparent 58%, rgba(0,0,0,0.16) 59%, transparent 60%)`,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '22%', height: '22%',
            background: 'radial-gradient(circle, #1a1a2e 0%, #0a0a14 100%)',
            border: '1.5px solid rgba(255,255,255,0.18)',
            boxShadow: '0 0 6px rgba(0,0,0,0.8)',
          }}
        />
      </div>
      <div className="absolute inset-0 rounded-full pointer-events-none" style={{ border: '1.5px solid rgba(255,255,255,0.10)' }} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Holographic Liquid Waveform Seekbar
// ─────────────────────────────────────────────────────────────────────────────
function HolographicWaveform({
  audioSrc,
  currentTime,
  duration,
  onSeek,
  isPlaying,
  bars = 180,
  minBarWidth = 0.35,
  barGap = 1.7,
  radius = 0.8,
}) {
  const canvasRef   = useRef(null);
  const rafRef      = useRef(null);
  const waveRef     = useRef(null);
  const decodedRef  = useRef(null);
  const isDragRef   = useRef(false);
  const dragTimeRef = useRef(0);
  const phaseRef    = useRef(0);
  const shimmerRef  = useRef(0);

  const buildFallback = useCallback((src, BARS) => {
    const seed = (src || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return Float32Array.from({ length: BARS }, (_, i) => {
      const v = Math.sin(seed * 0.001 + i * 0.37) * 0.5 + Math.sin(seed * 0.0007 + i * 0.19) * 0.3 + Math.sin(i * 0.11) * 0.2;
      return Math.abs(v) * 0.72 + 0.18;
    });
  }, []);

  const decodeAudio = useCallback(async (src) => {
    if (!src || decodedRef.current === src) return;
    decodedRef.current = src;
    const BARS = bars;
    try {
      const AC  = new (window.AudioContext || window.webkitAudioContext)();
      const res = await fetch(src, { mode: 'cors' });
      if (!res.ok) throw new Error('fetch failed');
      const buf     = await res.arrayBuffer();
      const decoded = await AC.decodeAudioData(buf);
      AC.close();
      const raw  = decoded.getChannelData(0);
      const step = Math.floor(raw.length / BARS);
      const data = new Float32Array(BARS);
      for (let i = 0; i < BARS; i++) {
        let s = 0;
        for (let j = 0; j < step; j++) s += Math.abs(raw[i * step + j]);
        data[i] = s / step;
      }
      const mx = Math.max(...data, 0.001);
      for (let i = 0; i < BARS; i++) data[i] = (data[i] / mx) * 0.85 + 0.12;
      waveRef.current = data;
    } catch {
      waveRef.current = buildFallback(src, BARS);
    }
  }, [bars, buildFallback]);

  useEffect(() => { if (audioSrc) decodeAudio(audioSrc); }, [audioSrc, decodeAudio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      if (isPlaying) {
        phaseRef.current  += 0.016;
        shimmerRef.current = (shimmerRef.current + 0.0035) % 1;
      }
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W * dpr, H * dpr);
      ctx.save();
      ctx.scale(dpr, dpr);

      const t     = isDragRef.current ? dragTimeRef.current : currentTime;
      const pct   = duration > 0 ? Math.min(t / duration, 1) : 0;
      const headX = pct * W;
      const data  = waveRef.current;
      const BARS  = data ? data.length : bars;
      const phase = phaseRef.current;

      // Holographic shimmer sweep
      if (pct > 0) {
        const sx = headX * shimmerRef.current;
        const sg = ctx.createLinearGradient(sx - 50, 0, sx + 50, 0);
        sg.addColorStop(0,   'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
        sg.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, headX, H);
      }

      for (let i = 0; i < BARS; i++) {
        const amp    = data ? data[i] : 0.18;
        const ripple = isPlaying ? Math.sin(phase + i * 0.24) * 0.065 : 0;
        const barAmp = Math.max(0.06, Math.min(1, amp + ripple));
        const x      = (i / BARS) * W;
        const barW   = Math.max(minBarWidth, W / BARS - barGap);
        const barH   = Math.max(2, barAmp * H * 0.88);
        const y      = (H - barH) / 2;
        const played = x + barW * 0.5 < headX;

        if (played) {
          const hue       = ((i / BARS) * 270 + phase * 32) % 360;
          const hue2      = (hue + 55) % 360;
          const hue3      = (hue + 110) % 360;
          const shimDist  = Math.abs(x - headX * shimmerRef.current);
          const shimBoost = Math.max(0, 1 - shimDist / 55);
          const L         = 56 + shimBoost * 20;
          const A         = 0.78 + shimBoost * 0.22;

          const grad = ctx.createLinearGradient(0, y, 0, y + barH);
          grad.addColorStop(0,    `hsla(${hue},  100%, ${L + 8}%, ${A})`);
          grad.addColorStop(0.45, `hsla(${hue2}, 100%, ${L}%,     ${A * 0.92})`);
          grad.addColorStop(1,    `hsla(${hue3}, 100%, ${L - 12}%,${A * 0.68})`);
          ctx.fillStyle   = grad;
          ctx.shadowColor = `hsla(${hue}, 100%, 70%, 0.52)`;
          ctx.shadowBlur  = 5 + shimBoost * 5;
        } else {
          ctx.fillStyle  = 'rgba(255,255,255,0.065)';
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, radius);
        ctx.fill();
      }

      if (pct > 0 && pct < 1) {
        const headHue = ((pct * 270) + phase * 32) % 360;
        ctx.shadowColor = `hsla(${headHue}, 100%, 75%, 0.95)`;
        ctx.shadowBlur  = 12;
        ctx.beginPath();
        ctx.arc(headX, H / 2, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [barGap, bars, currentTime, duration, isPlaying, minBarWidth, radius]);

  const getTime = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    const cx = e.touches ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    return Math.max(0, Math.min((cx - rect.left) / rect.width, 1)) * duration;
  };

  const onPointerDown = (e) => {
    if (!onSeek || !duration) return;
    e.preventDefault();
    isDragRef.current   = true;
    dragTimeRef.current = getTime(e);
    const onMove = (ev) => { ev.preventDefault(); dragTimeRef.current = getTime(ev); };
    const onUp   = (ev) => {
      onSeek(getTime(ev));
      isDragRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full block cursor-pointer touch-none"
      style={{ height: '100%' }}
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      aria-label="Seek waveform"
      title="Seek"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Download Modal
// ─────────────────────────────────────────────────────────────────────────────
function DownloadModal({ track, onClose }) {
  const mp3Url = track?.audio_url || track?.stream_audio_url;
  const mp4Url = track?.video_url;
  const slug   = (track?.title || 'track').replace(/[^a-z0-9\s-]/gi, '').trim().replace(/\s+/g, '-').slice(0, 50);

  const download = (url, filename, type) => {
    if (!url) { toast.error(`No ${type} available for this track yet`); return; }
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success(`${type} download started`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-sm mx-4 mb-24 rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(14,14,22,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-white font-bold text-sm">Export / Download</p>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-white/35 text-xs truncate">{track?.title}</p>
        <button
          onClick={() => download(mp3Url, `${slug}.mp3`, 'MP3')}
          disabled={!mp3Url}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#22c55e' }}
        >
          <Music2 className="h-5 w-5 flex-shrink-0" />
          <div className="text-left flex-1">
            <p className="font-semibold text-sm">Download MP3</p>
            <p className="text-[10px] text-white/35 font-normal">Audio · High quality</p>
          </div>
          <Download className="h-4 w-4 flex-shrink-0" />
        </button>
        <button
          onClick={() => download(mp4Url, `${slug}-lyrical.mp4`, 'MP4 Video')}
          disabled={!mp4Url}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed"
          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.28)', color: '#a855f7' }}
        >
          <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 8 6 4-6 4V8z" fill="currentColor"/>
          </svg>
          <div className="text-left flex-1">
            <p className="font-semibold text-sm">Download MP4</p>
            <p className="text-[10px] text-white/35 font-normal">Lyrical video · Visual</p>
          </div>
          <Download className="h-4 w-4 flex-shrink-0" />
        </button>
        {!mp4Url && <p className="text-white/22 text-[10px] text-center">MP4 requires video generation on this track first</p>}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Lyrics Overlay
// ─────────────────────────────────────────────────────────────────────────────
function LyricsOverlay({ track, currentTime, onSeek, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      className="fixed left-0 right-0 z-[98] overflow-hidden"
      style={{
        bottom: `calc(clamp(60px, 8vh, 80px) + clamp(70px, 10.5vh, 104px) + var(--mobile-nav-reserve, 0px) + env(safe-area-inset-bottom, 0px))`,
        maxHeight: '42vh',
        background: 'rgba(8,8,15,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-white/55 text-[10px] font-semibold uppercase tracking-wider">Lyrics</p>
        <button onClick={onClose} className="text-white/35 hover:text-white transition-colors p-1" aria-label="Close lyrics">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(42vh - 36px)' }}>
        <LyricsView track={track} currentTime={currentTime} onSeek={onSeek} />
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Repeat icon helper
// ─────────────────────────────────────────────────────────────────────────────
function RepeatIcon({ mode, className }) {
  if (mode === 'one') return <Repeat1 className={className} />;
  return <Repeat className={className} />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Global Audio Player
// ─────────────────────────────────────────────────────────────────────────────
export default function GlobalAudioPlayer() {
  const navigate = useNavigate();
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    audioRef, setCurrentTime, setDuration, setIsPlaying,
    togglePlayPause, playNext, playPrevious, seek, changeVolume,
    repeatMode, toggleRepeat, isShuffle, toggleShuffle,
    isFullscreen, setIsFullscreen, playerVisible,
  } = useAudioPlayer();

  const [showShare,    setShowShare]    = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showLyrics,   setShowLyrics]   = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioCallbackRef = useCallback((node) => {
    if (!node) return;
    audioRef.current = node;
    node.playbackRate = playbackRate;
    node.addEventListener('timeupdate',     () => setCurrentTime(node.currentTime));
    node.addEventListener('loadedmetadata', () => {
      if (isFinite(node.duration) && !isNaN(node.duration)) setDuration(node.duration);
    });
    node.addEventListener('durationchange', () => {
      if (isFinite(node.duration) && !isNaN(node.duration)) setDuration(node.duration);
    });
    node.addEventListener('play',  () => {
      setIsPlaying(true);
      ensureAudioContext();
      resumeAudioContext();
      getAudioAnalyser(node);
    });
    node.addEventListener('pause', () => setIsPlaying(false));
    node.addEventListener('ended', () => {
      setIsPlaying(false);
      if (repeatMode === 'one') { node.currentTime = 0; node.play().catch(() => {}); }
      else playNext();
    });
  }, []);  

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = playbackRate;
  }, [audioRef, playbackRate]);

  const audioSrc = currentTrack?.__resolvedAudioSource || currentTrack?.stream_audio_url || currentTrack?.audio_url || '';
  const coverImg = currentTrack?.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120&h=120&fit=crop';
  const isMuted  = volume === 0;
  const hasTrack = !!currentTrack;
  const trackTitle = currentTrack?.title || 'Nothing playing';
  const artistName = currentTrack?.created_by ? `Accoustica-${currentTrack.created_by.split('@')[0]}` : 'Select a track to start';

  const openFullscreen = () => {
    if (!hasTrack) return;
    ensureAudioContext();
    resumeAudioContext();
    setIsFullscreen(true);
  };

  const cyclePlaybackRate = () => {
    const audio = audioRef.current;
    const rates = [1, 1.25, 1.5, 2];
    const idx = rates.indexOf(playbackRate);
    const next = rates[(idx + 1) % rates.length];
    setPlaybackRate(next);
    if (audio) audio.playbackRate = next;
  };

  const goToTrackInfo = () => {
    if (!currentTrack?.id) return;
    navigate(`/TrackInfo?id=${currentTrack.id}`);
  };

  const goToArtistInfo = () => {
    if (!currentTrack?.created_by) return;
    navigate(`/ArtistInfo?email=${encodeURIComponent(currentTrack.created_by)}`);
  };

  return (
    <>
      <audio ref={audioCallbackRef} crossOrigin="anonymous" preload="auto" style={{ display: 'none' }} />

      {/* Share */}
      <ShareTrackDialog track={currentTrack} open={showShare} onClose={() => setShowShare(false)} />

      {/* Download */}
      <AnimatePresence>
        {showDownload && <DownloadModal track={currentTrack} onClose={() => setShowDownload(false)} />}
      </AnimatePresence>

      {/* Lyrics */}
      <AnimatePresence>
        {showLyrics && !isFullscreen && (
          <LyricsOverlay track={currentTrack} currentTime={currentTime} onSeek={seek} onClose={() => setShowLyrics(false)} />
        )}
      </AnimatePresence>

      {/* ══ PLAYER BAR — positioned above mobile nav, with z-index below it ════════════════════ */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            key="player-bar"
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '110%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 260 }}
            className="fixed left-0 right-0 z-35 flex flex-col select-none"
            style={{
              bottom: `calc(clamp(60px, 8vh, 80px) + env(safe-area-inset-bottom, 0px))`,
              height: 'clamp(70px, 10.5vh, 104px)',
              background: 'linear-gradient(180deg, rgba(7,7,13,0.94) 0%, rgba(4,4,9,0.98) 100%)',
              backdropFilter: 'blur(36px)',
              WebkitBackdropFilter: 'blur(36px)',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 -4px 32px rgba(0,0,0,0.55), 0 -1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Centered slim waveform */}
            <div className="w-full flex items-center justify-center px-2 pt-1.5 pb-1 flex-shrink-0">
              <div className="w-[min(56vw,760px)] max-w-full h-[14px]">
                <HolographicWaveform
                  audioSrc={audioSrc}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={seek}
                  isPlaying={isPlaying}
                  bars={150}
                  minBarWidth={0.25}
                  barGap={2.35}
                  radius={0.55}
                />
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center flex-1 min-h-0 px-2 sm:px-3 gap-1.5 sm:gap-2 pb-1">

              {/* Vinyl disc → click opens fullscreen */}
              <VinylDisc src={coverImg} isPlaying={isPlaying} onClick={openFullscreen} />

              {/* Track info */}
              <div className="hidden xs:flex flex-col min-w-0 flex-1 sm:flex-none sm:w-40 md:w-52 overflow-hidden">
                <button
                  onClick={goToTrackInfo}
                  disabled={!hasTrack}
                  className="text-left text-white text-[11px] sm:text-xs font-semibold truncate leading-tight hover:text-green-300 transition-colors disabled:text-white/45 disabled:cursor-default"
                >
                  {trackTitle}
                </button>
                <button
                  onClick={goToArtistInfo}
                  disabled={!hasTrack}
                  className="text-left text-white/38 text-[9px] sm:text-[10px] truncate hover:text-white/80 transition-colors disabled:cursor-default"
                >
                  {artistName}
                </button>
                <p className="text-white/28 text-[9px] sm:text-[10px] truncate">
                  {formatTime(currentTime)}<span className="mx-0.5 text-white/20">/</span>{formatTime(duration)}
                </p>
              </div>

              {/* Mobile: time only */}
              <div className="xs:hidden flex-shrink-0">
                <span className="text-white/38 text-[9px] tabular-nums">{formatTime(currentTime)}</span>
              </div>

              {/* Desktop spacer */}
              <div className="hidden sm:flex flex-1" />

              {/* Playback controls */}
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <button
                  onClick={() => seek(Math.max(0, currentTime - 10))}
                  aria-label="Rewind 10 seconds"
                  className="hidden sm:flex w-7 h-7 items-center justify-center rounded-full text-white/30 hover:text-white/75 hover:bg-white/5 transition-all"
                  disabled={!hasTrack}
                ><Rewind className="h-3 w-3" /></button>

                <button
                  onClick={toggleShuffle}
                  aria-label="Shuffle" aria-pressed={isShuffle}
                  disabled={!hasTrack}
                  className={cn(
                    'hidden md:flex w-7 h-7 items-center justify-center rounded-full transition-all disabled:opacity-35',
                    isShuffle ? 'text-green-400 bg-green-400/10' : 'text-white/28 hover:text-white/70 hover:bg-white/5',
                  )}
                ><Shuffle className="h-3 w-3" /></button>

                <button
                  onClick={playPrevious} aria-label="Previous track"
                  disabled={!hasTrack}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-white/45 hover:text-white transition-all hover:bg-white/5 active:scale-90 disabled:opacity-40"
                ><SkipBack className="h-3.5 w-3.5" /></button>

                <button
                  onClick={() => { if (!hasTrack) return; ensureAudioContext(); resumeAudioContext(); togglePlayPause(); }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  disabled={!hasTrack}
                  className="relative flex items-center justify-center rounded-full text-black font-bold flex-shrink-0 transition-all active:scale-90 disabled:opacity-40 disabled:cursor-default"
                  style={{
                    width: 'clamp(32px, 4.5vh, 42px)', height: 'clamp(32px, 4.5vh, 42px)',
                    background: 'linear-gradient(135deg, #22c55e 0%, #a855f7 55%, #ec4899 100%)',
                    boxShadow: isPlaying ? '0 0 14px rgba(34,197,94,0.55), 0 0 28px rgba(168,85,247,0.28)' : '0 2px 10px rgba(0,0,0,0.45)',
                  }}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5 fill-black" /> : <Play className="h-3.5 w-3.5 fill-black ml-[1px]" />}
                </button>

                <button
                  onClick={playNext} aria-label="Next track"
                  disabled={!hasTrack}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-white/45 hover:text-white transition-all hover:bg-white/5 active:scale-90 disabled:opacity-40"
                ><SkipForward className="h-3.5 w-3.5" /></button>

                <button
                  onClick={toggleRepeat} aria-label={`Repeat: ${repeatMode}`}
                  disabled={!hasTrack}
                  className={cn(
                    'hidden md:flex w-7 h-7 items-center justify-center rounded-full transition-all disabled:opacity-35',
                    repeatMode !== 'off' ? 'text-green-400 bg-green-400/10' : 'text-white/28 hover:text-white/70 hover:bg-white/5',
                  )}
                ><RepeatIcon mode={repeatMode} className="h-3 w-3" /></button>

                <button
                  onClick={() => seek(Math.min(duration || currentTime + 10, currentTime + 10))}
                  aria-label="Forward 10 seconds"
                  className="hidden sm:flex w-7 h-7 items-center justify-center rounded-full text-white/30 hover:text-white/75 hover:bg-white/5 transition-all"
                  disabled={!hasTrack}
                ><FastForward className="h-3 w-3" /></button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-0 flex-shrink-0">
                <button
                  onClick={() => hasTrack && setShowLyrics(v => !v)} aria-label="Toggle lyrics" aria-pressed={showLyrics} disabled={!hasTrack}
                  className={cn(
                    'hidden sm:flex w-7 h-7 items-center justify-center rounded-full transition-all disabled:opacity-35',
                    showLyrics ? 'text-purple-400 bg-purple-400/12' : 'text-white/28 hover:text-white/65 hover:bg-white/5',
                  )}
                ><Mic2 className="h-3 w-3" /></button>

                <button
                  onClick={() => setShowShare(v => !v)} aria-label="Share track" disabled={!hasTrack}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-white/28 hover:text-white/65 hover:bg-white/5 transition-all disabled:opacity-35"
                ><Share2 className="h-3 w-3" /></button>

                <button
                  onClick={() => setShowDownload(v => !v)} aria-label="Download track" disabled={!hasTrack}
                  className="hidden sm:flex w-7 h-7 items-center justify-center rounded-full text-white/28 hover:text-white/65 hover:bg-white/5 transition-all disabled:opacity-35"
                ><Download className="h-3 w-3" /></button>

                <button
                  onClick={cyclePlaybackRate}
                  className="hidden lg:flex w-8 h-7 items-center justify-center rounded-full text-[10px] font-semibold text-white/55 hover:text-white hover:bg-white/7 transition-all"
                  aria-label="Change playback speed"
                  disabled={!hasTrack}
                >
                  {playbackRate}x
                </button>

                <button
                  onClick={openFullscreen}
                  className="hidden md:flex w-7 h-7 items-center justify-center rounded-full text-white/30 hover:text-white/75 hover:bg-white/5 transition-all"
                  aria-label="Open fullscreen player"
                  disabled={!hasTrack}
                >
                  <Maximize2 className="h-3 w-3" />
                </button>

                {/* Volume — desktop only */}
                <div className="hidden lg:flex items-center gap-1.5 ml-1">
                  <button
                    onClick={() => changeVolume(isMuted ? 70 : 0)}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                      className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                      disabled={!hasTrack}
                    >
                      {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                    </button>
                  <input
                    type="range" min={0} max={100} value={volume}
                    onChange={e => changeVolume(Number(e.target.value))}
                    aria-label="Volume"
                    className="w-16 cursor-pointer"
                    style={{ height: 3, accentColor: '#22c55e' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen player */}
      <FullscreenPlayer />
    </>
  );
}
