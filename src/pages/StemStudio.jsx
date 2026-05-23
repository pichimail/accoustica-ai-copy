// @ts-nocheck
import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import StemWaveformPlayer from '@/components/audio/StemWaveformPlayer';
import EnhancedMasteringDialog from '@/components/mastering/EnhancedMasteringDialog';
import SubtleSplitter from '@/components/ui/SubtleSplitter';
import {
  Upload, Mic, Music, Disc, Wand2, Play, Pause, Download,
  RefreshCw, Layers, GitBranch, Search, Volume2, VolumeX, Check,
  Clock, Sparkles, Scissors, BarChart3, Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// ─── Constants ────────────────────────────────────────────────────────────────
const STEM_COLORS = {
  vocal:          { bg: '#ec4899', label: 'Vocals',         icon: Mic },
  instrumental:   { bg: '#06b6d4', label: 'Instrumental',   icon: Music },
  drums:          { bg: '#ef4444', label: 'Drums',          icon: Disc },
  bass:           { bg: '#8b5cf6', label: 'Bass',           icon: Layers },
  guitar:         { bg: '#f97316', label: 'Guitar',         icon: Music },
  keyboard:       { bg: '#22c55e', label: 'Keys',           icon: Music },
  backing_vocals: { bg: '#f59e0b', label: 'Backing Vocals', icon: Mic },
};

const STYLE_PRESETS = [
  'Lo-fi Hip-hop', 'Trap', 'Indie Pop', 'Dark Ambient', 'Latin Fusion',
  'Progressive Rock', 'Jazz Fusion', 'Cinematic', 'EDM', 'Country Folk',
  'R&B Soul', 'Reggaeton', 'Synthwave', 'Afrobeats',
];

// ─── StemCard (inline mixer row) ──────────────────────────────────────────────
function StemCard({ stemKey, url, volume, muted, soloed, onVolume, onMute, onSolo, onRestyle, isRestying }) {
  const cfg = STEM_COLORS[stemKey] || { bg: '#6b7280', label: stemKey, icon: Music };
  const Icon = cfg.icon;
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (!url || !audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else           { audioRef.current.play();  setIsPlaying(true);  }
  };

  return (
    <div
      className={cn('rounded-xl p-3.5 transition-all', muted && 'opacity-40')}
      style={{ background: cfg.bg + '14', border: `1px solid ${cfg.bg}30` }}
    >
      {url && <audio ref={audioRef} src={url} onEnded={() => setIsPlaying(false)} />}

      {/* Header row */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.bg + '28' }}>
          <Icon className="h-3.5 w-3.5" style={{ color: cfg.bg }} />
        </div>
        <span className="text-xs font-bold text-white flex-1">{cfg.label}</span>

        {url ? (
          <button onClick={togglePlay}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all"
            style={{ background: isPlaying ? cfg.bg + '55' : 'rgba(255,255,255,0.08)' }}
            aria-label={isPlaying ? `Pause ${cfg.label}` : `Play ${cfg.label}`}>
            {isPlaying
              ? <Pause className="h-2.5 w-2.5 text-white" />
              : <Play  className="h-2.5 w-2.5 text-white ml-0.5" />}
          </button>
        ) : (
          <span className="text-[9px] text-white/20">No data</span>
        )}

        <button onClick={() => onMute(stemKey)}
          className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-pressed={muted}>
          {muted
            ? <VolumeX className="h-3 w-3 text-white/30" />
            : <Volume2 className="h-3 w-3 text-white/50" />}
        </button>

        <button
          onClick={() => onSolo(stemKey)}
          className={cn(
            'w-6 h-6 rounded-full text-[9px] font-black flex items-center justify-center transition-all',
            soloed ? 'text-black' : 'text-white/35 hover:bg-white/10',
          )}
          style={soloed ? { background: cfg.bg } : {}}
          aria-pressed={soloed}
        >S</button>
      </div>

      {/* Volume slider */}
      <input type="range" min={0} max={100} value={volume}
        onChange={e => onVolume(stemKey, +e.target.value)}
        className="w-full h-1 rounded-full appearance-none mb-2.5"
        style={{ accentColor: cfg.bg }}
        aria-label={`${cfg.label} volume`} />

      {/* Restyle button */}
      {url && (
        <button onClick={() => onRestyle(stemKey)} disabled={isRestying}
          className="w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
          style={{ background: cfg.bg + '22', color: cfg.bg, border: `1px solid ${cfg.bg}33` }}
          aria-label={`AI restyle ${cfg.label}`}>
          {isRestying
            ? <><RefreshCw className="h-3 w-3 animate-spin" /> Restyling…</>
            : <><Wand2 className="h-3 w-3" /> AI Restyle</>}
        </button>
      )}
    </div>
  );
}

// ─── StemLibraryCard ───────────────────────────────────────────────────────────
function StemLibraryCard({ separation, track, onOpenMixer }) {
  const stems = Object.entries(STEM_COLORS).filter(([k]) => separation[`${k}_url`]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden group transition-all hover:border-cyan-500/40"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Cover */}
      <div className="relative h-28 overflow-hidden">
        <img
          src={track?.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'}
          alt={track?.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(9,9,15,0.95) 0%, rgba(9,9,15,0.4) 60%, transparent 100%)' }} />
        <div className="absolute bottom-2 left-3 right-3">
          <p className="text-xs font-bold text-white truncate">{track?.title || 'Unknown Track'}</p>
          <p className="text-[10px] text-white/40">{stems.length} stems isolated</p>
        </div>
        <Badge className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 border-0"
          style={{ background: 'rgba(34,197,94,0.25)', color: '#4ade80' }}>
          <Check className="h-2.5 w-2.5 mr-0.5" /> Ready
        </Badge>
      </div>

      {/* Stem badges */}
      <div className="px-3 py-2 flex flex-wrap gap-1">
        {stems.map(([key, cfg]) => (
          <span key={key} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: cfg.bg + '22', color: cfg.bg, border: `1px solid ${cfg.bg}33` }}>
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Waveform preview */}
      {(separation.vocal_url || separation.instrumental_url) && (
        <div className="px-3 pb-2">
          <StemWaveformPlayer
            audioUrl={separation.vocal_url || separation.instrumental_url}
            label={separation.vocal_url ? 'Vocals' : 'Instrumental'}
            color="#22d3ee"
          />
        </div>
      )}

      {/* Actions */}
      <div className="px-3 pb-3 flex gap-2">
        <button onClick={() => onOpenMixer(separation)}
          className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', color: '#fff' }}>
          <Volume2 className="h-3.5 w-3.5" /> Open Mixer
        </button>
        <a
          href={separation.vocal_url || separation.instrumental_url || '#'}
          download={`${track?.title || 'stem'}-stems.mp3`}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 flex-shrink-0"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          aria-label="Download stem">
          <Download className="h-3.5 w-3.5 text-white/50" />
        </a>
      </div>
    </motion.div>
  );
}

// ─── Stat Chip ─────────────────────────────────────────────────────────────────
function StatChip({ icon: Icon, value, label, color, pulse = false }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
      style={{ background: color + '12', border: `1px solid ${color}22` }}>
      <Icon className={cn('h-3 w-3', pulse && 'animate-pulse')} style={{ color }} />
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px] text-white/30">{label}</span>
    </div>
  );
}

// ─── Tab Button ────────────────────────────────────────────────────────────────
function TabButton({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
        active ? 'text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5',
      )}
      style={active
        ? { background: 'linear-gradient(135deg,rgba(6,182,212,0.15),rgba(139,92,246,0.15))', border: '1px solid rgba(6,182,212,0.25)' }
        : {}}
      aria-pressed={active}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
          style={{
            background: active ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.1)',
            color: active ? '#22d3ee' : 'rgba(255,255,255,0.4)',
          }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Icon className="h-7 w-7 text-white/20" />
      </div>
      <div className="text-center max-w-xs">
        <p className="text-white/50 font-semibold mb-1">{title}</p>
        <p className="text-white/25 text-sm">{description}</p>
      </div>
      {action && (
        <a href={action.href}
          className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)' }}>
          {action.label}
        </a>
      )}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export default function StemStudioPage() {
  const queryClient = useQueryClient();
  const { playTrack } = useAudioPlayer();
  const fileRef = useRef(null);
  const pageRef = useRef(null);

  // ── UI state ──
  const [activeTab, setActiveTab]     = useState('library'); // 'library' | 'remix'
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [libraryTopRatio, setLibraryTopRatio] = useState(0.45);

  // ── Selection ──
  const [selectedTrack, setSelectedTrack]           = useState(null);
  const [selectedSeparation, setSelectedSeparation] = useState(null);

  // ── Separation ──
  const [isSeparating, setIsSeparating]     = useState(false);
  const [separationType, setSeparationType] = useState('separate_vocal');

  // ── Upload ──
  const [uploadMode, setUploadMode]   = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);

  // ── Mixer ──
  const [volumes, setVolumes] = useState({});
  const [muted, setMuted]     = useState({});
  const [soloed, setSoloed]   = useState({});
  const [restying, setRestying] = useState({});

  // ── Restyle ──
  const [restyleStyle, setRestyleStyle]     = useState('');
  const [restyleSection, setRestyleSection] = useState('');

  // ── Mastering ──
  const [masteringTrack, setMasteringTrack] = useState(null);

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ['stem-tracks'],
    queryFn: () => base44.entities.Track.filter({ status: 'ready' }, '-created_date', 50),
  });

  const { data: separations = [] } = useQuery({
    queryKey: ['stem-separations'],
    queryFn: () => base44.entities.StemSeparation.list('-created_date'),
    refetchInterval: (data) => {
      const arr = Array.isArray(data) ? data : [];
      return arr.some(s => s.status === 'pending' || s.status === 'processing') ? 3000 : false;
    },
  });

  // Auto-attach ready separation when track selected
  React.useEffect(() => {
    if (!selectedTrack || !separations.length) return;
    const found = separations.find(s => s.track_id === selectedTrack.id && s.status === 'ready');
    if (found && (!selectedSeparation || selectedSeparation.track_id !== selectedTrack.id)) {
      setSelectedSeparation(found);
    }
  }, [selectedTrack, separations]);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const readySeparations = separations.filter(s => s.status === 'ready');
  const processingSeps   = separations.filter(s => s.status === 'processing' || s.status === 'pending');
  const filteredTracks   = tracks.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const trackSeparationMap = React.useMemo(() => {
    const map = {};
    separations.forEach(s => {
      if (!map[s.track_id]) map[s.track_id] = [];
      map[s.track_id].push(s);
    });
    return map;
  }, [separations]);

  const availableStems = selectedSeparation
    ? Object.keys(STEM_COLORS).filter(k => selectedSeparation[`${k}_url`])
    : [];

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleUploadFile = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedUrl(file_url);
      const uploaded = await base44.entities.Track.create({
        title: file.name.replace(/\.[^/.]+$/, ''),
        audio_url: file_url,
        stream_audio_url: file_url,
        status: 'ready',
        style: 'Uploaded audio',
        duration: 0,
      });
      setSelectedTrack(uploaded);
      setSelectedSeparation(null);
      queryClient.invalidateQueries({ queryKey: ['stem-tracks'] });
      toast.success('File uploaded! You can now separate its stems.');
      setUploadMode(false);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSeparateStems = async (overrideTrack) => {
    const track = overrideTrack || selectedTrack;
    if (!track) { toast.error('Select a track first'); return; }
    setIsSeparating(true);
    haptics.medium();
    try {
      const res = await base44.functions.invoke('separateVocals', {
        taskId:   track.task_id,
        audioId:  track.external_audio_id,
        audioUrl: track.audio_url || uploadedUrl,
        type:     separationType,
        trackId:  track.id,
      });
      if (res.data?.success) {
        toast.success('Stem separation started! Auto-updating every 3 seconds.');
        queryClient.invalidateQueries({ queryKey: ['stem-separations'] });
      } else throw new Error(res.data?.error || 'Separation failed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSeparating(false);
    }
  };

  const handleRestyle = async (stemKey) => {
    if (!selectedSeparation) { toast.error('No separation loaded'); return; }
    if (!restyleStyle.trim()) { toast.error('Enter a target style'); return; }
    setRestying(r => ({ ...r, [stemKey]: true }));
    haptics.medium();
    try {
      const stemUrl = selectedSeparation[`${stemKey}_url`];
      const res = await base44.functions.invoke('remixStem', {
        stem_url:  stemUrl,
        stemUrl,
        style:     restyleStyle,
        section:   restyleSection,
        track_id:  selectedTrack?.id,
        trackId:   selectedTrack?.id,
        stem_type: stemKey,
        stemType:  stemKey,
        prompt:    `${restyleStyle}${restyleSection ? ` for ${restyleSection}` : ''}`,
      });
      if (res.data?.success) {
        toast.success(`${STEM_COLORS[stemKey]?.label || stemKey} restyle queued!`);
        queryClient.invalidateQueries({ queryKey: ['stem-separations'] });
      } else throw new Error(res.data?.error || 'Restyle failed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRestying(r => ({ ...r, [stemKey]: false }));
    }
  };

  const handleOpenMixer = (sep) => {
    const track = tracks.find(t => t.id === sep.track_id);
    haptics.medium();
    setSelectedTrack(track || null);
    setSelectedSeparation(sep);
    setActiveTab('remix');
  };

  const selectTrack = (track) => {
    haptics.light();
    setSelectedTrack(track);
    setSelectedSeparation(null);
    const readySep = (trackSeparationMap[track.id] || []).find(s => s.status === 'ready');
    if (readySep) setSelectedSeparation(readySep);
  };

  const beginSplitResize = (type) => (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startSidebar = sidebarWidth;
    const startTopRatio = libraryTopRatio;
    const mainHeight = pageRef.current?.querySelector('[data-stem-library-pane]')?.clientHeight || 800;

    const onMove = (moveEvent) => {
      if (type === 'sidebar') {
        const dx = moveEvent.clientX - startX;
        setSidebarWidth(Math.max(280, Math.min(460, startSidebar + dx)));
      }
      if (type === 'library-horizontal') {
        const dy = moveEvent.clientY - startY;
        setLibraryTopRatio((prev) => {
          const next = startTopRatio + (dy / Math.max(mainHeight, 1));
          return Math.max(0.24, Math.min(0.72, next));
        });
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={pageRef} className="h-full flex flex-col overflow-hidden" style={{ background: '#09090f' }}>

      {/* ─ Sticky header ─ */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 lg:px-6 py-3 gap-3 flex-wrap"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(9,9,15,0.98)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)' }}>
            <Scissors style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white leading-tight">Stems & Remix Studio</h1>
            <p className="text-[10px] text-white/35">Isolate, mix and restyle your tracks</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <StatChip icon={GitBranch} value={readySeparations.length} label="Separated"  color="#22d3ee" />
          <StatChip icon={Clock}     value={processingSeps.length}   label="Processing" color="#fbbf24" pulse={processingSeps.length > 0} />
          <StatChip icon={Sparkles}  value={tracks.length}           label="Available"  color="#a78bfa" />
        </div>

        <button
          onClick={() => { setUploadMode(u => !u); setSidebarOpen(true); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0',
            uploadMode ? 'text-white' : 'text-white/60 border hover:bg-white/5',
          )}
          style={uploadMode
            ? { background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)' }
            : { borderColor: 'rgba(255,255,255,0.1)' }}
          aria-pressed={uploadMode}
        >
          <Upload className="h-3 w-3" /> Upload
        </button>
      </header>

      {/* ─ Body ─ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ─ Left sidebar ─ */}
        <aside
          className={cn(
            'flex-shrink-0 flex flex-col border-r overflow-hidden transition-all duration-300',
            sidebarOpen ? 'w-full lg:w-[var(--stem-sidebar-width)]' : 'w-0 border-r-0',
          )}
          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(10,10,16,0.9)', '--stem-sidebar-width': `${sidebarWidth}px` }}
          aria-label="Track selection"
        >
          <div className="flex flex-col h-full overflow-y-auto">

            {/* Search / upload toggle */}
            <div className="p-3 sticky top-0 z-10"
              style={{ background: 'rgba(10,10,16,0.96)' }}>
              <p className="text-[10px] font-extrabold tracking-widest text-white/35 uppercase mb-2">
                {uploadMode ? 'Upload Audio' : 'Select Track'}
              </p>

              {uploadMode ? (
                <>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="rounded-xl p-5 text-center cursor-pointer transition-all"
                    style={{ border: '2px dashed rgba(255,255,255,0.12)', background: 'rgba(6,182,212,0.04)' }}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
                    aria-label="Upload audio file"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-7 h-7 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                        <p className="text-[11px] text-white/40">Uploading…</p>
                      </div>
                    ) : uploadedUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <Check className="h-7 w-7 text-green-400" />
                        <p className="text-[11px] text-green-400 font-bold">Uploaded!</p>
                        <p className="text-[10px] text-white/30">Track added to library</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-7 w-7 text-white/20 mx-auto mb-2" />
                        <p className="text-[11px] text-white/40">Click or drop audio</p>
                        <p className="text-[10px] text-white/20 mt-0.5">MP3, WAV, FLAC</p>
                      </>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="audio/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleUploadFile(e.target.files[0])} />
                  <button
                    onClick={() => setUploadMode(false)}
                    className="w-full mt-2 py-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                    ← Back to library
                  </button>
                </>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search tracks…"
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-xs"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Track list */}
            {!uploadMode && (
              <div className="flex-1 px-2 pb-3 space-y-0.5">
                {tracksLoading ? (
                  <div className="py-8 flex justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                  </div>
                ) : filteredTracks.length === 0 ? (
                  <p className="text-[11px] text-white/25 text-center py-8">No tracks found</p>
                ) : (
                  filteredTracks.map(track => {
                    const trackSeps = trackSeparationMap[track.id] || [];
                    const hasReady  = trackSeps.some(s => s.status === 'ready');
                    const hasProc   = trackSeps.some(s => s.status === 'processing' || s.status === 'pending');
                    const isSelected = selectedTrack?.id === track.id;

                    return (
                      <button key={track.id} onClick={() => selectTrack(track)}
                        className={cn(
                          'w-full flex items-center gap-2 p-2.5 rounded-xl transition-all text-left',
                          isSelected
                            ? 'border border-cyan-500/40'
                            : 'border border-transparent hover:bg-white/5',
                        )}
                        style={isSelected ? { background: 'rgba(6,182,212,0.1)' } : {}}
                        aria-pressed={isSelected}
                      >
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.07)' }}>
                          {track.cover_image_url
                            ? <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center">
                                <Music className="h-4 w-4 text-white/20" />
                              </div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{track.title}</p>
                          <p className="text-[10px] text-white/30 truncate">{track.style || 'Unknown style'}</p>
                        </div>
                        {hasProc  && <Clock     className="h-3 w-3 text-yellow-400 animate-pulse flex-shrink-0" />}
                        {hasReady && !hasProc && <GitBranch className="h-3 w-3 text-cyan-400 flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Separation controls */}
            {selectedTrack && !uploadMode && (
              <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

                {/* Type selector (only show when no separation loaded) */}
                {!selectedSeparation && (
                  <div className="mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-1.5">
                      Separation Type
                    </p>
                    {[
                      { val: 'separate_vocal', label: '2-Stem (Vocals + Instrumental)' },
                      { val: 'split_stem',      label: '6-Stem (Vocals, Drums, Bass…)'  },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setSeparationType(opt.val)}
                        className={cn(
                          'w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg mb-1 transition-all font-medium',
                          separationType === opt.val ? 'text-white' : 'text-white/40 hover:bg-white/5',
                        )}
                        style={separationType === opt.val
                          ? { background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.28)' }
                          : { border: '1px solid transparent' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {selectedSeparation ? (
                  <div className="p-2 rounded-xl flex items-center gap-2 mb-2"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}>
                    <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                    <p className="text-[11px] text-green-400 font-bold">{availableStems.length} stems ready</p>
                  </div>
                ) : processingSeps.some(s => s.track_id === selectedTrack?.id) ? (
                  <div className="p-2 rounded-xl flex items-center gap-2"
                    style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)' }}>
                    <Clock className="h-3.5 w-3.5 text-yellow-400 animate-pulse flex-shrink-0" />
                    <p className="text-[11px] text-yellow-400 font-bold">Separating stems…</p>
                  </div>
                ) : (
                  <button onClick={() => handleSeparateStems()} disabled={isSeparating}
                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', color: '#fff' }}>
                    {isSeparating
                      ? <><RefreshCw className="h-4 w-4 animate-spin" /> Separating…</>
                      : <><GitBranch className="h-4 w-4" /> Separate Stems</>}
                  </button>
                )}

                {selectedSeparation && (
                  <button onClick={() => setSelectedSeparation(null)}
                    className="w-full text-[10px] text-white/25 hover:text-white/55 transition-colors mt-1.5">
                    ↻ Re-separate with different settings
                  </button>
                )}
              </div>
            )}

            {/* Restyle settings — visible in sidebar when remix tab active */}
            {selectedSeparation && activeTab === 'remix' && (
              <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] font-extrabold tracking-widest text-white/35 uppercase mb-2">
                  AI Restyle Settings
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-white/35 font-bold uppercase block mb-1">
                      Target Style
                    </label>
                    <input
                      value={restyleStyle}
                      onChange={e => setRestyleStyle(e.target.value)}
                      placeholder="e.g. Lo-fi Hip-hop, Trap…"
                      className="w-full px-2.5 py-1.5 rounded-lg text-[11px]"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {STYLE_PRESETS.slice(0, 8).map(p => (
                      <button key={p} onClick={() => setRestyleStyle(p)}
                        className="text-[9px] px-1.5 py-0.5 rounded-full transition-all font-medium"
                        style={restyleStyle === p
                          ? { background: '#06b6d4', color: '#fff' }
                          : { background: 'rgba(6,182,212,0.08)', color: 'rgba(6,182,212,0.6)', border: '1px solid rgba(6,182,212,0.15)' }}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 font-bold uppercase block mb-1">
                      Section (optional)
                    </label>
                    <input
                      value={restyleSection}
                      onChange={e => setRestyleSection(e.target.value)}
                      placeholder="e.g. chorus, verse 1…"
                      className="w-full px-2.5 py-1.5 rounded-lg text-[11px]"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <SubtleSplitter
            orientation="vertical"
            label="Resize track list"
            onPointerDown={beginSplitResize('sidebar')}
          />
        )}

        {/* ─ Main content ─ */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Tab bar */}
          <div
            className="flex-shrink-0 flex items-center gap-1 px-4 py-2 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(9,9,15,0.6)' }}
          >
            <TabButton
              active={activeTab === 'library'}
              onClick={() => setActiveTab('library')}
              icon={Layers}
              label="Stems Library"
              badge={readySeparations.length}
            />
            <TabButton
              active={activeTab === 'remix'}
              onClick={() => setActiveTab('remix')}
              icon={Wand2}
              label="Remix & Mix"
              badge={selectedSeparation ? availableStems.length : undefined}
            />
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(s => !s)}
              className="ml-auto text-white/40 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5 lg:hidden"
              aria-label="Toggle track panel"
            >
              <Music className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">

            {/* ── Library Tab ── */}
            {activeTab === 'library' && (
              <AnimatePresence mode="wait">
                <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="h-[calc(var(--content-available-height,100vh)-170px)] min-h-[460px] flex flex-col" data-stem-library-pane>
                    <section className="overflow-y-auto pr-1.5" style={{ flexBasis: `${Math.round(libraryTopRatio * 100)}%` }}>
                      {/* Processing pills */}
                      {processingSeps.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-5">
                          {processingSeps.map(sep => {
                            const t = tracks.find(tr => tr.id === sep.track_id);
                            return (
                              <div key={sep.id}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                                style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                                <div className="w-3 h-3 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
                                {t?.title || 'Track'} — separating…
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {readySeparations.length === 0 ? (
                        <EmptyState
                          icon={GitBranch}
                          title="No stems separated yet"
                          description="Select a track from the left panel and click Separate Stems to begin."
                        />
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <GitBranch className="h-4 w-4 text-cyan-400" />
                            <h2 className="text-sm font-extrabold text-white">
                              Separated Stems
                              <span className="text-[10px] font-normal text-white/30 ml-2">
                                ({readySeparations.length})
                              </span>
                            </h2>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {readySeparations.map(sep => (
                              <StemLibraryCard
                                key={sep.id}
                                separation={sep}
                                track={tracks.find(t => t.id === sep.track_id)}
                                onOpenMixer={handleOpenMixer}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </section>

                    <SubtleSplitter
                      orientation="horizontal"
                      label="Resize separated list and new-track list"
                      onPointerDown={beginSplitResize('library-horizontal')}
                    />

                    <section className="flex-1 min-h-0 overflow-y-auto pr-1.5">
                      {filteredTracks.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <Zap className="h-4 w-4 text-violet-400" />
                            <h2 className="text-sm font-extrabold text-white">
                              Separate a New Track
                              <span className="text-[10px] font-normal text-white/30 ml-2">
                                ({filteredTracks.length})
                              </span>
                            </h2>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredTracks.map((track, i) => {
                              const trackSeps = trackSeparationMap[track.id] || [];
                              const hasReady  = trackSeps.some(s => s.status === 'ready');
                              const hasProc   = trackSeps.some(s => s.status === 'processing' || s.status === 'pending');

                              return (
                                <motion.div key={track.id}
                                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.025 }}
                                  className="rounded-xl border overflow-hidden group transition-all hover:border-violet-500/40"
                                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                  <div className="relative h-28 overflow-hidden">
                                    <img
                                      src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'}
                                      alt={track.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0"
                                      style={{ background: 'linear-gradient(to top, rgba(9,9,15,0.95) 0%, transparent 60%)' }} />
                                    <button onClick={() => playTrack(track)}
                                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                      <Play className="h-4 w-4 text-slate-900 ml-0.5" />
                                    </button>
                                    {hasReady && (
                                      <Badge className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 border-0"
                                        style={{ background: 'rgba(34,197,94,0.25)', color: '#4ade80' }}>
                                        <GitBranch className="h-2 w-2 mr-0.5" />
                                        {trackSeps.filter(s => s.status === 'ready').length}
                                      </Badge>
                                    )}
                                    {hasProc && (
                                      <Badge className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 border-0 animate-pulse"
                                        style={{ background: 'rgba(251,191,36,0.25)', color: '#fbbf24' }}>
                                        <Clock className="h-2 w-2 mr-0.5" /> Processing
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="p-3">
                                    <p className="text-xs font-semibold text-white truncate mb-0.5">{track.title}</p>
                                    <p className="text-[10px] text-white/35 truncate mb-3">{track.style || '—'}</p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          haptics.medium();
                                          selectTrack(track);
                                          setSidebarOpen(true);
                                          if (!hasReady && !hasProc) {
                                            handleSeparateStems(track);
                                          }
                                        }}
                                        disabled={hasProc}
                                        className="flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-60"
                                        style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', color: '#fff' }}>
                                        <Scissors className="h-3 w-3" />
                                        {hasReady ? 'Re-Separate' : hasProc ? 'Processing…' : 'Separate'}
                                      </button>
                                      {hasReady && (
                                        <button
                                          onClick={() => {
                                            const sep = trackSeps.find(s => s.status === 'ready');
                                            if (sep) handleOpenMixer(sep);
                                          }}
                                          className="py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                                          style={{ background: 'rgba(168,85,247,0.15)', color: '#a78bfa', border: '1px solid rgba(168,85,247,0.3)' }}>
                                          <Volume2 className="h-3 w-3" /> Mix
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* ── Remix Tab ── */}
            {activeTab === 'remix' && (
              <AnimatePresence mode="wait">
                <motion.div key="remix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  {!selectedTrack ? (
                    <EmptyState
                      icon={GitBranch}
                      title="Select a track to remix"
                      description="Choose a track from the left panel. If it has stems, the mixer will load automatically."
                    />
                  ) : !selectedSeparation ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
                        <Disc className="h-7 w-7 text-cyan-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-white/60 font-semibold mb-1">{selectedTrack.title}</p>
                        <p className="text-white/30 text-sm">Separate stems first to start remixing</p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                        {Object.entries(STEM_COLORS).map(([k, v]) => (
                          <span key={k} className="text-[10px] px-2 py-1 rounded-full font-medium"
                            style={{ background: v.bg + '18', color: v.bg, border: `1px solid ${v.bg}28` }}>
                            {v.label}
                          </span>
                        ))}
                      </div>
                      {processingSeps.some(s => s.track_id === selectedTrack.id) ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                          <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                          Separating stems, please wait…
                        </div>
                      ) : (
                        <button onClick={() => handleSeparateStems()} disabled={isSeparating}
                          className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', color: '#fff' }}>
                          {isSeparating
                            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Separating…</>
                            : <><GitBranch className="h-4 w-4" /> Separate Stems Now</>}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Track info bar */}
                      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            {selectedTrack.cover_image_url
                              ? <img src={selectedTrack.cover_image_url} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center rounded-lg"
                                  style={{ background: 'rgba(255,255,255,0.07)' }}>
                                  <Music className="h-4 w-4 text-white/30" />
                                </div>}
                          </div>
                          <div>
                            <h2 className="text-sm font-bold text-white">{selectedTrack.title}</h2>
                            <p className="text-[11px] text-white/40">
                              {availableStems.length} stems isolated · AI restyle ready
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setSoloed({}); setMuted({}); }}
                          className="text-[11px] px-3 py-1.5 rounded-lg text-white/40 hover:text-white/70 transition-colors"
                          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                          Reset All
                        </button>
                      </div>

                      {/* Stem grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
                        {Object.keys(STEM_COLORS).map(stemKey => (
                          <StemCard
                            key={stemKey}
                            stemKey={stemKey}
                            url={selectedSeparation[`${stemKey}_url`]}
                            volume={volumes[stemKey] ?? 80}
                            muted={!!muted[stemKey]}
                            soloed={!!soloed[stemKey]}
                            onVolume={(k, v) => setVolumes(p => ({ ...p, [k]: v }))}
                            onMute={k => setMuted(p => ({ ...p, [k]: !p[k] }))}
                            onSolo={k => setSoloed(p => ({ ...p, [k]: !p[k] }))}
                            onRestyle={handleRestyle}
                            isRestying={!!restying[stemKey]}
                          />
                        ))}
                      </div>

                      {/* Waveform preview */}
                      {(selectedSeparation.vocal_url || selectedSeparation.instrumental_url) && (
                        <div className="rounded-xl p-4 mb-4"
                          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                            <BarChart3 className="h-3.5 w-3.5 text-violet-400" /> Waveform Preview
                          </h3>
                          <StemWaveformPlayer
                            audioUrl={selectedSeparation.vocal_url || selectedSeparation.instrumental_url}
                            label={selectedSeparation.vocal_url ? 'Vocals' : 'Instrumental'}
                            color="#a78bfa"
                          />
                        </div>
                      )}

                      {/* Export panel */}
                      <div className="rounded-xl p-4"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                          <Download className="h-3.5 w-3.5 text-cyan-400" /> Export Individual Stems
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {availableStems.map(stemKey => {
                            const cfg = STEM_COLORS[stemKey];
                            const url = selectedSeparation[`${stemKey}_url`];
                            return (
                              <a key={stemKey} href={url}
                                download={`${selectedTrack.title}-${stemKey}.mp3`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                                style={{ background: cfg.bg + '18', color: cfg.bg, border: `1px solid ${cfg.bg}30` }}
                                aria-label={`Download ${cfg.label}`}>
                                <Download className="h-3 w-3" /> {cfg.label}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

          </div>
        </main>
      </div>

      {/* Mastering Dialog */}
      <EnhancedMasteringDialog
        track={masteringTrack}
        open={!!masteringTrack}
        onClose={() => setMasteringTrack(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['stem-tracks'] })}
      />
    </div>
  );
}
