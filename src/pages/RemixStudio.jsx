import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';
import {
  Upload, Mic, Music, Disc, Wand2, Play, Pause, Download,
  RefreshCw, Layers, Sliders, GitBranch, Sparkles, ChevronRight,
  Volume2, Volume1, VolumeX, Check, Clock, AlertCircle, X, Settings
} from 'lucide-react';

const STEM_COLORS = {
  vocal: { bg: '#ec4899', label: 'Vocals', icon: Mic },
  instrumental: { bg: '#06b6d4', label: 'Instrumental', icon: Music },
  drums: { bg: '#ef4444', label: 'Drums', icon: Disc },
  bass: { bg: '#8b5cf6', label: 'Bass', icon: Layers },
  guitar: { bg: '#f97316', label: 'Guitar', icon: Music },
  keyboard: { bg: '#22c55e', label: 'Keys', icon: Music },
  backing_vocals: { bg: '#f59e0b', label: 'Backing Vocals', icon: Mic },
};

const STYLE_PRESETS = [
  'Lo-fi Hip-hop', 'Trap', 'Indie Pop', 'Dark Ambient', 'Latin Fusion',
  'Progressive Rock', 'Jazz Fusion', 'Cinematic', 'EDM', 'Country Folk',
  'R&B Soul', 'Reggaeton', 'Classical Crossover', 'Synthwave', 'Afrobeats'
];

function StemTrack({ stemKey, url, volume, muted, soloed, onVolume, onMute, onSolo, onRestyle, isRestying }) {
  const cfg = STEM_COLORS[stemKey] || { bg: '#6b7280', label: stemKey, icon: Music };
  const Icon = cfg.icon;
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTogglePlay = () => {
    if (!url) return;
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    }
  };

  return (
    <div
      className={cn('group rounded-xl p-3 transition-all', muted && 'opacity-50')}
      style={{ background: cfg.bg + '18', border: `1px solid ${cfg.bg}44` }}
      role="group"
      aria-label={`${cfg.label} stem`}
    >
      {url && <audio ref={audioRef} src={url} onEnded={() => setIsPlaying(false)} />}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg + '33' }}>
          <Icon className="h-4 w-4" style={{ color: cfg.bg }} />
        </div>
        <span className="text-sm font-bold text-white flex-1">{cfg.label}</span>
        {/* Play button */}
        {url && (
          <button
            onClick={handleTogglePlay}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: isPlaying ? cfg.bg + '44' : 'rgba(255,255,255,0.1)' }}
            aria-label={isPlaying ? `Pause ${cfg.label}` : `Play ${cfg.label}`}
          >
            {isPlaying ? <Pause className="h-3 w-3 text-white" /> : <Play className="h-3 w-3 text-white ml-0.5" />}
          </button>
        )}
        {!url && <span className="text-[10px] text-white/25">No stem</span>}
        {/* Mute */}
        <button
          onClick={() => onMute(stemKey)}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
          aria-label={muted ? `Unmute ${cfg.label}` : `Mute ${cfg.label}`}
          aria-pressed={muted}
        >
          {muted ? <VolumeX className="h-3 w-3 text-white/40" /> : <Volume2 className="h-3 w-3 text-white/60" />}
        </button>
        {/* Solo */}
        <button
          onClick={() => onSolo(stemKey)}
          className={cn('w-7 h-7 rounded-full text-[9px] font-extrabold flex items-center justify-center transition-colors', soloed ? 'text-black' : 'text-white/40 hover:bg-white/10')}
          style={soloed ? { background: cfg.bg } : {}}
          aria-label={`Solo ${cfg.label}`}
          aria-pressed={soloed}
        >S</button>
      </div>
      {/* Volume */}
      <input
        type="range" min={0} max={100} value={volume}
        onChange={e => onVolume(stemKey, +e.target.value)}
        className="w-full h-1 rounded-full appearance-none mb-2"
        style={{ accentColor: cfg.bg }}
        aria-label={`${cfg.label} volume`}
      />
      {/* Restyle button */}
      {url && (
        <button
          onClick={() => onRestyle(stemKey)}
          disabled={isRestying}
          className="w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          style={{ background: cfg.bg + '33', color: cfg.bg, border: `1px solid ${cfg.bg}44` }}
          aria-label={`AI restyle ${cfg.label}`}
        >
          {isRestying ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          {isRestying ? 'Restyling…' : 'AI Restyle'}
        </button>
      )}
    </div>
  );
}

export default function RemixStudioPage() {
  const [user, setUser] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [separation, setSeparation] = useState(null);
  const [isSeparating, setIsSeparating] = useState(false);
  const [separationTask, setSeparationTask] = useState(null);
  const [volumes, setVolumes] = useState({});
  const [muted, setMuted] = useState({});
  const [soloed, setSoloed] = useState({});
  const [restyleStyle, setRestyleStyle] = useState('');
  const [restyleSection, setRestyleSection] = useState('');
  const [restying, setRestying] = useState({});
  const [uploadMode, setUploadMode] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('stems');
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  React.useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: tracks = [] } = useQuery({
    queryKey: ['remix-tracks'],
    queryFn: () => base44.entities.Track.filter({ status: 'ready' }, '-created_date', 30),
    enabled: !!user,
  });

  const { data: separations = [] } = useQuery({
    queryKey: ['stem-separations'],
    queryFn: () => base44.entities.StemSeparation.list('-created_date'),
    refetchInterval: (data) => {
      const arr = Array.isArray(data) ? data : [];
      return arr.some(s => s.status === 'pending' || s.status === 'processing') ? 2000 : false;
    },
    enabled: !!user,
  });

  // Auto-load separation when found
  React.useEffect(() => {
    if (selectedTrack && separations.length) {
      const found = separations.find(s => s.track_id === selectedTrack.id && s.status === 'ready');
      if (found) setSeparation(found);
    }
  }, [selectedTrack, separations]);

  const handleUploadFile = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedUrl(file_url);
      const uploadedTrack = await base44.entities.Track.create({
        title: file.name.replace(/\.[^/.]+$/, ''),
        audio_url: file_url,
        stream_audio_url: file_url,
        status: 'ready',
        style: 'Uploaded audio',
        duration: 0,
      });
      setSelectedTrack(uploadedTrack);
      setSeparation(null);
      toast.success('File uploaded and loaded for remixing.');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSeparateStems = async () => {
    const trackId = selectedTrack?.id;
    if (!trackId) { toast.error('Select a track first'); return; }
    setIsSeparating(true);
    haptics.medium();
    try {
      const res = await base44.functions.invoke('separateVocals', {
        taskId: selectedTrack.task_id,
        audioId: selectedTrack.external_audio_id,
        audioUrl: selectedTrack.audio_url || uploadedUrl,
        type: 'split_stem',
        trackId,
      });
      if (res.data?.success) {
        toast.success('Stem separation started! This may take a few minutes.');
        setSeparationTask(res.data.taskId);
        queryClient.invalidateQueries({ queryKey: ['stem-separations'] });
      } else throw new Error(res.data?.error || 'Separation failed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSeparating(false);
    }
  };

  const handleRestyle = async (stemKey) => {
    if (!separation) { toast.error('Separate stems first'); return; }
    if (!restyleStyle) { toast.error('Enter a style for restyle'); return; }
    setRestying(r => ({ ...r, [stemKey]: true }));
    haptics.medium();
    try {
      const stemUrl = separation[`${stemKey}_url`];
      const res = await base44.functions.invoke('remixStem', {
        stem_url: stemUrl,
        stemUrl,
        style: restyleStyle,
        section: restyleSection,
        track_id: selectedTrack?.id,
        trackId: selectedTrack?.id,
        stem_type: stemKey,
        stemType: stemKey,
        prompt: `${restyleStyle}${restyleSection ? ` for ${restyleSection}` : ''}`,
      });
      if (res.data?.success) {
        toast.success(`${stemKey} restyle queued!`);
        queryClient.invalidateQueries({ queryKey: ['stem-separations'] });
      } else throw new Error(res.data?.error || 'Restyle failed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRestying(r => ({ ...r, [stemKey]: false }));
    }
  };

  const availableStems = separation
    ? Object.keys(STEM_COLORS).filter(k => separation[`${k}_url`])
    : [];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#09090f' }} role="main" aria-label="Remix Studio">
      {/* Header */}
      <header className="sticky top-0 z-30 flex-shrink-0 flex items-center justify-between px-4 lg:px-6 py-3 border-b" style={{ background: 'rgba(9,9,15,0.97)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)' }}>
            <GitBranch className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white">Remix Studio</h1>
            <p className="text-[10px] text-white/35">AI stem separation & style re-styling</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUploadMode(u => !u)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all', uploadMode ? 'text-white' : 'text-white/60 border border-white/10 hover:bg-white/5')}
            style={uploadMode ? { background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)' } : {}}
            aria-label="Upload external audio"
            aria-pressed={uploadMode}
          >
            <Upload className="h-3 w-3" /> Upload Audio
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
        {/* LEFT — Track selector + upload */}
        <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(10,10,16,0.9)' }} aria-label="Track selection panel">
          <div className="p-4">
            <h2 className="text-[11px] font-extrabold tracking-widest text-white/40 uppercase mb-3">Select Track</h2>
            {uploadMode ? (
              <div className="mb-4">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl p-6 text-center cursor-pointer transition-all hover:border-cyan-500/50"
                  style={{ border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(6,182,212,0.05)' }}
                  role="button"
                  aria-label="Click to upload audio file"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                      <p className="text-xs text-white/40">Uploading…</p>
                    </div>
                  ) : uploadedUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <Check className="h-8 w-8 text-green-400" />
                      <p className="text-xs text-green-400 font-bold">Uploaded!</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/40">Drop audio file here</p>
                      <p className="text-[10px] text-white/20 mt-1">MP3, WAV, FLAC supported</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  aria-label="Audio file input"
                  onChange={e => e.target.files?.[0] && handleUploadFile(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {tracks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTrack(t); setSeparation(null); haptics.light(); }}
                    className={cn('w-full flex items-center gap-2 p-2.5 rounded-xl transition-all text-left', selectedTrack?.id === t.id ? 'bg-cyan-500/15 border border-cyan-500/40' : 'hover:bg-white/5 border border-transparent')}
                    aria-pressed={selectedTrack?.id === t.id}
                    aria-label={`Select track ${t.title}`}
                  >
                    <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      {t.cover_image_url
                        ? <img src={t.cover_image_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Music className="h-4 w-4 text-white/20" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-white/30 truncate">{t.style || 'Unknown style'}</p>
                    </div>
                    {separations.some(s => s.track_id === t.id && s.status === 'ready') && (
                      <GitBranch className="h-3 w-3 text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
                {tracks.length === 0 && (
                  <p className="text-xs text-white/30 text-center py-6">No ready tracks yet. Generate some music first!</p>
                )}
              </div>
            )}

            {/* Separate button */}
            {selectedTrack && !separation && (
              <button
                onClick={handleSeparateStems}
                disabled={isSeparating}
                className="w-full mt-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', color: '#fff' }}
                aria-label="Separate stems"
              >
                {isSeparating ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Separating…</>
                ) : (
                  <><GitBranch className="h-4 w-4" /> Separate Stems</>
                )}
              </button>
            )}
            {separation && (
              <div className="mt-3 p-2.5 rounded-xl flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                <p className="text-xs text-green-400 font-bold">{availableStems.length} stems ready</p>
              </div>
            )}
            {separations.filter(s => s.track_id === selectedTrack?.id && (s.status === 'processing' || s.status === 'pending')).length > 0 && (
              <div className="mt-3 p-2.5 rounded-xl flex items-center gap-2" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <Clock className="h-4 w-4 text-yellow-400 animate-pulse flex-shrink-0" />
                <p className="text-xs text-yellow-400 font-bold">Separating stems…</p>
              </div>
            )}
          </div>

          {/* Restyle settings */}
          {separation && (
            <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <h2 className="text-[11px] font-extrabold tracking-widest text-white/40 uppercase mb-3">AI Restyle Settings</h2>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-white/40 font-bold uppercase block mb-1" htmlFor="restyle-style">Target Style</label>
                  <input
                    id="restyle-style"
                    value={restyleStyle}
                    onChange={e => setRestyleStyle(e.target.value)}
                    placeholder="e.g. Lo-fi Hip-hop, Trap, Jazz..."
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                    aria-label="Restyle target style"
                  />
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {STYLE_PRESETS.slice(0, 8).map(p => (
                    <button
                      key={p}
                      onClick={() => setRestyleStyle(p)}
                      className="text-[9px] px-2 py-0.5 rounded-full transition-all"
                      style={restyleStyle === p
                        ? { background: '#06b6d4', color: '#fff' }
                        : { background: 'rgba(6,182,212,0.1)', color: 'rgba(6,182,212,0.7)', border: '1px solid rgba(6,182,212,0.2)' }
                      }
                      aria-pressed={restyleStyle === p}
                    >{p}</button>
                  ))}
                </div>
                <div>
                  <label className="text-[10px] text-white/40 font-bold uppercase block mb-1" htmlFor="restyle-section">Section (optional)</label>
                  <input
                    id="restyle-section"
                    value={restyleSection}
                    onChange={e => setRestyleSection(e.target.value)}
                    placeholder="e.g. chorus, verse 1..."
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                    aria-label="Restyle section"
                  />
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* CENTER — Stem mixer */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 lg:p-6" aria-label="Stem mixer">
          {!selectedTrack ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#06b6d466,#8b5cf666)' }}>
                <GitBranch className="h-10 w-10 text-white/40" />
              </div>
              <p className="text-white/30 text-sm font-semibold">Select a track to start remixing</p>
              <p className="text-white/20 text-xs text-center max-w-xs">Choose a generated track from the left panel, then separate its stems to begin AI-driven style re-styling</p>
            </div>
          ) : !separation ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
                <Disc className="h-8 w-8 text-cyan-400" />
              </div>
              <p className="text-white/40 text-sm font-semibold">{selectedTrack.title}</p>
              <p className="text-white/25 text-xs text-center max-w-xs">Click "Separate Stems" to isolate vocals, drums, bass, guitar and more from this track</p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {Object.entries(STEM_COLORS).map(([k, v]) => (
                  <span key={k} className="text-[10px] px-2 py-1 rounded-full" style={{ background: v.bg + '22', color: v.bg, border: `1px solid ${v.bg}33` }}>{v.label}</span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white">{selectedTrack.title}</h2>
                  <p className="text-xs text-white/40">{availableStems.length} stems isolated • AI restyle ready</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSoloed({}); setMuted({}); }}
                    className="text-xs px-3 py-1.5 rounded-lg text-white/50 border border-white/10 hover:bg-white/5 transition-colors"
                    aria-label="Reset all stem controls"
                  >Reset All</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Object.keys(STEM_COLORS).map(stemKey => (
                  <StemTrack
                    key={stemKey}
                    stemKey={stemKey}
                    url={separation[`${stemKey}_url`]}
                    volume={volumes[stemKey] ?? 80}
                    muted={!!muted[stemKey]}
                    soloed={!!soloed[stemKey]}
                    onVolume={(k, v) => setVolumes(prev => ({ ...prev, [k]: v }))}
                    onMute={(k) => setMuted(prev => ({ ...prev, [k]: !prev[k] }))}
                    onSolo={(k) => setSoloed(prev => ({ ...prev, [k]: !prev[k] }))}
                    onRestyle={handleRestyle}
                    isRestying={!!restying[stemKey]}
                  />
                ))}
              </div>

              {/* Export section */}
              <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Download className="h-4 w-4 text-cyan-400" /> Export Stems
                </h3>
                <div className="flex flex-wrap gap-2">
                  {availableStems.map(stemKey => {
                    const cfg = STEM_COLORS[stemKey];
                    const url = separation[`${stemKey}_url`];
                    return (
                      <a
                        key={stemKey}
                        href={url}
                        download={`${selectedTrack.title}-${stemKey}.mp3`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{ background: cfg.bg + '22', color: cfg.bg, border: `1px solid ${cfg.bg}44` }}
                        aria-label={`Download ${cfg.label} stem`}
                      >
                        <Download className="h-3 w-3" /> {cfg.label}
                      </a>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
