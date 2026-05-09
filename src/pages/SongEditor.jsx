import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward,
  RefreshCw, Save, ChevronDown, ChevronUp, Plus, X, Scissors,
  Maximize2, Minimize2, Settings, Layers, Music, Mic, ZoomIn, ZoomOut,
  ArrowRight, Clock, Wand2, Replace, Trash2, Crop
} from 'lucide-react';

const SECTION_COLORS = {
  INTRO: '#22c55e',
  'VERSE 1': '#ec4899',
  'VERSE 2': '#ec4899',
  'PRE-CH': '#f97316',
  CHORUS: '#f97316',
  'CHORUS - x2': '#f97316',
  BRIDGE: '#eab308',
  OUTRO: '#a3e635',
  INSTRUMENTAL: '#06b6d4',
  HOOK: '#8b5cf6',
  'FINAL CHORUS': '#ef4444',
};

const SECTION_TYPES = ['INTRO','VERSE 1','VERSE 2','PRE-CH','CHORUS','BRIDGE','OUTRO','INSTRUMENTAL','HOOK','FINAL CHORUS'];

const EDIT_MODES = [
  { id: 'replace', label: 'REPLACE SECTION', icon: Replace },
  { id: 'extend', label: 'EXTEND', icon: ArrowRight },
  { id: 'crop', label: 'CROP', icon: Crop },
  { id: 'remove', label: 'REMOVE', icon: Trash2 },
  { id: 'fadeout', label: 'FADE OUT', icon: Minimize2 },
];

function ColoredWaveform({ color, width = 200, height = 60, animated = false }) {
  const bars = Math.floor(width / 3);
  return (
    <svg width={width} height={height} aria-hidden="true" className="w-full h-full">
      {Array.from({ length: bars }).map((_, i) => {
        const h = 15 + Math.sin(i * 0.4) * 15 + Math.random() * 20;
        const y = (height - h) / 2;
        return (
          <rect
            key={i}
            x={i * 3}
            y={y}
            width={2}
            height={h}
            fill={color}
            opacity={0.85}
            rx={1}
            style={animated ? { animation: `beat-bar ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` } : {}}
          />
        );
      })}
    </svg>
  );
}

function SectionBlock({ section, isSelected, onSelect, onEdit, zoom = 1 }) {
  const color = SECTION_COLORS[section.type] || '#6b7280';
  const width = Math.max(60, section.duration * zoom * 16);
  return (
    <div
      role="button"
      aria-label={`${section.type} section`}
      aria-pressed={isSelected}
      tabIndex={0}
      onClick={() => onSelect(section)}
      onKeyDown={e => e.key === 'Enter' && onSelect(section)}
      className={cn(
        'relative flex-shrink-0 rounded-md overflow-hidden cursor-pointer transition-all select-none',
        isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-105 z-10' : 'hover:brightness-110'
      )}
      style={{ width, height: 72, background: color + '33', border: `1.5px solid ${color}` }}
    >
      <div className="absolute top-0 left-0 right-0 px-1.5 py-0.5 flex items-center gap-1" style={{ background: color + 'dd' }}>
        <span className="text-[9px] font-extrabold text-black truncate leading-none">{section.type}</span>
      </div>
      <div className="absolute inset-0 top-5 px-0.5">
        <ColoredWaveform color={color} height={48} animated={isSelected} />
      </div>
    </div>
  );
}

export default function SongEditorPage() {
  const [user, setUser] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [editMode, setEditMode] = useState('replace');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bpm, setBpm] = useState(68);
  const [zoom, setZoom] = useState(1);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(15);
  const [lyrics, setLyrics] = useState('');
  const [styles, setStyles] = useState('');
  const [excludeStyles, setExcludeStyles] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLearn, setShowLearn] = useState(true);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const audioRef = useRef(null);
  const timelineRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: tracks = [] } = useQuery({
    queryKey: ['editor-tracks'],
    queryFn: () => base44.entities.Track.filter({ status: 'ready' }, '-created_date', 30),
    enabled: !!user,
  });

  // Build sections from track lyrics
  const sections = React.useMemo(() => {
    if (!selectedTrack) return [];
    const raw = selectedTrack.lyrics || '';
    const lines = raw.split('\n');
    const result = [];
    let current = null;
    let time = 0;
    lines.forEach(line => {
      const headerMatch = line.match(/^\[(.+?)\]/);
      if (headerMatch) {
        if (current) result.push(current);
        const type = headerMatch[1].toUpperCase();
        current = { id: result.length, type, lines: [], duration: 8, startTime: time };
        time += 8;
      } else if (current && line.trim()) {
        current.lines.push(line.trim());
      }
    });
    if (current) result.push(current);
    if (result.length === 0 && selectedTrack) {
      ['INTRO','VERSE 1','PRE-CH','CHORUS','VERSE 2','CHORUS - x2','BRIDGE','FINAL CHORUS','OUTRO'].forEach((t, i) => {
        result.push({ id: i, type: t, lines: [], duration: 8, startTime: i * 8 });
      });
    }
    return result;
  }, [selectedTrack]);

  const totalDuration = sections.reduce((s, sec) => s + sec.duration, 0);

  useEffect(() => {
    if (selectedSection) {
      setLyrics(selectedSection.lines.join('\n'));
      setSelectionStart(selectedSection.startTime);
      setSelectionEnd(selectedSection.startTime + selectedSection.duration);
    }
  }, [selectedSection]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(2);
    return `${String(m).padStart(2,'0')}:${String(Math.floor(sec)).padStart(2,'0')}.${String(Math.round((sec % 1) * 100)).padStart(2,'0')}`;
  };

  const handleGenerate = async (action) => {
    if (!selectedTrack) { toast.error('Select a track first'); return; }
    if (!selectedSection) { toast.error('Select a section to edit'); return; }
    setIsGenerating(true);
    haptics.medium();
    try {
      if (action === 'replace') {
        const res = await base44.functions.invoke('replaceSection', {
          trackId: selectedTrack.external_audio_id || selectedTrack.task_id,
          prompt: lyrics,
          style: styles,
          startTime: selectionStart,
          endTime: selectionEnd,
        });
        if (res.data?.success) {
          toast.success('Replacement generated! Check back shortly.');
          queryClient.invalidateQueries({ queryKey: ['editor-tracks'] });
        } else throw new Error(res.data?.error || 'Failed');
      } else if (action === 'extend') {
        const res = await base44.functions.invoke('extendMusic', {
          taskId: selectedTrack.task_id,
          audioId: selectedTrack.external_audio_id,
          prompt: lyrics,
          style: styles,
          continueAt: selectionStart,
        });
        if (res.data?.success) {
          toast.success('Extension queued!');
          queryClient.invalidateQueries({ queryKey: ['editor-tracks'] });
        } else throw new Error(res.data?.error || 'Failed');
      }
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const modeConfig = {
    replace: { label: 'Generate Replacements', color: '#f97316', hint: 'Drag the edges of the selection to pick a section of time to replace.' },
    extend: { label: 'Generate Extensions', color: '#f97316', hint: 'Drag the start of the selection to pick a point to extend from.' },
    crop: { label: 'Crop', color: '#f97316', hint: 'Drag the edges of the selection to pick a section of time to keep.' },
    remove: { label: 'Remove', color: '#ef4444', hint: 'Drag the edges of the selection to pick a section of time to delete.' },
    fadeout: { label: 'Fade Out', color: '#f97316', hint: 'Drag the start of the selection to pick a point to fade out from.' },
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#0d0d0d', color: '#fff' }} role="main" aria-label="Song Editor">
      {/* TOP BAR */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#111' }} role="banner">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-1.5 rounded hover:bg-white/10 transition-colors" aria-label="Back">
            <X className="h-4 w-4 text-white/50" />
          </button>
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-white/60" />
            <span className="text-sm font-bold text-white">Song Editor</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#22c55e22', color: '#22c55e' }}>BETA</span>
          </div>
          <button className="text-xs px-2 py-1 rounded text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">Legacy Editor</button>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs px-3 py-1.5 rounded-lg text-white/60 hover:bg-white/5 border border-white/10 transition-colors">Reset All</button>
          <select
            value={selectedTrack?.id || ''}
            onChange={e => {
              const t = tracks.find(x => x.id === e.target.value);
              setSelectedTrack(t || null);
              setSelectedSection(null);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white bg-white/5 cursor-pointer"
            aria-label="Select track"
          >
            <option value="">My Workspace</option>
            {tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 flex items-center gap-1.5 transition-colors">
            <Save className="h-3 w-3" /> Save as New Song
          </button>
          <button className="text-xs px-3 py-1.5 rounded-lg text-white/60 hover:bg-white/5 border border-white/10 transition-colors">Get Stems</button>
          <button className="text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff' }}>
            <Wand2 className="h-3 w-3" /> Edit in Studio
          </button>
        </div>
      </header>

      {/* EDIT MODE TABS (only show when track selected) */}
      {selectedTrack && (
        <div className="flex-shrink-0 flex items-center gap-0 px-4 py-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#111' }} role="tablist" aria-label="Edit modes">
          <button className="px-3 py-2 text-xs font-semibold text-white/50 border-b-2 border-transparent hover:text-white transition-colors mr-2">Edit</button>
          {EDIT_MODES.map(m => (
            <button
              key={m.id}
              role="tab"
              aria-selected={editMode === m.id}
              onClick={() => { setEditMode(m.id); haptics.selection(); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all',
                editMode === m.id
                  ? 'text-white border-white'
                  : 'text-white/40 border-transparent hover:text-white/70'
              )}
            >
              <m.icon className="h-3 w-3" />
              {m.label}
            </button>
          ))}
          <div className="flex-1" />
          <button className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff' }}>
            Edit in Studio <X className="inline h-3 w-3 ml-1" />
          </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT PANEL — Lyrics & Styles (show when in replace/extend mode) */}
        {selectedTrack && (editMode === 'replace' || editMode === 'extend') && (
          <div className="w-52 flex-shrink-0 flex flex-col border-r overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#0f0f0f' }}>
            {/* LYRICS */}
            <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold tracking-widest text-white/40 uppercase">LYRICS</span>
                <div className="flex gap-1">
                  <button className="p-0.5 rounded hover:bg-white/10 text-white/30"><RotateCcw className="h-3 w-3" /></button>
                  <button className="p-0.5 rounded hover:bg-white/10 text-white/30"><RefreshCw className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                {sections.map(sec => (
                  <div key={sec.id}>
                    <button
                      onClick={() => { setSelectedSection(sec); haptics.light(); }}
                      className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-black mb-1"
                      style={{ background: SECTION_COLORS[sec.type] || '#6b7280' }}
                      aria-label={`Select ${sec.type}`}
                    >
                      {sec.type}
                    </button>
                    {sec.lines.slice(0, 3).map((l, i) => (
                      <p key={i} className="text-white/50 text-[10px] leading-4 pl-1">{l}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            {/* STYLES */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold tracking-widest text-white/40 uppercase">STYLES</span>
                <button className="p-0.5 rounded hover:bg-white/10 text-white/30"><Plus className="h-3 w-3" /></button>
              </div>
              <textarea
                value={styles}
                onChange={e => setStyles(e.target.value)}
                placeholder="Style tags..."
                rows={4}
                className="w-full text-[10px] rounded-lg p-2 resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                aria-label="Style tags"
              />
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold tracking-widest text-white/30 uppercase">Exclude Styles</span>
                  <ChevronDown className="h-3 w-3 text-white/30" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CENTER — Learn tips + Timeline */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Learn panel */}
          {!selectedTrack && showLearn && (
            <div className="flex-shrink-0 mx-4 mt-4 mb-2 rounded-xl p-4 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-white/40" />
                  <span className="text-xs font-bold text-white/50">Learn</span>
                </div>
                <button onClick={() => setShowLearn(false)} className="text-xs text-white/30 hover:text-white/60 transition-colors">Hide Tips</button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {[
                  { label: 'Change lyrics or\nmelodies', color: '#ec4899' },
                  { label: 'Add a new\nsection', color: '#8b5cf6' },
                  { label: 'Extend your\nsong', color: '#22c55e' },
                  { label: 'Rearrange your\nsong', color: '#a78bfa' },
                  { label: 'Stems', color: '#06b6d4' },
                ].map((tip, i) => (
                  <div key={i} className="flex-shrink-0 w-24 h-16 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:brightness-110 transition-all" style={{ background: tip.color + '22', border: `1px solid ${tip.color}44` }}>
                    <div className="w-8 h-3 rounded-sm" style={{ background: tip.color + '88' }} />
                    <p className="text-[9px] text-center text-white/60 whitespace-pre-line leading-3">{tip.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SELECT TRACK CTA */}
          {!selectedTrack && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <Music className="h-16 w-16 text-white/10" />
              <p className="text-white/40 text-sm">Select a track from the top bar to start editing</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {tracks.slice(0, 6).map(t => (
                  <button key={t.id} onClick={() => setSelectedTrack(t)} className="px-3 py-1.5 rounded-full text-xs text-white/60 hover:text-white transition-colors border border-white/10 hover:border-white/25">
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WAVEFORM TIMELINE */}
          {selectedTrack && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Hint bar */}
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <span>{modeConfig[editMode]?.hint}</span>
                <div className="flex items-center gap-3">
                  {(editMode === 'crop' || editMode === 'remove' || editMode === 'replace') && (
                    <span className="font-mono text-white/50">
                      {formatTime(selectionStart)} — {formatTime(selectionEnd)}
                    </span>
                  )}
                  {editMode === 'extend' || editMode === 'fadeout' ? (
                    <span className="font-mono text-white/50">From {formatTime(selectionEnd)}</span>
                  ) : null}
                  <button
                    onClick={() => handleGenerate(editMode)}
                    disabled={isGenerating}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 transition-all"
                    style={{ background: '#f97316' }}
                    aria-label={modeConfig[editMode]?.label}
                  >
                    {isGenerating ? 'Working…' : modeConfig[editMode]?.label}
                  </button>
                </div>
              </div>

              {/* Sections timeline */}
              <div className="flex-1 overflow-hidden flex flex-col justify-end pb-2">
                <div className="relative" style={{ height: 90 }}>
                  {/* Time ruler */}
                  <div className="absolute top-0 left-0 right-0 h-6 flex items-end px-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="flex-1 text-[9px] text-white/20 border-l border-white/10 pl-0.5">
                        {String(Math.floor(i * totalDuration / 12 / 60)).padStart(2,'0')}:{String(Math.floor((i * totalDuration / 12) % 60)).padStart(2,'0')}
                      </div>
                    ))}
                  </div>
                  {/* Scrollable sections */}
                  <div ref={timelineRef} className="absolute bottom-0 left-0 right-0 h-16 overflow-x-auto flex items-center gap-0.5 px-2 pb-1" style={{ top: 28 }}>
                    {sections.map(sec => (
                      <SectionBlock
                        key={sec.id}
                        section={sec}
                        isSelected={selectedSection?.id === sec.id}
                        onSelect={setSelectedSection}
                        zoom={zoom}
                      />
                    ))}
                  </div>
                  {/* Playhead */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
                    style={{ left: `${(currentTime / (totalDuration || 1)) * 100}%`, background: '#f97316', boxShadow: '0 0 6px #f97316' }}
                  >
                    <div className="w-3 h-3 rounded-full -ml-1 -mt-0.5" style={{ background: '#f97316', boxShadow: '0 0 8px #f97316' }} />
                  </div>
                </div>

                {/* Secondary waveform row (full track) */}
                <div className="mx-2 h-12 rounded-lg overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="absolute inset-0">
                    <svg width="100%" height="100%" aria-hidden="true" preserveAspectRatio="none">
                      {Array.from({ length: 300 }).map((_, i) => {
                        const h = 6 + Math.sin(i * 0.3) * 8 + Math.sin(i * 0.7) * 6;
                        const y = (48 - h) / 2;
                        const sec = sections[Math.floor(i / 300 * sections.length)];
                        const c = sec ? (SECTION_COLORS[sec.type] || '#6b7280') : '#6b7280';
                        return <rect key={i} x={`${i/3}%`} y={y} width="0.25%" height={h} fill={c} opacity={0.7} rx={0.5} />;
                      })}
                    </svg>
                  </div>
                  {/* Selection overlay */}
                  <div
                    className="absolute top-0 bottom-0 bg-white/10 border-x-2 border-white/60"
                    style={{
                      left: `${(selectionStart / (totalDuration || 1)) * 100}%`,
                      width: `${((selectionEnd - selectionStart) / (totalDuration || 1)) * 100}%`,
                    }}
                  />
                  {/* Playhead on minimap */}
                  <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${(currentTime/(totalDuration||1))*100}%`, background: '#f97316' }} />
                </div>
              </div>
            </div>
          )}

          {/* RIGHT PANEL — Styles (for extend/replace modes shown inline) */}
          {selectedTrack && (editMode === 'replace' || editMode === 'extend') && (
            <div className="flex-shrink-0 grid grid-cols-3 gap-0 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#0f0f0f', height: 220, maxHeight: 220 }}>
              {/* Styles column */}
              <div className="p-3 border-r overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <span className="text-[10px] font-extrabold tracking-widest text-white/40 uppercase block mb-2">STYLES</span>
                <textarea
                  value={styles}
                  onChange={e => setStyles(e.target.value)}
                  placeholder="Dark Blues Rock / Gritty Pop / cinematic, stoic, fearless energy..."
                  className="w-full h-24 text-[10px] rounded-lg p-2 resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
                  aria-label="Style description"
                />
                <div className="mt-2">
                  <span className="text-[9px] text-white/30 uppercase font-bold block mb-1">EXCLUDE STYLES</span>
                  <textarea
                    value={excludeStyles}
                    onChange={e => setExcludeStyles(e.target.value)}
                    placeholder="Describe styles to avoid..."
                    className="w-full h-10 text-[10px] rounded-lg p-2 resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}
                    aria-label="Excluded styles"
                  />
                </div>
              </div>
              {/* Edit lyrics column (for replace mode) */}
              {editMode === 'replace' && (
                <div className="p-3 border-r overflow-y-auto col-span-1" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-[10px] font-extrabold tracking-widest text-white/40 uppercase block mb-2">
                    {selectedSection ? `EDIT: ${selectedSection.type}` : 'SELECT A SECTION'}
                  </span>
                  <textarea
                    value={lyrics}
                    onChange={e => setLyrics(e.target.value)}
                    placeholder="Edit lyrics for selected section..."
                    className="w-full h-32 text-[10px] rounded-lg p-2 resize-none"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
                    aria-label="Section lyrics editor"
                  />
                </div>
              )}
              {/* Edits/history column */}
              <div className="p-3 overflow-y-auto col-span-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold tracking-widest text-white/40 uppercase">EDITS</span>
                  <button className="p-0.5 rounded hover:bg-white/10 text-white/20"><Settings className="h-3 w-3" /></button>
                </div>
                <div className="flex flex-col items-center justify-center h-24 text-center">
                  <p className="text-[10px] text-white/20">No edits yet</p>
                  <p className="text-[9px] text-white/15 mt-1">Extensions and replacements will appear here</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM TRANSPORT */}
      <footer className="flex-shrink-0 flex items-center gap-4 px-4 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#0f0f0f' }} role="contentinfo">
        {/* Track info */}
        <div className="flex items-center gap-2 w-40">
          {selectedTrack ? (
            <>
              <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                {selectedTrack.cover_image_url
                  ? <img src={selectedTrack.cover_image_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1a2e' }}><Music className="h-4 w-4 text-white/30" /></div>
                }
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">{selectedTrack.title}</p>
                <p className="text-[9px] text-white/30 truncate">{selectedTrack.created_by?.split('@')[0]}</p>
              </div>
            </>
          ) : (
            <span className="text-[11px] text-white/30">No track loaded</span>
          )}
        </div>
        {/* Playback controls */}
        <div className="flex items-center gap-2">
          <button className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors" aria-label="Skip back"><SkipBack className="h-4 w-4" /></button>
          <button
            className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors"
            aria-label="Step back"
            onClick={() => setCurrentTime(t => Math.max(0, t - 5))}
          ><RefreshCw className="h-4 w-4" /></button>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            onClick={() => setIsPlaying(p => !p)}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
          </button>
          <button className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors" aria-label="Fast forward"><FastForward className="h-4 w-4" /></button>
          <button className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors" aria-label="Skip forward"><SkipForward className="h-4 w-4" /></button>
        </div>
        {/* Time */}
        <div className="flex items-center gap-2 font-mono text-sm text-white/70">
          <span>{formatTime(currentTime)}</span>
        </div>
        {/* BPM */}
        <div className="flex items-center gap-1 ml-auto">
          <Settings className="h-3 w-3 text-white/20" />
          <span className="text-xs text-white/40 font-mono">{bpm}</span>
          <input type="range" min={40} max={200} value={bpm} onChange={e => setBpm(+e.target.value)} className="w-16 h-1 accent-white" aria-label="BPM" />
        </div>
        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-1 rounded hover:bg-white/10 text-white/30 transition-colors" aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1 rounded hover:bg-white/10 text-white/30 transition-colors" aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button>
          <button className="p-1 rounded hover:bg-white/10 text-white/30 transition-colors" aria-label="Fullscreen"><Maximize2 className="h-3.5 w-3.5" /></button>
          <button className="p-1 rounded hover:bg-white/10 text-white/30 transition-colors" aria-label="Minimize"><Minimize2 className="h-3.5 w-3.5" /></button>
        </div>
      </footer>
    </div>
  );
}