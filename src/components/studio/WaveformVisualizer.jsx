import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut, X } from 'lucide-react';

/**
 * Interactive waveform with amplitude peaks, hover scrubbing,
 * and region selection for editing / effect application.
 * Theme: violet/pink smoky thin-line gradients.
 */
export default function WaveformVisualizer({ audioBuffer, onRegionSelect, className }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [hoverX, setHoverX] = useState(null);
  const [region, setRegion] = useState(null); // { start, end } in 0-1
  const [dragging, setDragging] = useState(null); // 'start', 'end', 'body', null
  const dragStart = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const data = audioBuffer.getChannelData(0);
    const visibleSamples = Math.ceil(data.length / zoom);
    const step = Math.max(1, Math.ceil(visibleSamples / W));
    const amp = H / 2;

    // Background subtle gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, 'rgba(124,58,237,0.04)');
    bgGrad.addColorStop(0.5, 'rgba(168,85,247,0.02)');
    bgGrad.addColorStop(1, 'rgba(236,72,153,0.04)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    // Render waveform bars
    for (let i = 0; i < W; i++) {
      const startSample = i * step;
      let min = 1, max = -1, rms = 0;
      for (let j = 0; j < step && startSample + j < data.length; j++) {
        const v = data[startSample + j];
        if (v < min) min = v;
        if (v > max) max = v;
        rms += v * v;
      }
      rms = Math.sqrt(rms / step);
      const yTop = (1 - max) / 2 * H;
      const yBot = (1 - min) / 2 * H;
      const energy = Math.min(1, rms * 3);

      // Smoky outer glow
      ctx.globalAlpha = 0.12;
      const glowGrad = ctx.createLinearGradient(i, yTop - 3, i, yBot + 3);
      glowGrad.addColorStop(0, 'rgba(124,58,237,0.6)');
      glowGrad.addColorStop(0.5, 'rgba(168,85,247,0.4)');
      glowGrad.addColorStop(1, 'rgba(236,72,153,0.6)');
      ctx.strokeStyle = glowGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(i, yTop);
      ctx.lineTo(i, yBot);
      ctx.stroke();

      // Main thin line
      ctx.globalAlpha = 0.5 + energy * 0.5;
      const lineGrad = ctx.createLinearGradient(i, yTop, i, yBot);
      lineGrad.addColorStop(0, `rgba(139,92,246,${energy})`);
      lineGrad.addColorStop(0.5, `rgba(168,85,247,${energy * 0.8})`);
      lineGrad.addColorStop(1, `rgba(236,72,153,${energy * 0.6})`);
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(i, yTop);
      ctx.lineTo(i, yBot);
      ctx.stroke();

      // Peak dot on high energy moments
      if (energy > 0.6) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = 'rgba(168,85,247,0.8)';
        ctx.fillRect(i, yTop - 0.5, 1, 1);
        ctx.fillRect(i, yBot - 0.5, 1, 1);
      }
    }
    ctx.globalAlpha = 1;

    // Hover line
    if (hoverX !== null) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, H);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Region selection
    if (region) {
      const rx = region.start * W;
      const rw = (region.end - region.start) * W;

      ctx.fillStyle = 'rgba(124,58,237,0.12)';
      ctx.fillRect(rx, 0, rw, H);

      // Border lines
      ctx.strokeStyle = 'rgba(124,58,237,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(rx, 0); ctx.lineTo(rx, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rx + rw, 0); ctx.lineTo(rx + rw, H);
      ctx.stroke();

      // Handle dots
      [rx, rx + rw].forEach(x => {
        ctx.fillStyle = 'rgba(168,85,247,1)';
        ctx.beginPath();
        ctx.arc(x, H / 2, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Time labels
      if (audioBuffer) {
        const dur = audioBuffer.duration;
        const startS = (region.start * dur).toFixed(1);
        const endS = (region.end * dur).toFixed(1);
        ctx.fillStyle = 'rgba(168,85,247,0.9)';
        ctx.font = '10px monospace';
        ctx.fillText(`${startS}s`, rx + 4, 14);
        ctx.fillText(`${endS}s`, rx + rw - 28, 14);
      }
    }
  }, [audioBuffer, zoom, hoverX, region]);

  useEffect(() => { draw(); }, [draw]);

  const getXRatio = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const handleMouseMove = (e) => {
    const ratio = getXRatio(e);
    setHoverX(ratio * (canvasRef.current?.width || 1));

    if (dragging === 'start') {
      setRegion(prev => prev ? { ...prev, start: Math.min(ratio, prev.end - 0.02) } : null);
    } else if (dragging === 'end') {
      setRegion(prev => prev ? { ...prev, end: Math.max(ratio, prev.start + 0.02) } : null);
    } else if (dragging === 'body' && dragStart.current !== null) {
      const delta = ratio - dragStart.current;
      dragStart.current = ratio;
      setRegion(prev => {
        if (!prev) return null;
        const size = prev.end - prev.start;
        const ns = Math.max(0, Math.min(1 - size, prev.start + delta));
        return { start: ns, end: ns + size };
      });
    }
  };

  const handleMouseDown = (e) => {
    if (!audioBuffer) return;
    const ratio = getXRatio(e);
    if (region) {
      const W = canvasRef.current?.width || 1;
      const dist = (r) => Math.abs(r - ratio) * W;
      if (dist(region.start) < 10) { setDragging('start'); return; }
      if (dist(region.end) < 10) { setDragging('end'); return; }
      if (ratio > region.start && ratio < region.end) {
        setDragging('body');
        dragStart.current = ratio;
        return;
      }
    }
    setRegion({ start: ratio, end: ratio + 0.001 });
    setDragging('end');
  };

  const handleMouseUp = () => {
    if (region && audioBuffer && onRegionSelect) {
      const dur = audioBuffer.duration;
      onRegionSelect({ startTime: region.start * dur, endTime: region.end * dur, ...region });
    }
    setDragging(null);
    dragStart.current = null;
  };

  const clearRegion = () => { setRegion(null); onRegionSelect?.(null); };

  if (!audioBuffer) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]', className)} style={{ height: 80 }}>
        <p className="text-xs text-white/20">Upload audio to see waveform</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/30 uppercase tracking-widest">Waveform</span>
        <div className="flex items-center gap-1">
          {region && (
            <button onClick={clearRegion} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-white/30 hover:text-red-400 transition-colors">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <button onClick={() => setZoom(z => Math.min(8, z * 1.5))} className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition-colors">
            <ZoomIn className="h-3 w-3" />
          </button>
          <button onClick={() => setZoom(z => Math.max(1, z / 1.5))} className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white transition-colors">
            <ZoomOut className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="relative rounded-xl overflow-hidden border border-white/[0.06]" style={{ cursor: audioBuffer ? 'crosshair' : 'default' }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={80}
          className="w-full"
          style={{ display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setHoverX(null); handleMouseUp(); }}
        />
      </div>
      {region && audioBuffer && (
        <p className="text-[10px] text-violet-400/70">
          Selection: {(region.start * audioBuffer.duration).toFixed(2)}s → {(region.end * audioBuffer.duration).toFixed(2)}s
          ({((region.end - region.start) * audioBuffer.duration).toFixed(2)}s)
        </p>
      )}
    </div>
  );
}