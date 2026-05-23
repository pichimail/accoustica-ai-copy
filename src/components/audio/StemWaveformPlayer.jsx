// @ts-nocheck
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function generateFallbackBars(count) {
  const bars = [];
  for (let i = 0; i < count; i++) {
    const x = i / count;
    const h = 0.15 + 0.7 * Math.abs(Math.sin(x * Math.PI * 7 + i * 1.3) * Math.cos(x * Math.PI * 3));
    bars.push(Math.max(0.08, h));
  }
  return bars;
}

export default function StemWaveformPlayer({ audioUrl, label = 'Audio', color = '#22c55e', isGenerating = false }) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const animFrameRef = useRef(null);
  const [bars, setBars] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Decode audio waveform
  useEffect(() => {
    if (!audioUrl) { setBars(generateFallbackBars(120)); return; }
    let cancelled = false;
    (async () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const res = await fetch(audioUrl);
        const buf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(buf);
        if (cancelled) return;
        const raw = decoded.getChannelData(0);
        const count = 120;
        const step = Math.floor(raw.length / count);
        const result = [];
        for (let i = 0; i < count; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += Math.abs(raw[i * step + j] || 0);
          result.push(sum / step);
        }
        const max = Math.max(...result, 0.001);
        setBars(result.map(v => Math.max(0.06, v / max)));
        ctx.close();
      } catch {
        if (!cancelled) setBars(generateFallbackBars(120));
      }
    })();
    return () => { cancelled = true; };
  }, [audioUrl]);

  // Draw waveform
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || bars.length === 0) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const progress = duration > 0 ? currentTime / duration : 0;
    const barW = W / bars.length;

    bars.forEach((amp, i) => {
      const barH = amp * H * 0.85;
      const x = i * barW;
      const y = (H - barH) / 2;
      const played = i / bars.length <= progress;

      ctx.fillStyle = played ? color : 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 1, y, barW - 2, barH);
    });

    // Playhead
    if (duration > 0) {
      const px = progress * W;
      ctx.fillStyle = '#fff';
      ctx.fillRect(px - 1, 0, 2, H);
    }

    // Generating shimmer overlay
    if (isGenerating) {
      const shimmerX = (Date.now() % 2000) / 2000 * W;
      const grad = ctx.createLinearGradient(shimmerX - 60, 0, shimmerX + 60, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  }, [bars, currentTime, duration, color, isGenerating]);

  useEffect(() => {
    const loop = () => { draw(); animFrameRef.current = requestAnimationFrame(loop); };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !isLoaded) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className="rounded-xl p-3 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={e => { setDuration(e.target.duration); setIsLoaded(true); }}
          onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
        {isGenerating && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse" style={{ background: 'rgba(250,204,21,0.15)', color: '#fbbf24' }}>
            Generating…
          </span>
        )}
      </div>

      {/* Waveform canvas */}
      <div className="relative w-full cursor-pointer" style={{ height: 56 }} onClick={handleCanvasClick}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'crisp-edges' }}
        />
        {!audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[10px] text-white/20">No audio yet</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={togglePlay}
          disabled={!audioUrl || !isLoaded}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-all disabled:opacity-30"
          style={{ background: isPlaying ? color : 'rgba(255,255,255,0.08)' }}>
          {isPlaying
            ? <Pause className="h-3 w-3 text-black" />
            : <Play className="h-3 w-3 text-white ml-0.5" />}
        </button>

        <span className="text-[10px] tabular-nums text-white/40 w-20 flex-shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Scrubber bar */}
        <div className="flex-1 relative h-1 rounded-full cursor-pointer" style={{ background: 'rgba(255,255,255,0.1)' }}
          onClick={e => {
            const audio = audioRef.current;
            if (!audio || !isLoaded) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            audio.currentTime = ratio * duration;
          }}>
          <div className="absolute left-0 top-0 h-full rounded-full transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: color }} />
        </div>

        <button onClick={toggleMute} className="flex-shrink-0 p-0.5 hover:bg-white/5 rounded transition-colors">
          {isMuted ? <VolumeX className="h-3.5 w-3.5 text-white/30" /> : <Volume2 className="h-3.5 w-3.5 text-white/30" />}
        </button>
      </div>
    </div>
  );
}