// @ts-nocheck
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Share2, Download, Mic2, X, Music2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from './AudioPlayerContext.jsx';
import { ensureAudioContext, resumeAudioContext, getAudioAnalyser } from '@/lib/audioContext';
import FullscreenPlayer from './FullscreenPlayer';
import { toast } from 'sonner';
import LyricsView from './LyricsView';
import ShareTrackDialog from '@/components/collaboration/ShareTrackDialog';

function formatTime(s) {
  if (!s || isNaN(s) || !isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// ── Liquid Gradient Waveform Seekbar ────────────────────────────────
function LiquidWaveformSeekbar({ audioSrc, currentTime, duration, onSeek, isPlaying }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const waveformDataRef = useRef(null);
  const decodedSrcRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragTimeRef = useRef(0);
  const phaseRef = useRef(0);

  const generateFallbackWave = useCallback((src, bars) => {
    const seed = (src || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return Float32Array.from({ length: bars }, (_, i) => {
      const x = Math.sin(seed * 0.001 + i * 0.37) * 0.5 + Math.sin(seed * 0.0007 + i * 0.19) * 0.3 + Math.sin(i * 0.11) * 0.2;
      return Math.abs(x) * 0.75 + 0.18;
    });
  }, []);

  const decodeAudio = useCallback(async (src) => {
    if (!src || decodedSrcRef.current === src) return;
    decodedSrcRef.current = src;
    const BARS = 180;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const res = await fetch(src, { mode: 'cors' });
      if (!res.ok) throw new Error('fetch failed');
      const buf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      ctx.close();
      const raw = decoded.getChannelData(0);
      const step = Math.floor(raw.length / BARS);
      const data = new Float32Array(BARS);
      for (let i = 0; i < BARS; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += Math.abs(raw[i * step + j]);
        data[i] = sum / step;
      }
      const max = Math.max(...data, 0.001);
      for (let i = 0; i < BARS; i++) data[i] = (data[i] / max) * 0.82 + 0.12;
      waveformDataRef.current = data;
    } catch {
      waveformDataRef.current = generateFallbackWave(src, BARS);
    }
  }, [generateFallbackWave]);

  useEffect(() => { if (audioSrc) decodeAudio(audioSrc); }, [audioSrc, decodeAudio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      if (isPlaying) phaseRef.current += 0.025;
      const W = canvas.offsetWidth; const H = canvas.offsetHeight;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, W * dpr, H * dpr);
      ctx.save(); ctx.scale(dpr, dpr);

      const displayTime = isDraggingRef.current ? dragTimeRef.current : currentTime;
      const pct = duration > 0 ? Math.min(displayTime / duration, 1) : 0;
      const playheadX = pct * W;
      const data = waveformDataRef.current;
      const BARS = data ? data.length : 180;
      const phase = phaseRef.current;

      for (let i = 0; i < BARS; i++) {
        const amp = data ? data[i] : 0.18;
        const ripple = isPlaying ? Math.sin(phase + i * 0.28) * 0.055 : 0;
        const barAmp = Math.max(0.08, Math.min(1, amp + ripple));
        const x = (i / BARS) * W;
        const barW = Math.max(1.2, (W / BARS) - 1.4);
        const barH = Math.max(2, barAmp * H * 0.88);
        const y = (H - barH) / 2;
        const played = x + barW / 2 < playheadX;

        if (played) {
          const t = ((phase * 0.3) + (i / BARS)) % 1;
          const r = Math.round(34 + (192 - 34) * Math.sin(t * Math.PI));
          const g = Math.round(197 - (197 - 82) * Math.sin(t * Math.PI) * 0.7);
          const b = Math.round(94 + (252 - 94) * Math.sin(t * Math.PI));
          const grad = ctx.createLinearGradient(0, y, 0, y + barH);
          grad.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
          grad.addColorStop(0.5, `rgba(${Math.min(255, r + 50)},${Math.max(0, g - 30)},${Math.min(255, b + 40)},0.85)`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0.6)`);
          ctx.fillStyle = grad;
          ctx.shadowColor = `rgba(${r},${g},${b},0.42)`;
          ctx.shadowBlur = 4;
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.shadowBlur = 0;
        }
        ctx.beginPath(); ctx.roundRect(x, y, barW, barH, 1.5); ctx.fill();
      }

      if (pct > 0) {
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(playheadX, H / 2, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 8; ctx.fill();
      }
      ctx.restore();
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animFrameRef.current); ro.disconnect(); };
  }, [currentTime, duration, isPlaying]);

  const getSeekTime = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    const clientX = e.touches ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
    return Math.max(0, Math.min((clientX - rect.left) / rect.width, 1)) * duration;
  };

  const handlePointerDown = (e) => {
    if (!onSeek || !duration) return;
    e.preventDefault();
    isDraggingRef.current = true;
    dragTimeRef.current = getSeekTime(e);
    const onMove = (ev) => { ev.preventDefault(); dragTimeRef.current = getSeekTime(ev); };
    const onUp = (ev) => {
      onSeek(getSeekTime(ev)); isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove, { passive: false }); window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false }); window.addEventListener('touchend', onUp);
  };

  return (
    <canvas ref={canvasRef} className="w-full cursor-pointer touch-none"
      style={{ height: 28, display: 'block' }}
      onMouseDown={handlePointerDown} onTouchStart={handlePointerDown} title="Seek" />
  );
}

// ── Download Modal ─────────────────────────────────────────────────
function DownloadModal({ track, onClose }) {
  const mp3Url = track?.audio_url || track?.stream_audio_url;
  const mp4Url = track?.video_url;

  const downloadFile = (url, filename, type) => {
    if (!url) { toast.error(`No ${type} available for this track yet`); return; }
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success(`${type} download started`);
  };

  const slug = (track?.title || 'track').replace(/[^a-z0-9\s-]/gi, '').trim().replace(/\s+/g, '-').slice(0, 50);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-sm mx-4 mb-24 rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(14,14,22,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-white font-bold text-sm">Export / Download</p>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-white/35 text-xs truncate">{track?.title}</p>
        <button onClick={() => downloadFile(mp3Url, `${slug}.mp3`, 'MP3')} disabled={!mp3Url}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#22c55e' }}>
          <Music2 className="h-5 w-5 flex-shrink-0" />
          <div className="text-left flex-1"><p className="font-semibold text-sm">Download MP3</p><p className="text-[10px] text-white/35 font-normal">Audio · High quality</p></div>
          <Download className="h-4 w-4 flex-shrink-0" />
        </button>
        <button onClick={() => downloadFile(mp4Url, `${slug}-lyrical.mp4`, 'MP4 Video')} disabled={!mp4Url}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed"
          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.28)', color: '#a855f7' }}>
          <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 8 6 4-6 4V8z" fill="currentColor"/>
          </svg>
          <div className="text-left flex-1"><p className="font-semibold text-sm">Download MP4</p><p className="text-[10px] text-white/35 font-normal">Lyrical video · Visual</p></div>
          <Download className="h-4 w-4 flex-shrink-0" />
        </button>
        {!mp4Url && <p className="text-white/22 text-[10px] text-center">MP4 requires video generation on this track first</p>}
      </motion.div>
    </motion.div>
  );
}

// ── Inline Lyrics Overlay ──────────────────────────────────────────
function LyricsOverlay({ track, currentTime, onSeek, onClose }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      className="fixed left-0 right-0 z-[98]"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--mobile-nav-reserve, 0px) + 82px)',
        maxHeight: '42vh',
        background: 'rgba(8,8,15,0.97)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(32px)',
      }}>
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

// ── Main Global Audio Player ───────────────────────────────────────
export default function GlobalAudioPlayer({ currentPageName }) {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    audioRef, setCurrentTime, setDuration, setIsPlaying,
    togglePlayPause, playNext, playPrevious, seek, changeVolume,
    repeatMode, isFullscreen, setIsFullscreen, playerVisible,
  } = useAudioPlayer();

  const [showShare, setShowShare] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  // Callback ref — attaches the <audio> DOM node into audioRef
  const audioCallbackRef = useCallback((node) => {
    if (!node) return;
    audioRef.current = node;

    node.addEventListener('timeupdate', () => { setCurrentTime(node.currentTime); });
    node.addEventListener('loadedmetadata', () => {
      if (!isNaN(node.duration) && isFinite(node.duration)) setDuration(node.duration);
    });
    node.addEventListener('durationchange', () => {
      if (!isNaN(node.duration) && isFinite(node.duration)) setDuration(node.duration);
    });
    node.addEventListener('play', () => {
      setIsPlaying(true); ensureAudioContext(); resumeAudioContext(); getAudioAnalyser(node);
    });
    node.addEventListener('pause', () => setIsPlaying(false));
    node.addEventListener('ended', () => {
      setIsPlaying(false);
      if (repeatMode === 'one') { node.currentTime = 0; node.play().catch(() => {}); }
      else playNext();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentTrack || !playerVisible) {
    return <audio ref={audioCallbackRef} crossOrigin="anonymous" preload="auto" style={{ display: 'none' }} />;
  }

  const audioSrc = currentTrack.__resolvedAudioSource || currentTrack.stream_audio_url || currentTrack.audio_url || '';
  const coverImg = currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&h=80&fit=crop';

  return (
    <>
      <audio ref={audioCallbackRef} crossOrigin="anonymous" preload="auto" style={{ display: 'none' }} />

      {/* Share dialog (uses the full-featured ShareTrackDialog) */}
      <ShareTrackDialog
        track={currentTrack}
        open={showShare}
        onClose={() => setShowShare(false)}
      />

      {/* Download modal */}
      <AnimatePresence>
        {showDownload && <DownloadModal track={currentTrack} onClose={() => setShowDownload(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showLyrics && !isFullscreen && (
          <LyricsOverlay track={currentTrack} currentTime={currentTime} onSeek={seek} onClose={() => setShowLyrics(false)} />
        )}
      </AnimatePresence>

      {/* Mini player bar */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-[100]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--mobile-nav-reserve, 0px))' }}
          >
            {/* Liquid Waveform Seekbar — full width, sits on top */}
            <div style={{ background: 'rgba(10,10,15,0.97)' }}>
              <LiquidWaveformSeekbar
                audioSrc={audioSrc}
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
                isPlaying={isPlaying}
              />
            </div>

            {/* Compact player row */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5"
              style={{
                background: 'rgba(10,10,15,0.97)',
                backdropFilter: 'blur(24px)',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                minHeight: 50,
              }}
            >
              {/* Cover art */}
              <button
                onClick={() => { ensureAudioContext(); resumeAudioContext(); setIsFullscreen(true); }}
                className="flex-shrink-0 relative w-9 h-9 rounded-lg overflow-hidden"
                aria-label="Open fullscreen player"
              >
                <img src={coverImg} alt={currentTrack.title} className="w-full h-full object-cover" />
                {isPlaying && (
                  <div className="absolute inset-0 flex items-end justify-center gap-[2px] pb-0.5 bg-black/20">
                    {[1, 0.6, 0.8].map((h, j) => (
                      <span key={j} className="w-[2px] rounded-full"
                        style={{ height: `${h * 55}%`, background: '#22c55e', animation: `beat-bar ${0.5 + j * 0.2}s ease-in-out infinite alternate` }} />
                    ))}
                  </div>
                )}
              </button>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate leading-snug">{currentTrack.title}</p>
                <p className="text-white/32 text-[10px] truncate leading-snug">{formatTime(currentTime)} · {formatTime(duration)}</p>
              </div>

              {/* Playback controls */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={playPrevious} aria-label="Previous"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white transition-colors">
                  <SkipBack className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { ensureAudioContext(); resumeAudioContext(); togglePlayPause(); }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-black font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #22c55e 0%, #a855f7 100%)' }}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5 fill-black" /> : <Play className="h-3.5 w-3.5 fill-black ml-0.5" />}
                </button>
                <button onClick={playNext} aria-label="Next"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white transition-colors">
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-0 flex-shrink-0">
                <button onClick={() => setShowLyrics(v => !v)} aria-label="Toggle lyrics" aria-pressed={showLyrics}
                  className={cn('w-8 h-8 flex items-center justify-center rounded-full transition-all', showLyrics ? 'text-purple-400' : 'text-white/28 hover:text-white/60')}>
                  <Mic2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setShowDownload(false); setShowShare(v => !v); }} aria-label="Share track"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-white/28 hover:text-white/60 transition-colors">
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { setShowShare(false); setShowDownload(v => !v); }} aria-label="Download track"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-white/28 hover:text-white/60 transition-colors">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { ensureAudioContext(); resumeAudioContext(); setIsFullscreen(true); }} aria-label="Fullscreen"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-white/22 hover:text-white/55 transition-colors">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
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