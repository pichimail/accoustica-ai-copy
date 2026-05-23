// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Volume2, VolumeX,
  Sliders, Upload
} from 'lucide-react';
import { toast } from 'sonner';

const COLORS = [
  { bg: 'rgba(124,58,237,', border: '#7c3aed' },
  { bg: 'rgba(236,72,153,', border: '#ec4899' },
  { bg: 'rgba(16,185,129,', border: '#10b981' },
  { bg: 'rgba(245,158,11,', border: '#f59e0b' },
  { bg: 'rgba(59,130,246,', border: '#3b82f6' },
  { bg: 'rgba(239,68,68,', border: '#ef4444' },
];

function TrackWaveform({ audioBuffer, color, width = 400 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !audioBuffer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / W);
    const amp = H / 2;

    // smoky gradient fill
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, color.bg + '0.1)');
    grad.addColorStop(0.5, color.bg + '0.2)');
    grad.addColorStop(1, color.bg + '0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // thin waveform lines
    for (let i = 0; i < W; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const v = data[i * step + j] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const yMin = ((1 + min) / 2) * H;
      const yMax = ((1 + max) / 2) * H;

      // glow line
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = color.border;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(i, yMin - 1);
      ctx.lineTo(i, yMax + 1);
      ctx.stroke();

      // main thin line
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = color.border;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(i, yMin);
      ctx.lineTo(i, yMax);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [audioBuffer, color]);

  return <canvas ref={canvasRef} width={width} height={60} className="w-full h-full" />;
}

function TrackRow({ track, index, onRemove, onVolumeChange, onPanChange, onMuteToggle, isPlaying }) {
  const color = COLORS[index % COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-stretch gap-0 rounded-xl overflow-hidden border border-white/[0.06] bg-black/20"
    >
      {/* Track controls */}
      <div className="flex-shrink-0 w-48 p-3 flex flex-col gap-2 bg-white/[0.02] border-r border-white/[0.04]">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{track.title}</p>
            <p className="text-[10px] text-white/30 truncate">{track.type || 'Audio'}</p>
          </div>
          <button
            onClick={() => onRemove(track.id)}
            className="flex-shrink-0 text-white/20 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Volume fader */}
        <div className="flex items-center gap-2">
          <button onClick={() => onMuteToggle(track.id)} className="text-white/30 hover:text-white transition-colors">
            {track.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
          <div
            className="flex-1 h-1 relative rounded-full cursor-pointer bg-white/10"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onVolumeChange(track.id, Math.round(((e.clientX - r.left) / r.width) * 100));
            }}
          >
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${track.volume}%`, background: color.border }}
            />
          </div>
          <span className="text-[10px] text-white/30 w-7 text-right tabular-nums">{track.volume}%</span>
        </div>

        {/* Pan */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-white/20 w-3">L</span>
          <div
            className="flex-1 h-1 relative rounded-full cursor-pointer bg-white/10"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onPanChange(track.id, Math.round(((e.clientX - r.left) / r.width) * 200) - 100);
            }}
          >
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/60"
              style={{ left: `calc(${(track.pan + 100) / 2}% - 4px)` }}
            />
            {/* Center line */}
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
          </div>
          <span className="text-[9px] text-white/20 w-3">R</span>
        </div>
      </div>

      {/* Waveform / timeline area */}
      <div
        className="flex-1 relative overflow-hidden cursor-pointer"
        style={{ background: color.bg + '0.05)', minHeight: '60px' }}
      >
        {track.audioBuffer ? (
          <TrackWaveform audioBuffer={track.audioBuffer} color={color} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-8">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="w-px rounded-full opacity-30"
                  style={{
                    background: color.border,
                    height: `${Math.random() * 80 + 20}%`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {/* Mute overlay */}
        {track.muted && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-[10px] text-white/40 uppercase tracking-widest">Muted</span>
          </div>
        )}
        {/* Color accent border */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: color.border }} />
      </div>
    </motion.div>
  );
}

export default function MultiTrackTimeline({ tracks = [], onTracksChange }) {
  const [layers, setLayers] = useState([]);
  const fileRef = useRef(null);

  const addTrackFromLibrary = (track) => {
    if (layers.find(l => l.id === track.id)) {
      toast.error('Track already in timeline');
      return;
    }
    setLayers(prev => {
      const next = [...prev, {
        id: track.id,
        title: track.title,
        type: 'AI Track',
        volume: 80,
        pan: 0,
        muted: false,
        audioBuffer: null,
        src: track.audio_url || track.stream_audio_url,
      }];
      onTracksChange?.(next);
      return next;
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = `upload-${Date.now()}`;
    const src = URL.createObjectURL(file);

    // Decode for waveform
    let audioBuffer = null;
    try {
      const ab = await file.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioBuffer = await ctx.decodeAudioData(ab);
    } catch {}

    setLayers(prev => {
      const next = [...prev, {
        id, title: file.name.replace(/\.[^.]+$/, ''), type: 'Uploaded',
        volume: 80, pan: 0, muted: false, audioBuffer, src,
      }];
      onTracksChange?.(next);
      return next;
    });
    toast.success('Track added to timeline');
  };

  const removeLayer = (id) => {
    setLayers(prev => {
      const next = prev.filter(l => l.id !== id);
      onTracksChange?.(next);
      return next;
    });
  };

  const updateLayer = (id, updates) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const readyTracks = tracks.filter(t => t.status === 'ready');

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider flex-1">Timeline · {layers.length} Layers</span>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white text-xs transition-all hover:border-white/20"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* Add from library */}
      {readyTracks.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {readyTracks.map(track => (
            <button
              key={track.id}
              onClick={() => addTrackFromLibrary(track)}
              disabled={!!layers.find(l => l.id === track.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                layers.find(l => l.id === track.id)
                  ? 'border-violet-500/40 bg-violet-500/10 text-violet-400/50 cursor-not-allowed'
                  : 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white hover:border-white/20'
              )}
            >
              <Plus className="h-3 w-3" />
              {track.title.slice(0, 20)}
            </button>
          ))}
        </div>
      )}

      {/* Layers */}
      <div className="space-y-2">
        <AnimatePresence>
          {layers.map((layer, i) => (
            <TrackRow
              key={layer.id}
              track={layer}
              index={i}
              onRemove={removeLayer}
              onVolumeChange={(id, v) => updateLayer(id, { volume: v })}
              onPanChange={(id, p) => updateLayer(id, { pan: p })}
              onMuteToggle={(id) => updateLayer(id, { muted: !layers.find(l => l.id === id)?.muted })}
            />
          ))}
        </AnimatePresence>

        {layers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-white/10 rounded-xl">
            <Sliders className="h-8 w-8 text-white/15 mb-2" />
            <p className="text-xs text-white/25">Add tracks from your library or upload audio files</p>
          </div>
        )}
      </div>
    </div>
  );
}