import React, { useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { getAudioAnalyser } from '@/lib/audioContext';

export const VIZ_COLORS = {
  violet: ['rgba(139,92,246,', 'rgba(236,72,153,', 'rgba(168,85,247,'],
  cyan:   ['rgba(6,182,212,',   'rgba(59,130,246,',  'rgba(99,102,241,'],
  green:  ['rgba(34,197,94,',   'rgba(16,185,129,',  'rgba(20,184,166,'],
  orange: ['rgba(249,115,22,',  'rgba(239,68,68,',   'rgba(245,158,11,'],
  white:  ['rgba(255,255,255,', 'rgba(210,190,255,', 'rgba(180,170,220,'],
};

const FFT_SIZES = { bars: 256, waveform: 1024, mirror: 256, circular: 512 };

export default function AdvancedVisualizer({
  audioRef,
  isPlaying,
  type = 'bars',
  colorKey = 'violet',
  customColors = null,
  sensitivity = 1,
  height = 80,
  className,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Update FFT size when type changes
  useEffect(() => {
    const analyser = getAudioAnalyser(audioRef?.current);
    if (analyser) analyser.fftSize = FFT_SIZES[type] || 256;
  }, [type, audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = customColors || VIZ_COLORS[colorKey] || VIZ_COLORS.violet;
    let running = true;

    const drawFrame = () => {
      if (!running || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) { animRef.current = requestAnimationFrame(drawFrame); return; }
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
      }
      ctx.clearRect(0, 0, w, h);

      const analyser = getAudioAnalyser(audioRef?.current);
      if (!analyser || !isPlaying) {
        drawIdle(ctx, w, h, colors);
        animRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      analyser.fftSize = FFT_SIZES[type] || 256;

      if (type === 'waveform') {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(data);
        drawWaveform(ctx, data, w, h, colors, sensitivity);
      } else if (type === 'circular') {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        drawCircular(ctx, data, w, h, colors, sensitivity);
      } else if (type === 'mirror') {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        drawMirror(ctx, data, w, h, colors, sensitivity);
      } else {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        drawBars(ctx, data, w, h, colors, sensitivity);
      }

      animRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [audioRef, isPlaying, type, colorKey, customColors, sensitivity]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full', className)}
      style={{ height: `${height}px`, display: 'block' }}
    />
  );
}

function drawIdle(ctx, w, h, colors) {
  const bars = 48;
  const bw = w / bars;
  for (let i = 0; i < bars; i++) {
    const bh = h * 0.05 + Math.sin(i * 0.4) * h * 0.02;
    ctx.fillStyle = colors[i % 3] + '0.1)';
    ctx.fillRect(i * bw, h / 2 - bh / 2, bw - 1, bh);
  }
}

function drawBars(ctx, data, w, h, colors, sens) {
  const n = data.length;
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    const bh = Math.max(2, (data[i] / 255) * h * sens);
    const ci = Math.floor((i / n) * 3);
    const g = ctx.createLinearGradient(0, h - bh, 0, h);
    g.addColorStop(0, colors[ci % 3] + '0.95)');
    g.addColorStop(1, colors[(ci + 1) % 3] + '0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(i * bw, h - bh, bw - 1, bh);
  }
}

function drawWaveform(ctx, data, w, h, colors, sens) {
  const n = data.length;
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, colors[0] + '0.8)');
  g.addColorStop(0.5, colors[1] + '1)');
  g.addColorStop(1, colors[2] + '0.8)');

  // Glow pass
  ctx.strokeStyle = colors[1] + '0.15)';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const v = (data[i] / 128 - 1) * sens;
    const y = h / 2 + v * (h / 2 - 4);
    const x = (i / n) * w;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Main line
  ctx.strokeStyle = g;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const v = (data[i] / 128 - 1) * sens;
    const y = h / 2 + v * (h / 2 - 4);
    const x = (i / n) * w;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawMirror(ctx, data, w, h, colors, sens) {
  const n = data.length;
  const bw = w / n;
  const half = h / 2;
  for (let i = 0; i < n; i++) {
    const bh = Math.max(1, (data[i] / 255) * half * sens);
    const ci = Math.floor((i / n) * 3);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, colors[ci % 3] + '0.3)');
    g.addColorStop(0.5, colors[(ci + 1) % 3] + '0.9)');
    g.addColorStop(1, colors[ci % 3] + '0.3)');
    ctx.fillStyle = g;
    ctx.fillRect(i * bw, half - bh, bw - 1, bh * 2);
  }
}

function drawCircular(ctx, data, w, h, colors, sens) {
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.27;
  const n = Math.min(data.length, 160);
  const lw = Math.max(1.5, (Math.PI * 2 * r) / n - 1);

  // Center fill
  const gfill = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gfill.addColorStop(0, colors[0] + '0.2)');
  gfill.addColorStop(1, colors[1] + '0.05)');
  ctx.fillStyle = gfill;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < n; i++) {
    const bh = Math.max(1, (data[i] / 255) * r * sens);
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const ci = Math.floor((i / n) * 3);
    const x1 = cx + Math.cos(angle) * r;
    const y1 = cy + Math.sin(angle) * r;
    const x2 = cx + Math.cos(angle) * (r + bh);
    const y2 = cy + Math.sin(angle) * (r + bh);
    ctx.strokeStyle = colors[ci % 3] + '0.85)';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}