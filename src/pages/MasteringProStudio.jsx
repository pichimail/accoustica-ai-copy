import React, { useState, useRef, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';
import {
  Volume2, Play, Pause, Sliders, Zap, Download, Music,
  RefreshCw, Check, ChevronDown, ChevronUp, BarChart3,
  Maximize2, Wand2, ArrowLeftRight, Search, Clock
} from 'lucide-react';

const EQ_BANDS = [
  { freq: '60Hz', label: '60', defaultGain: 0 },
  { freq: '120Hz', label: '120', defaultGain: 0 },
  { freq: '250Hz', label: '250', defaultGain: 0 },
  { freq: '500Hz', label: '500', defaultGain: 0 },
  { freq: '1kHz', label: '1k', defaultGain: 0 },
  { freq: '2kHz', label: '2k', defaultGain: 0 },
  { freq: '4kHz', label: '4k', defaultGain: 0 },
  { freq: '8kHz', label: '8k', defaultGain: 0 },
  { freq: '16kHz', label: '16k', defaultGain: 0 },
];

const MASTERING_PRESETS = [
  { name: 'Streaming', loudness: -14, stereoWidth: 80, bassBoost: 1, highBoost: 1.5, compression: 60 },
  { name: 'Club', loudness: -8, stereoWidth: 90, bassBoost: 3, highBoost: 2, compression: 75 },
  { name: 'Broadcast', loudness: -23, stereoWidth: 70, bassBoost: 0, highBoost: 1, compression: 50 },
  { name: 'Vinyl', loudness: -12, stereoWidth: 65, bassBoost: 2, highBoost: 0.5, compression: 45 },
  { name: 'Cinematic', loudness: -16, stereoWidth: 95, bassBoost: 2, highBoost: 3, compression: 40 },
  { name: 'Podcast', loudness: -16, stereoWidth: 50, bassBoost: -1, highBoost: 2, compression: 70 },
];

function SpectrumVisualizer({ audioUrl, isPlaying, color = '#22c55e', label }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const barsCount = 64;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barW = canvas.width / barsCount;
      for (let i = 0; i < barsCount; i++) {
        const freq = i / barsCount;
        const base = Math.sin(freq * Math.PI * 3) * 0.4 + 0.5;
        const anim = isPlaying ? Math.sin(frame * 0.08 + i * 0.3) * 0.3 + 0.7 : 0.4;
        const h = base * anim * canvas.height * 0.85;
        const gradient = ctx.createLinearGradient(0, canvas.height - h, 0, canvas.height);
        gradient.addColorStop(0, color + 'ff');
        gradient.addColorStop(1, color + '44');
        ctx.fillStyle = gradient;
        const x = i * barW + 1;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - h, barW - 2, h, 2);
        ctx.fill();
      }
      frame++;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, color]);

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{label}</span>}
      <canvas
        ref={canvasRef}
        width={300}
        height={80}
        className="w-full rounded-lg"
        style={{ background: 'rgba(255,255,255,0.02)' }}
        aria-label={`${label} spectrum visualizer`}
        role="img"
      />
    </div>
  );
}

function EQGraph({ bands, onBandChange }) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const height = 120;
  const width = 400;
  const midY = height / 2;

  const getX = (i) => (i / (bands.length - 1)) * width;
  const getY = (gain) => midY - (gain / 12) * (height * 0.45);

  const pathD = bands.map((b, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(b.gain)}`).join(' ');

  const handleMouseDown = (i) => (e) => {
    e.preventDefault();
    setDragging(i);
  };

  const handleMouseMove = useCallback((e) => {
    if (dragging === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const gain = ((midY - y) / (height * 0.45)) * 12;
    onBandChange(dragging, Math.max(-12, Math.min(12, gain)));
  }, [dragging, midY, onBandChange]);

  useEffect(() => {
    if (dragging !== null) {
      const up = () => setDragging(null);
      window.addEventListener('mouseup', up);
      window.addEventListener('mousemove', handleMouseMove);
      return () => { window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', handleMouseMove); };
    }
  }, [dragging, handleMouseMove]);

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full rounded-lg cursor-crosshair"
        style={{ background: 'rgba(255,255,255,0.03)', height: 100 }}
        aria-label="EQ curve editor"
        role="img"
      >
        {/* Grid */}
        {[-12, -6, 0, 6, 12].map(g => (
          <line key={g} x1={0} x2={width} y1={getY(g)} y2={getY(g)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        {/* 0dB line */}
        <line x1={0} x2={width} y1={midY} y2={midY} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4,4" />
        {/* Gradient fill */}
        <defs>
          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${width} ${midY} L 0 ${midY} Z`} fill="url(#eqGrad)" />
        <path d={pathD} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Draggable points */}
        {bands.map((b, i) => (
          <g key={i}>
            <circle
              cx={getX(i)} cy={getY(b.gain)} r={6}
              fill={dragging === i ? '#22c55e' : '#0d0d0d'}
              stroke="#22c55e" strokeWidth={2}
              onMouseDown={handleMouseDown(i)}
              style={{ cursor: 'grab' }}
              role="slider"
              aria-label={`${b.label} EQ gain: ${b.gain.toFixed(1)}dB`}
              aria-valuenow={b.gain}
              aria-valuemin={-12}
              aria-valuemax={12}
            />
            <text x={getX(i)} y={height - 4} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={8}>{b.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function KnobControl({ label, value, min, max, unit = '', color = '#22c55e', onChange }) {
  const angle = ((value - min) / (max - min)) * 270 - 135;
  const ref = useRef(null);
  const startY = useRef(null);
  const startVal = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    startY.current = e.clientY;
    startVal.current = value;
    const handleMove = (ev) => {
      const delta = (startY.current - ev.clientY) / 100;
      const newVal = Math.max(min, Math.min(max, startVal.current + delta * (max - min)));
      onChange(Math.round(newVal * 10) / 10);
    };
    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const r = 22;
  const cx = 30, cy = 30;
  const startAngle = -135 * (Math.PI / 180);
  const endAngle = angle * (Math.PI / 180);
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = angle > 0 ? 1 : 0;

  return (
    <div className="flex flex-col items-center gap-1" role="group" aria-label={label}>
      <svg
        width={60} height={60}
        ref={ref}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'ns-resize' }}
        aria-label={`${label} knob: ${value}${unit}`}
        role="img"
      >
        <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth={3} />
        <path
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={10} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <line
          x1={cx} y1={cy}
          x2={cx + 8 * Math.cos(endAngle)}
          y2={cy + 8 * Math.sin(endAngle)}
          stroke={color} strokeWidth={2} strokeLinecap="round"
        />
      </svg>
      <span className="text-[10px] font-bold text-white">{value}{unit}</span>
      <span className="text-[9px] text-white/35">{label}</span>
    </div>
  );
}

export default function MasteringProStudioPage() {
  const [user, setUser] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [search, setSearch] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMastering, setIsMastering] = useState(false);
  const [masteredUrl, setMasteredUrl] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [showBefore, setShowBefore] = useState(false);
  const queryClient = useQueryClient();

  // Mastering params
  const [loudness, setLoudness] = useState(-14);
  const [stereoWidth, setStereoWidth] = useState(80);
  const [bassBoost, setBassBoost] = useState(0);
  const [highBoost, setHighBoost] = useState(0);
  const [compression, setCompression] = useState(50);
  const [eqBands, setEqBands] = useState(EQ_BANDS.map(b => ({ ...b, gain: b.defaultGain })));

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['mastering-pro-tracks'],
    queryFn: () => base44.entities.Track.filter({ status: 'ready' }, '-created_date', 50),
    enabled: !!user,
  });

  const filteredTracks = tracks.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));

  const applyPreset = (preset) => {
    setLoudness(preset.loudness);
    setStereoWidth(preset.stereoWidth);
    setBassBoost(preset.bassBoost);
    setHighBoost(preset.highBoost);
    setCompression(preset.compression);
    setActivePreset(preset.name);
    haptics.selection();
    toast.success(`Preset "${preset.name}" applied`);
  };

  const handleMaster = async () => {
    if (!selectedTrack) { toast.error('Select a track first'); return; }
    setIsMastering(true);
    haptics.medium();
    try {
      const res = await base44.functions.invoke('masterAudio', {
        trackId: selectedTrack.id,
        audioUrl: selectedTrack.audio_url || selectedTrack.stream_audio_url,
        targetLufs: loudness,
        loudnessTarget: loudness,
        stereoWidth,
        bassBoost,
        highBoost,
        compression,
        eqBands: eqBands.map(b => ({ freq: b.freq, gain: b.gain })),
      });
      if (res.data?.success) {
        setMasteredUrl(res.data.processedUrl || res.data.masteredUrl || selectedTrack.audio_url || selectedTrack.stream_audio_url);
        toast.success('Track mastered successfully!');
        haptics.success();
        // Update track tags
        await base44.entities.Track.update(selectedTrack.id, {
          tags: [selectedTrack.tags, 'mastered'].filter(Boolean).join(','),
        });
        queryClient.invalidateQueries({ queryKey: ['mastering-pro-tracks'] });
      } else throw new Error(res.data?.error || 'Mastering failed');
    } catch (err) {
      toast.error(err.message || 'Mastering failed');
    } finally {
      setIsMastering(false);
    }
  };

  const handleEqBandChange = (i, gain) => {
    setEqBands(prev => prev.map((b, idx) => idx === i ? { ...b, gain } : b));
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#09090f' }} role="main" aria-label="Mastering Pro Studio">
      {/* Header */}
      <header className="sticky top-0 z-30 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 py-3 border-b" style={{ background: 'rgba(9,9,15,0.97)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>
            <Volume2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white">Mastering Pro Studio</h1>
            <p className="text-[10px] text-white/35">AI loudness, EQ, stereo enhancement</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {masteredUrl && (
            <a
              href={masteredUrl}
              download={`${selectedTrack?.title}-mastered.mp3`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
              aria-label="Download mastered track"
            >
              <Download className="h-3 w-3" /> Download Mastered
            </a>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
        {/* LEFT — Track selector */}
        <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(10,10,16,0.9)' }} aria-label="Track selection">
          <div className="p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tracks..."
                className="w-full pl-8 pr-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                aria-label="Search tracks"
              />
            </div>
            <div className="space-y-1 max-h-[30vh] lg:max-h-full overflow-y-auto">
              {filteredTracks.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTrack(t); setMasteredUrl(null); haptics.light(); }}
                  className={cn('w-full flex items-center gap-2 p-2.5 rounded-xl transition-all text-left', selectedTrack?.id === t.id ? 'bg-blue-500/15 border border-blue-500/40' : 'hover:bg-white/5 border border-transparent')}
                  aria-pressed={selectedTrack?.id === t.id}
                  aria-label={`Select ${t.title} for mastering`}
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    {t.cover_image_url
                      ? <img src={t.cover_image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Music className="h-4 w-4 text-white/20" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{t.title}</p>
                    <p className="text-[10px] text-white/30 truncate">{t.tags?.includes('mastered') ? '✓ Mastered' : t.style || 'No style'}</p>
                  </div>
                </button>
              ))}
              {!isLoading && filteredTracks.length === 0 && (
                <p className="text-xs text-white/25 text-center py-6">No ready tracks found</p>
              )}
            </div>
          </div>
        </aside>

        {/* CENTER — Mastering controls */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5" aria-label="Mastering controls">
          {!selectedTrack ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
                <Volume2 className="h-8 w-8 text-blue-400" />
              </div>
              <p className="text-white/30 text-sm">Select a track to master</p>
            </div>
          ) : (
            <>
              {/* Track info */}
              <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  {selectedTrack.cover_image_url
                    ? <img src={selectedTrack.cover_image_url} alt={selectedTrack.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)' }}><Music className="h-6 w-6 text-white/30" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-white truncate">{selectedTrack.title}</h2>
                  <p className="text-xs text-white/40">{selectedTrack.style || 'No style'} • {Math.floor((selectedTrack.duration || 0) / 60)}:{String(Math.floor((selectedTrack.duration || 0) % 60)).padStart(2,'0')}</p>
                </div>
                <button
                  onClick={() => setIsPlaying(p => !p)}
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: isPlaying ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)' }}
                  aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                >
                  {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
                </button>
              </div>

              {/* Before/After Visualizer */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-400" /> Spectrum Comparison
                  </h3>
                  {masteredUrl && (
                    <div className="flex rounded-lg overflow-hidden border border-white/10">
                      <button
                        onClick={() => setShowBefore(true)}
                        className={cn('px-3 py-1 text-xs font-bold transition-colors', showBefore ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70')}
                        aria-pressed={showBefore}
                      >Before</button>
                      <button
                        onClick={() => setShowBefore(false)}
                        className={cn('px-3 py-1 text-xs font-bold transition-colors', !showBefore ? 'text-black' : 'text-white/40 hover:text-white/70')}
                        style={!showBefore ? { background: '#22c55e' } : {}}
                        aria-pressed={!showBefore}
                      >After</button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SpectrumVisualizer audioUrl={selectedTrack.audio_url} isPlaying={isPlaying && (showBefore || !masteredUrl)} color="#3b82f6" label="Original" />
                  <SpectrumVisualizer audioUrl={masteredUrl || selectedTrack.audio_url} isPlaying={isPlaying && (!showBefore || !masteredUrl)} color="#22c55e" label={masteredUrl ? 'Mastered' : 'Preview (adjust below)'} />
                </div>
              </div>

              {/* Presets */}
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-400" /> Mastering Presets
                </h3>
                <div className="flex flex-wrap gap-2">
                  {MASTERING_PRESETS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => applyPreset(p)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs font-bold transition-all', activePreset === p.name ? 'text-black' : 'text-white/60 hover:text-white border border-white/10 hover:border-white/20')}
                      style={activePreset === p.name ? { background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff' } : { background: 'rgba(255,255,255,0.05)' }}
                      aria-pressed={activePreset === p.name}
                    >{p.name}</button>
                  ))}
                </div>
              </div>

              {/* Main Controls */}
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-400" /> Mastering Parameters
                </h3>
                {/* Knob row */}
                <div className="flex justify-around flex-wrap gap-4 mb-6">
                  <KnobControl label="Loudness" value={loudness} min={-24} max={-6} unit="dB" color="#3b82f6" onChange={setLoudness} />
                  <KnobControl label="Stereo Width" value={stereoWidth} min={0} max={150} unit="%" color="#8b5cf6" onChange={setStereoWidth} />
                  <KnobControl label="Bass Boost" value={bassBoost} min={-6} max={6} unit="dB" color="#f97316" onChange={setBassBoost} />
                  <KnobControl label="High Boost" value={highBoost} min={-6} max={6} unit="dB" color="#06b6d4" onChange={setHighBoost} />
                  <KnobControl label="Compression" value={compression} min={0} max={100} unit="%" color="#ec4899" onChange={setCompression} />
                </div>

                {/* Slider rows */}
                <div className="space-y-3">
                  {[
                    { label: 'Loudness (LUFS)', value: loudness, min: -24, max: -6, unit: 'dB', color: '#3b82f6', set: setLoudness },
                    { label: 'Stereo Width', value: stereoWidth, min: 0, max: 150, unit: '%', color: '#8b5cf6', set: setStereoWidth },
                    { label: 'Bass Boost', value: bassBoost, min: -6, max: 6, unit: 'dB', color: '#f97316', set: setBassBoost },
                    { label: 'High Boost', value: highBoost, min: -6, max: 6, unit: 'dB', color: '#06b6d4', set: setHighBoost },
                    { label: 'Compression', value: compression, min: 0, max: 100, unit: '%', color: '#ec4899', set: setCompression },
                  ].map(ctrl => (
                    <div key={ctrl.label} className="flex items-center gap-3">
                      <span className="text-[11px] text-white/40 w-28 flex-shrink-0">{ctrl.label}</span>
                      <input
                        type="range" min={ctrl.min} max={ctrl.max} step={0.1}
                        value={ctrl.value}
                        onChange={e => ctrl.set(+e.target.value)}
                        className="flex-1 h-1.5 rounded-full appearance-none"
                        style={{ accentColor: ctrl.color }}
                        aria-label={ctrl.label}
                        aria-valuenow={ctrl.value}
                        aria-valuemin={ctrl.min}
                        aria-valuemax={ctrl.max}
                      />
                      <span className="text-[11px] font-mono text-white/60 w-16 text-right">{ctrl.value > 0 && ctrl.unit !== '%' ? '+' : ''}{ctrl.value}{ctrl.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* EQ Curve */}
              <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-400" /> EQ Curve
                  <span className="text-[10px] text-white/30 font-normal ml-1">Drag points to adjust</span>
                </h3>
                <EQGraph bands={eqBands} onBandChange={handleEqBandChange} />
                <div className="flex justify-between mt-2">
                  <span className="text-[9px] text-white/25">60Hz</span>
                  <span className="text-[9px] text-white/25">1kHz</span>
                  <span className="text-[9px] text-white/25">16kHz</span>
                </div>
                <button
                  onClick={() => setEqBands(EQ_BANDS.map(b => ({ ...b, gain: 0 })))}
                  className="mt-2 text-[11px] text-white/30 hover:text-white/50 transition-colors"
                  aria-label="Flatten EQ curve"
                >Reset EQ</button>
              </div>

              {/* Master button */}
              <button
                onClick={handleMaster}
                disabled={isMastering}
                className="w-full py-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-3 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', boxShadow: '0 0 30px rgba(59,130,246,0.3)' }}
                aria-label="Apply mastering to track"
              >
                {isMastering ? (
                  <><RefreshCw className="h-5 w-5 animate-spin" /> Mastering… Please wait</>
                ) : (
                  <><Zap className="h-5 w-5" /> Apply AI Mastering</>
                )}
              </button>

              {/* Result */}
              {masteredUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl flex items-center gap-3"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-green-400">Mastering Complete!</p>
                    <p className="text-xs text-white/40 mt-0.5">Use the Before/After toggle above to compare</p>
                  </div>
                  <a href={masteredUrl} download={`${selectedTrack.title}-mastered.mp3`}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-black flex items-center gap-1.5"
                    style={{ background: '#22c55e' }} aria-label="Download mastered audio">
                    <Download className="h-3 w-3" /> Download
                  </a>
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
