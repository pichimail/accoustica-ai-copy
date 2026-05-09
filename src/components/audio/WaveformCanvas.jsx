// @ts-nocheck
import React, { useEffect, useRef, useCallback } from 'react';

/**
 * High-performance canvas waveform visualizer.
 * Shows a static waveform from decoded audio data, with a playhead overlay.
 * Falls back to a simulated waveform if Web Audio API decode fails.
 */
export default function WaveformCanvas({ audioRef, audioSrc, currentTime, duration, onSeek, className = '', accentColor = '#22c55e' }) {
  const canvasRef = useRef(null);
  const waveformDataRef = useRef(null); // Float32Array of normalized amplitudes
  const animFrameRef = useRef(null);
  const decodedSrcRef = useRef(null);

  // Generate a deterministic pseudo-random waveform from a string seed
  const generateFallbackWave = useCallback((src, bars) => {
    const seed = (src || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return Float32Array.from({ length: bars }, (_, i) => {
      const x = Math.sin(seed * 0.001 + i * 0.37) * 0.5 +
        Math.sin(seed * 0.0007 + i * 0.19) * 0.3 +
        Math.sin(i * 0.11) * 0.2;
      return Math.abs(x) * 0.85 + 0.1;
    });
  }, []);

  // Decode audio via Web Audio API to extract waveform
  const decodeAudio = useCallback(async (src) => {
    if (!src || decodedSrcRef.current === src) return;
    decodedSrcRef.current = src;
    const BARS = 200;
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
      // Normalize
      const max = Math.max(...data, 0.001);
      for (let i = 0; i < BARS; i++) data[i] = (data[i] / max) * 0.9 + 0.05;
      waveformDataRef.current = data;
    } catch {
      waveformDataRef.current = generateFallbackWave(src, BARS);
    }
  }, [generateFallbackWave]);

  useEffect(() => {
    if (audioSrc) decodeAudio(audioSrc);
  }, [audioSrc, decodeAudio]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      const data = waveformDataRef.current;
      const pct = (duration > 0 && currentTime >= 0) ? Math.min(currentTime / duration, 1) : 0;

      ctx.clearRect(0, 0, W, H);

      const BARS = data ? data.length : 200;
      const barW = W / BARS - 1;
      const cx = W * pct; // current playhead x

      for (let i = 0; i < BARS; i++) {
        const amp = data ? data[i] : 0.15;
        const x = (i / BARS) * W;
        const barH = Math.max(2, amp * H * 0.88);
        const y = (H - barH) / 2;
        const played = x < cx;

        // Gradient color
        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        if (played) {
          grad.addColorStop(0, accentColor + 'ee');
          grad.addColorStop(1, accentColor + '66');
        } else {
          grad.addColorStop(0, 'rgba(255,255,255,0.22)');
          grad.addColorStop(1, 'rgba(255,255,255,0.07)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(1, barW), barH, 2);
        ctx.fill();
      }

      // Playhead line
      if (pct > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, H);
        ctx.strokeStyle = '#ffffff88';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Playhead dot
        ctx.beginPath();
        ctx.arc(cx, H / 2, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [currentTime, duration, accentColor]);

  // Resize observer
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
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    return () => ro.disconnect();
  }, []);

  const handleClick = (e) => {
    if (!onSeek || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    onSeek(pct * duration);
  };

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ cursor: onSeek ? 'pointer' : 'default', display: 'block' }}
      onClick={handleClick}
      aria-label="Audio waveform visualizer"
    />
  );
}