// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward,
  RefreshCw, Save, ChevronDown, Plus, X,
  Maximize2, Minimize2, Settings, Layers, Music, ZoomIn, ZoomOut,
  ArrowRight, Wand2, Replace, Trash2, Crop, Volume2, BarChart3, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

const SECTION_COLORS = {
  INTRO: '#00ffd0',
  'VERSE 1': '#ff4d9d',
  'VERSE 2': '#ff4d9d',
  'PRE-CH': '#ff9f0a',
  CHORUS: '#ff9f0a',
  'CHORUS - x2': '#ff9f0a',
  BRIDGE: '#facc15',
  OUTRO: '#9eff00',
  INSTRUMENTAL: '#00d4ff',
  HOOK: '#b388ff',
  'FINAL CHORUS': '#ff4d4d',
};

const EDIT_MODES = [
  { id: 'replace', label: 'REPLACE SECTION', icon: Replace },
  { id: 'extend', label: 'EXTEND', icon: ArrowRight },
  { id: 'crop', label: 'CROP', icon: Crop },
  { id: 'remove', label: 'REMOVE', icon: Trash2 },
  { id: 'fadeout', label: 'FADE OUT', icon: Minimize2 },
  { id: 'mastering', label: 'MASTERING', icon: Volume2 },
];

function ColoredWaveform({ color, width = 200, height = 60, animated = false, contrast = 1.24 }) {
  const bars = Math.floor(width / 3);
  return (
    <svg width={width} height={height} aria-hidden="true" className="w-full h-full">
      {Array.from({ length: bars }).map((_, i) => {
        const h = 18 + Math.sin(i * 0.4) * 16 + Math.random() * 18;
        const y = (height - h) / 2;
        return (
          <rect
            key={i}
            x={i * 3}
            y={y}
            width={2}
            height={h}
            fill={color}
            opacity={Math.min(1, 0.88 * contrast)}
            rx={1}
            style={animated ? { animation: `beat-bar ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` } : {}}
          />
        );
      })}
    </svg>
  );
}

function SectionBlock({ section, isSelected, onSelect, zoom = 1 }) {
  const color = SECTION_COLORS[section.type] || '#9ca3af';
  const width = Math.max(80, section.duration * zoom * 20);
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
        isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-105 z-10' : 'hover:brightness-125'
      )}
      style={{ width, height: 72, background: `${color}2e`, border: `1.5px solid ${color}` }}
    >
      <div className="absolute top-0 left-0 right-0 px-1.5 py-0.5 flex items-center gap-1" style={{ background: `${color}ef` }}>
        <span className="text-[9px] font-extrabold text-black truncate leading-none">{section.type}</span>
      </div>
      <div className="absolute inset-0 top-5 px-0.5">
        <ColoredWaveform color={color} height={48} animated={isSelected} />
      </div>
    </div>
  );
}

function SplitterHandle({ label, horizontal = false, onPointerDown }) {
  if (horizontal) {
    return <div role="separator" aria-label={label} onPointerDown={onPointerDown} className="h-2 cursor-row-resize bg-white/10 hover:bg-white/25 transition-colors" />;
  }
  return <div role="separator" aria-label={label} onPointerDown={onPointerDown} className="w-2 cursor-col-resize bg-white/10 hover:bg-white/25 transition-colors" />;
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
  const [masteredUrl, setMasteredUrl] = useState(null);
  const [masterLoudness, setMasterLoudness] = useState(-14);
  const [masterStereo, setMasterStereo] = useState(95);
  const [masterBass, setMasterBass] = useState(1.5);
  const [masterHighs, setMasterHighs] = useState(2);
  const [masterCompression, setMasterCompression] = useState(62);
  const [showLearn, setShowLearn] = useState(true);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(260);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(220);
  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [stylePanelWidth, setStylePanelWidth] = useState(34);
  const [lyricsPanelWidth, setLyricsPanelWidth] = useState(33);

  const audioRef = useRef(null);
  const editorRootRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: tracks = [] } = useQuery({
    queryKey: ['editor-tracks', user?.email],
    queryFn: () => base44.entities.Track.filter({ created_by: user?.email, status: 'ready' }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['editor-versions', selectedTrack?.id],
    queryFn: () => base44.entities.TrackVersion.filter({ parent_track_id: selectedTrack?.id }, '-created_date', 15),
    enabled: !!selectedTrack?.id,
  });

  const sections = React.useMemo(() => {
    if (!selectedTrack) return [];
    const raw = selectedTrack.lyrics || '';
    const lines = raw.split('\n');
    const result = [];
    let current = null;
    let time = 0;
    lines.forEach((line) => {
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
      ['INTRO', 'VERSE 1', 'PRE-CH', 'CHORUS', 'VERSE 2', 'CHORUS - x2', 'BRIDGE', 'FINAL CHORUS', 'OUTRO'].forEach((t, i) => {
        result.push({ id: i, type: t, lines: [], duration: 8, startTime: i * 8 });
      });
    }
    return result;
  }, [selectedTrack]);

  const totalDuration = Math.max(1, sections.reduce((s, sec) => s + sec.duration, 0));

  useEffect(() => {
    if (selectedTrack) {
      setStyles(selectedTrack.style || selectedTrack.tags || '');
      setExcludeStyles('');
      setMasteredUrl(null);
    }
  }, [selectedTrack]);

  useEffect(() => {
    if (selectedSection) {
      setLyrics(selectedSection.lines.join('\n'));
      setSelectionStart(selectedSection.startTime);
      setSelectionEnd(selectedSection.startTime + selectedSection.duration);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.2;
        return next >= totalDuration ? 0 : next;
      });
    }, 200);
    return () => clearInterval(timer);
  }, [isPlaying, totalDuration]);

  useEffect(() => {
    if (audioRef.current && selectedTrack) {
      audioRef.current.src = masteredUrl || selectedTrack.stream_audio_url || selectedTrack.audio_url || '';
    }
  }, [selectedTrack, masteredUrl]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(2);
    return `${String(m).padStart(2, '0')}:${String(Math.floor(sec)).padStart(2, '0')}.${String(Math.round((sec % 1) * 100)).padStart(2, '0')}`;
  };

  const pollTaskStatus = async (taskId, label = 'Generation') => {
    let attempts = 0;
    while (attempts < 60) {
      attempts += 1;
      const res = await base44.functions.invoke('checkMusicStatus', { taskId });
      if (res.data?.success) {
        const generated = res.data.tracks || [];
        if (generated.length > 0 && generated.every((t) => t.status === 'ready')) {
          toast.success(`${label} complete`);
          queryClient.invalidateQueries({ queryKey: ['editor-tracks'] });
          return;
        }
        if (generated.some((t) => t.status === 'failed')) {
          throw new Error(`${label} failed`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error(`${label} timed out`);
  };

  const createVersionEntry = async (description, metadata = {}) => {
    if (!selectedTrack) return;
    await base44.entities.TrackVersion.create({
      track_id: selectedTrack.id,
      parent_track_id: selectedTrack.parent_track_id || selectedTrack.id,
      changes_description: description,
      edit_type: 'other',
      edited_by: user?.email,
      edit_metadata: JSON.stringify(metadata),
    });
    queryClient.invalidateQueries({ queryKey: ['editor-versions', selectedTrack.id] });
  };

  const handleGenerate = async (action) => {
    if (!selectedTrack) { toast.error('Select a track first'); return; }
    if (action !== 'mastering' && !selectedSection && action !== 'regen_full') { toast.error('Select a section to edit'); return; }

    setIsGenerating(true);
    haptics.medium();

    try {
      if (action === 'replace') {
        if (!selectedTrack.task_id || !selectedTrack.external_audio_id) throw new Error('Track is missing Suno IDs for replacement.');
        if (!lyrics.trim()) throw new Error('Add lyrics for the selected section.');
        const res = await base44.functions.invoke('replaceSection', {
          taskId: selectedTrack.task_id,
          audioId: selectedTrack.external_audio_id,
          prompt: lyrics,
          tags: styles || selectedTrack.style || 'pop',
          title: selectedTrack.title,
          infillStartS: selectionStart,
          infillEndS: selectionEnd,
          negativeTags: excludeStyles,
          fullLyrics: selectedTrack.lyrics,
        });
        if (!res.data?.success) throw new Error(res.data?.error || 'Replacement failed');
        toast.success('Replacement queued');
        await createVersionEntry(`Replace ${selectedSection.type}`, { action, selectionStart, selectionEnd, lyrics, styles, taskId: res.data.taskId });
        await pollTaskStatus(res.data.taskId, 'Section replacement');
      } else if (action === 'extend') {
        if (!selectedTrack.external_audio_id) throw new Error('Track is missing external audio ID for extension.');
        const res = await base44.functions.invoke('extendMusic', {
          audioId: selectedTrack.external_audio_id,
          prompt: lyrics || selectedTrack.prompt || 'Continue with dynamic energy',
          style: styles || selectedTrack.style || 'Pop',
          title: selectedTrack.title,
          continueAt: selectionEnd,
          negativeTags: excludeStyles,
        });
        if (!res.data?.success) throw new Error(res.data?.error || 'Extension failed');
        toast.success('Extension queued');
        await createVersionEntry(`Extend from ${formatTime(selectionEnd)}`, { action, selectionEnd, prompt: lyrics, styles, taskId: res.data.taskId });
        await pollTaskStatus(res.data.taskId, 'Extension');
      } else if (action === 'regen_full') {
        const fullLyrics = selectedTrack.lyrics?.replace(/\[(.+?)\]([\s\S]*?)(?=\n\[|$)/g, (block, sectionName) => {
          if (!selectedSection || sectionName.toUpperCase() !== selectedSection.type) return block;
          return `[${sectionName}]\n${lyrics.trim()}`;
        }) || lyrics;

        const res = await base44.functions.invoke('generateMusic', {
          mode: 'custom',
          model: 'V5',
          customMode: true,
          instrumental: false,
          style: styles || selectedTrack.style || 'Pop',
          prompt: fullLyrics,
          title: `${selectedTrack.title} - Regenerated`,
          ...(excludeStyles.trim() && { negativeTags: excludeStyles.trim() }),
        });
        if (!res.data?.success) throw new Error(res.data?.error || 'Full regeneration failed');
        toast.success('Full song regeneration started');
        await createVersionEntry('Regenerated full song with edited lyrics', { action, style: styles, taskId: res.data.taskId });
        await pollTaskStatus(res.data.taskId, 'Full song regeneration');
      } else if (action === 'mastering') {
        const res = await base44.functions.invoke('masterAudio', {
          trackId: selectedTrack.id,
          audioUrl: selectedTrack.audio_url || selectedTrack.stream_audio_url,
          targetLufs: masterLoudness,
          loudnessTarget: masterLoudness,
          stereoWidth: masterStereo,
          bassBoost: masterBass,
          highBoost: masterHighs,
          compression: masterCompression,
          eqBands: [
            { freq: '100Hz', gain: masterBass },
            { freq: '4kHz', gain: masterHighs / 2 },
            { freq: '10kHz', gain: masterHighs },
          ],
        });
        if (!res.data?.success) throw new Error(res.data?.error || 'Mastering failed');
        setMasteredUrl(res.data.processedUrl || selectedTrack.audio_url || selectedTrack.stream_audio_url);
        toast.success('Mastering applied');
        await createVersionEntry('Applied mastering profile', { action, masterLoudness, masterStereo, masterBass, masterHighs, masterCompression });
        queryClient.invalidateQueries({ queryKey: ['editor-tracks'] });
      } else if (['crop', 'remove', 'fadeout'].includes(action)) {
        await createVersionEntry(`${modeConfig[action].label}: ${formatTime(selectionStart)} to ${formatTime(selectionEnd)}`, {
          action,
          selectionStart,
          selectionEnd,
        });
        toast.success(`${modeConfig[action].label} saved to history`);
      }
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const modeConfig = {
    replace: { label: 'Generate Replacements', color: '#ff7a00', hint: 'Drag selection handles to pick exact replacement region.' },
    extend: { label: 'Generate Extensions', color: '#ff7a00', hint: 'Set extension point and generate continuation.' },
    crop: { label: 'Crop', color: '#ff7a00', hint: 'Select a range to preserve.' },
    remove: { label: 'Remove', color: '#ff3344', hint: 'Select a range to cut out.' },
    fadeout: { label: 'Fade Out', color: '#ff7a00', hint: 'Select where fade should begin.' },
    mastering: { label: 'Apply Mastering', color: '#a855f7', hint: 'Tune LUFS, stereo width, EQ, and compression.' },
  };

  const beginResize = useCallback((panel) => (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = leftPanelWidth;
    const startBottom = bottomPanelHeight;
    const startStyle = stylePanelWidth;
    const startLyrics = lyricsPanelWidth;

    const move = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (panel === 'left') {
        setLeftPanelWidth(Math.max(220, Math.min(420, startLeft + dx)));
      }
      if (panel === 'bottom') {
        setBottomPanelHeight(Math.max(160, Math.min(360, startBottom - dy)));
      }
      if (panel === 'style') {
        const next = Math.max(20, Math.min(60, startStyle + (dx / (editorRootRef.current?.offsetWidth || 1200)) * 100));
        const maxLyrics = 80 - next;
        setStylePanelWidth(next);
        setLyricsPanelWidth(Math.min(startLyrics, maxLyrics));
      }
      if (panel === 'lyrics') {
        const next = Math.max(20, Math.min(60, startLyrics + (dx / (editorRootRef.current?.offsetWidth || 1200)) * 100));
        const maxStyle = 80 - next;
        setLyricsPanelWidth(next);
        setStylePanelWidth(Math.min(startStyle, maxStyle));
      }
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [leftPanelWidth, bottomPanelHeight, stylePanelWidth, lyricsPanelWidth]);

  const beginSelectionDrag = (mode) => (event) => {
    if (!selectedTrack) return;
    event.preventDefault();
    const target = event.currentTarget.parentElement;
    const rect = target.getBoundingClientRect();

    const move = (moveEvent) => {
      const x = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
      const point = (x / rect.width) * totalDuration;

      if (mode === 'start') {
        setSelectionStart(Math.min(Math.max(0, point), selectionEnd - 1));
      } else if (mode === 'end') {
        setSelectionEnd(Math.max(point, selectionStart + 1));
      } else {
        const span = selectionEnd - selectionStart;
        const nextStart = Math.max(0, Math.min(totalDuration - span, point - span / 2));
        setSelectionStart(nextStart);
        setSelectionEnd(nextStart + span);
      }
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const applyDefaults = () => {
    if (!selectedTrack) return;
    setStyles(selectedTrack.style || selectedTrack.tags || '');
    setExcludeStyles('');
    setLyrics(selectedSection?.lines.join('\n') || selectedTrack.prompt || '');
    setSelectionStart(selectedSection?.startTime || 0);
    setSelectionEnd((selectedSection?.startTime || 0) + (selectedSection?.duration || 15));
    setMasterLoudness(-14);
    setMasterStereo(95);
    setMasterBass(1.5);
    setMasterHighs(2);
    setMasterCompression(62);
    toast.success('Editor reset for selected track');
  };

  const saveAsNewSong = async () => {
    if (!selectedTrack) { toast.error('Select a track first'); return; }
    try {
      const created = await base44.entities.Track.create({
        title: `${selectedTrack.title} - Edit`,
        prompt: selectedTrack.prompt || lyrics || 'Edited song',
        style: styles || selectedTrack.style || '',
        lyrics: selectedTrack.lyrics || lyrics,
        status: 'ready',
        parent_track_id: selectedTrack.id,
        is_instrumental: selectedTrack.is_instrumental,
        audio_url: masteredUrl || selectedTrack.audio_url,
        stream_audio_url: masteredUrl || selectedTrack.stream_audio_url,
        cover_image_url: selectedTrack.cover_image_url,
        tags: [selectedTrack.tags, 'edited'].filter(Boolean).join(','),
        modification_type: 'edited',
      });
      toast.success('Saved as a new song');
      queryClient.invalidateQueries({ queryKey: ['editor-tracks'] });
      setSelectedTrack(created);
    } catch (error) {
      toast.error(error.message || 'Failed to save song');
    }
  };

  const getStems = async () => {
    if (!selectedTrack) { toast.error('Select a track first'); return; }
    try {
      const url = selectedTrack.audio_url || selectedTrack.stream_audio_url;
      if (!url) throw new Error('Track has no audio URL.');
      const res = await base44.functions.invoke('separateVocals', { trackId: selectedTrack.id, audioUrl: url });
      if (!res.data?.success) throw new Error(res.data?.error || 'Stem separation failed');
      toast.success('Stem separation started');
    } catch (error) {
      toast.error(error.message || 'Failed to start stems');
    }
  };

  return (
    <div ref={editorRootRef} className="flex flex-col h-screen overflow-hidden" style={{ background: '#050505', color: '#fff', filter: 'contrast(1.24)' }} role="main" aria-label="Song Editor">
      <audio ref={audioRef} preload="none" />

      <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'linear-gradient(135deg,#050505,#0a0b12)' }} role="banner">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-1.5 rounded hover:bg-white/10 transition-colors" aria-label="Back">
            <X className="h-4 w-4 text-white/60" />
          </button>
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-white/70" />
            <span className="text-sm font-bold text-white">Song Editor</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#00ffd033', color: '#00ffd0' }}>LIVE</span>
          </div>
          <button onClick={() => toast.info('Legacy editor is not enabled in this build')} className="text-xs px-2 py-1 rounded text-white/50 hover:text-white/85 hover:bg-white/5 transition-colors">Legacy Editor</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={applyDefaults} className="text-xs px-3 py-1.5 rounded-lg text-white/70 hover:bg-white/10 border border-white/20 transition-colors">Reset All</button>
          <button onClick={() => setLeftPanelOpen((v) => !v)} className="text-xs px-2 py-1.5 rounded-lg border border-white/20 text-white/70 hover:bg-white/10">
            {leftPanelOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
          </button>
          <select
            value={selectedTrack?.id || ''}
            onChange={(e) => {
              const t = tracks.find((x) => x.id === e.target.value);
              setSelectedTrack(t || null);
              setSelectedSection(null);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white bg-white/5 cursor-pointer"
            aria-label="Select track"
          >
            <option value="">My Workspace</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button onClick={saveAsNewSong} className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/70 hover:bg-white/10 flex items-center gap-1.5 transition-colors">
            <Save className="h-3 w-3" /> Save as New Song
          </button>
          <button onClick={getStems} className="text-xs px-3 py-1.5 rounded-lg text-white/70 hover:bg-white/10 border border-white/20 transition-colors">Get Stems</button>
          <button onClick={() => { window.location.href = '/studio'; }} className="text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg,#00d4ff,#ff4d9d)', color: '#fff' }}>
            <Wand2 className="h-3 w-3" /> Edit in Studio
          </button>
        </div>
      </header>

      {selectedTrack && (
        <div className="flex-shrink-0 flex items-center gap-0 px-4 py-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)', background: '#07070a' }} role="tablist" aria-label="Edit modes">
          {EDIT_MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={editMode === m.id}
              onClick={() => { setEditMode(m.id); haptics.selection(); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all',
                editMode === m.id ? 'text-white border-white' : 'text-white/50 border-transparent hover:text-white/85'
              )}
            >
              <m.icon className="h-3 w-3" />
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {leftPanelOpen && selectedTrack && (editMode === 'replace' || editMode === 'extend') && (
          <div className="flex-shrink-0 flex flex-col border-r overflow-y-auto" style={{ width: leftPanelWidth, borderColor: 'rgba(255,255,255,0.1)', background: '#06070b' }}>
            <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold tracking-widest text-white/55 uppercase">LYRICS</span>
                <div className="flex gap-1">
                  <button onClick={() => setLyrics(selectedSection?.lines.join('\n') || '')} className="p-0.5 rounded hover:bg-white/10 text-white/40"><RotateCcw className="h-3 w-3" /></button>
                  <button onClick={() => handleGenerate('replace')} className="p-0.5 rounded hover:bg-white/10 text-white/40"><RefreshCw className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                {sections.map((sec) => (
                  <div key={sec.id}>
                    <button
                      onClick={() => { setSelectedSection(sec); haptics.light(); }}
                      className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-black mb-1"
                      style={{ background: SECTION_COLORS[sec.type] || '#9ca3af' }}
                      aria-label={`Select ${sec.type}`}
                    >
                      {sec.type}
                    </button>
                    {sec.lines.slice(0, 3).map((l, i) => (
                      <p key={i} className="text-white/60 text-[10px] leading-4 pl-1">{l}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold tracking-widest text-white/55 uppercase">STYLES</span>
                <button onClick={() => setStyles((v) => `${v}${v ? ', ' : ''}cinematic, punchy, clear vocals`)} className="p-0.5 rounded hover:bg-white/10 text-white/40"><Plus className="h-3 w-3" /></button>
              </div>
              <textarea
                value={styles}
                onChange={(e) => setStyles(e.target.value)}
                placeholder="Style tags..."
                rows={4}
                className="w-full text-[10px] rounded-lg p-2 resize-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#ffffff' }}
                aria-label="Style tags"
              />
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold tracking-widest text-white/45 uppercase">Exclude Styles</span>
                  <ChevronDown className="h-3 w-3 text-white/40" />
                </div>
                <textarea
                  value={excludeStyles}
                  onChange={(e) => setExcludeStyles(e.target.value)}
                  placeholder="Describe styles to avoid..."
                  rows={2}
                  className="w-full text-[10px] rounded-lg p-2 resize-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#ffffff' }}
                  aria-label="Excluded styles"
                />
              </div>
            </div>
          </div>
        )}

        {leftPanelOpen && selectedTrack && (editMode === 'replace' || editMode === 'extend') && (
          <SplitterHandle label="Resize left panel" onPointerDown={beginResize('left')} />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!selectedTrack && showLearn && (
            <div className="flex-shrink-0 mx-4 mt-4 mb-2 rounded-xl p-4 border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-white/50" />
                  <span className="text-xs font-bold text-white/70">Learn</span>
                </div>
                <button onClick={() => setShowLearn(false)} className="text-xs text-white/45 hover:text-white/80 transition-colors">Hide Tips</button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {[
                  { label: 'Change lyrics or\nmelodies', color: '#ff4d9d' },
                  { label: 'Add a new\nsection', color: '#b388ff' },
                  { label: 'Extend your\nsong', color: '#00ffd0' },
                  { label: 'Rearrange your\nsong', color: '#7dd3fc' },
                  { label: 'Stems', color: '#00d4ff' },
                ].map((tip, i) => (
                  <div key={i} className="flex-shrink-0 w-24 h-16 rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer hover:brightness-125 transition-all" style={{ background: `${tip.color}26`, border: `1px solid ${tip.color}66` }}>
                    <div className="w-8 h-3 rounded-sm" style={{ background: `${tip.color}aa` }} />
                    <p className="text-[9px] text-center text-white/80 whitespace-pre-line leading-3">{tip.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedTrack && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <Music className="h-16 w-16 text-white/20" />
              <p className="text-white/70 text-sm">Select a track from the top bar to start editing</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {tracks.slice(0, 6).map((t) => (
                  <button key={t.id} onClick={() => setSelectedTrack(t)} className="px-3 py-1.5 rounded-full text-xs text-white/80 hover:text-white transition-colors border border-white/30 hover:border-white/60">
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedTrack && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                <span>{modeConfig[editMode]?.hint}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-white/95">{formatTime(selectionStart)} — {formatTime(selectionEnd)}</span>
                  {(editMode === 'replace' || editMode === 'extend') && (
                    <button onClick={() => handleGenerate('regen_full')} disabled={isGenerating} className="px-3 py-1.5 rounded-lg text-xs font-bold text-black disabled:opacity-50" style={{ background: '#00ffd0' }}>
                      Regenerate Full Song
                    </button>
                  )}
                  <button
                    onClick={() => handleGenerate(editMode)}
                    disabled={isGenerating}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                    style={{ background: modeConfig[editMode]?.color || '#ff7a00' }}
                    aria-label={modeConfig[editMode]?.label}
                  >
                    {isGenerating ? 'Working…' : modeConfig[editMode]?.label}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col justify-end pb-2">
                <div className="relative" style={{ height: 100 }}>
                  <div className="absolute top-0 left-0 right-0 h-6 flex items-end px-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="flex-1 text-[9px] text-white/60 border-l border-white/20 pl-0.5">
                        {String(Math.floor(i * totalDuration / 12 / 60)).padStart(2, '0')}:{String(Math.floor((i * totalDuration / 12) % 60)).padStart(2, '0')}
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-16 overflow-x-auto flex items-center gap-0.5 px-2 pb-1" style={{ top: 30 }}>
                    {sections.map((sec) => (
                      <SectionBlock
                        key={sec.id}
                        section={sec}
                        isSelected={selectedSection?.id === sec.id}
                        onSelect={setSelectedSection}
                        zoom={zoom}
                      />
                    ))}
                  </div>
                  <div className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none" style={{ left: `${(currentTime / totalDuration) * 100}%`, background: '#00ffd0', boxShadow: '0 0 10px #00ffd0' }}>
                    <div className="w-3 h-3 rounded-full -ml-1 -mt-0.5" style={{ background: '#00ffd0', boxShadow: '0 0 10px #00ffd0' }} />
                  </div>
                </div>

                <div className="mx-2 h-12 rounded-lg overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <div className="absolute inset-0">
                    <svg width="100%" height="100%" aria-hidden="true" preserveAspectRatio="none">
                      {Array.from({ length: 300 }).map((_, i) => {
                        const h = 7 + Math.sin(i * 0.3) * 10 + Math.sin(i * 0.7) * 7;
                        const y = (48 - h) / 2;
                        const sec = sections[Math.floor((i / 300) * sections.length)];
                        const c = sec ? (SECTION_COLORS[sec.type] || '#9ca3af') : '#9ca3af';
                        return <rect key={i} x={`${i / 3}%`} y={y} width="0.25%" height={h} fill={c} opacity={0.9} rx={0.5} />;
                      })}
                    </svg>
                  </div>
                  <div
                    className="absolute top-0 bottom-0 bg-white/15 border-x-2 border-white/95 cursor-grab"
                    style={{ left: `${(selectionStart / totalDuration) * 100}%`, width: `${((selectionEnd - selectionStart) / totalDuration) * 100}%` }}
                    onPointerDown={beginSelectionDrag('window')}
                  />
                  <div className="absolute top-0 bottom-0 w-2 bg-cyan-300/90 cursor-ew-resize" style={{ left: `calc(${(selectionStart / totalDuration) * 100}% - 4px)` }} onPointerDown={beginSelectionDrag('start')} />
                  <div className="absolute top-0 bottom-0 w-2 bg-cyan-300/90 cursor-ew-resize" style={{ left: `calc(${(selectionEnd / totalDuration) * 100}% - 4px)` }} onPointerDown={beginSelectionDrag('end')} />
                  <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${(currentTime / totalDuration) * 100}%`, background: '#00ffd0' }} />
                </div>
              </div>
            </div>
          )}

          {selectedTrack && editMode === 'mastering' && (
            <div className="flex-shrink-0 border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'linear-gradient(180deg,#05050a,#050505)' }} aria-label="Mastering controls">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3">
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold tracking-widest text-white/80 uppercase flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5 text-cyan-300" />
                      Mastering Visualizer
                    </h3>
                    <span className="text-[10px] text-white/65">{masteredUrl ? 'Master ready' : 'Live preview'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ label: 'Original', color: '#ff4d9d', boost: 0 }, { label: 'Mastered', color: '#00ffd0', boost: masteredUrl ? 12 : 6 }].map((lane) => (
                      <div key={lane.label} className="h-24 rounded-lg overflow-hidden relative" style={{ background: `${lane.color}15`, border: `1px solid ${lane.color}66` }}>
                        <div className="absolute top-2 left-2 text-[10px] font-bold text-white/80">{lane.label}</div>
                        <svg width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
                          {Array.from({ length: 90 }).map((_, i) => {
                            const h = 14 + Math.abs(Math.sin(i * 0.28)) * 48 + (i % 7) * 2 + lane.boost;
                            return <rect key={i} x={`${i * 1.12}%`} y={`${50 - h / 2}%`} width="0.68%" height={`${h}%`} rx="2" fill={lane.color} opacity={0.42 + (i % 5) * 0.09} />;
                          })}
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>
                  {[{ label: 'Loudness LUFS', value: masterLoudness, set: setMasterLoudness, min: -24, max: -6, unit: 'dB' }, { label: 'Stereo Width', value: masterStereo, set: setMasterStereo, min: 0, max: 150, unit: '%' }, { label: 'Bass EQ', value: masterBass, set: setMasterBass, min: -6, max: 6, unit: 'dB' }, { label: 'Air EQ', value: masterHighs, set: setMasterHighs, min: -6, max: 6, unit: 'dB' }, { label: 'Compression', value: masterCompression, set: setMasterCompression, min: 0, max: 100, unit: '%' }].map((ctrl) => (
                    <label key={ctrl.label} className="grid grid-cols-[92px_1fr_50px] items-center gap-2 text-[10px] text-white/70">
                      <span>{ctrl.label}</span>
                      <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.unit === '%' ? 1 : 0.5} value={ctrl.value} onChange={(event) => ctrl.set(Number(event.target.value))} className="w-full accent-cyan-300" aria-label={ctrl.label} />
                      <span className="font-mono text-white text-right">{ctrl.value}{ctrl.unit}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedTrack && (editMode === 'replace' || editMode === 'extend') && showBottomPanel && (
            <>
              <SplitterHandle label="Resize bottom edit panel" horizontal onPointerDown={beginResize('bottom')} />
              <div className="flex-shrink-0 flex border-t" style={{ borderColor: 'rgba(255,255,255,0.12)', background: '#07080f', height: bottomPanelHeight, maxHeight: 420 }}>
                <div className="p-3 overflow-y-auto" style={{ width: `${stylePanelWidth}%` }}>
                  <span className="text-[10px] font-extrabold tracking-widest text-white/55 uppercase block mb-2">STYLES</span>
                  <textarea value={styles} onChange={(e) => setStyles(e.target.value)} placeholder="Dark Blues Rock / Gritty Pop / cinematic, stoic, fearless energy..." className="w-full h-24 text-[10px] rounded-lg p-2 resize-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff' }} aria-label="Style description" />
                  <div className="mt-2">
                    <span className="text-[9px] text-white/50 uppercase font-bold block mb-1">Exclude Styles</span>
                    <textarea value={excludeStyles} onChange={(e) => setExcludeStyles(e.target.value)} placeholder="Describe styles to avoid..." className="w-full h-16 text-[10px] rounded-lg p-2 resize-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff' }} aria-label="Excluded styles" />
                  </div>
                </div>
                <SplitterHandle label="Resize style panel" onPointerDown={beginResize('style')} />
                {editMode === 'replace' && (
                  <>
                    <div className="p-3 overflow-y-auto" style={{ width: `${lyricsPanelWidth}%` }}>
                      <span className="text-[10px] font-extrabold tracking-widest text-white/55 uppercase block mb-2">{selectedSection ? `EDIT: ${selectedSection.type}` : 'SELECT A SECTION'}</span>
                      <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Edit lyrics for selected section..." className="w-full h-[80%] text-[10px] rounded-lg p-2 resize-none" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff' }} aria-label="Section lyrics editor" />
                    </div>
                    <SplitterHandle label="Resize lyrics panel" onPointerDown={beginResize('lyrics')} />
                  </>
                )}
                <div className="p-3 overflow-y-auto flex-1 min-w-[180px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold tracking-widest text-white/55 uppercase">EDITS</span>
                    <button onClick={() => setShowBottomPanel(false)} className="p-0.5 rounded hover:bg-white/10 text-white/30"><Settings className="h-3 w-3" /></button>
                  </div>
                  <div className="space-y-2">
                    {versions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-24 text-center">
                        <p className="text-[10px] text-white/40">No edits yet</p>
                        <p className="text-[9px] text-white/30 mt-1">Edits and generation events appear here</p>
                      </div>
                    ) : versions.map((v) => (
                      <div key={v.id} className="rounded-lg p-2 border" style={{ borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-[10px] text-white/90">{v.changes_description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedTrack && (editMode === 'replace' || editMode === 'extend') && !showBottomPanel && (
            <div className="flex-shrink-0 p-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              <button onClick={() => setShowBottomPanel(true)} className="text-xs px-3 py-1 rounded border border-white/25 text-white/75 hover:bg-white/10">Show Edit Panels</button>
            </div>
          )}
        </div>
      </div>

      <footer className="flex-shrink-0 flex items-center gap-4 px-4 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.12)', background: '#050608' }} role="contentinfo">
        <div className="flex items-center gap-2 w-40">
          {selectedTrack ? (
            <>
              <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                {selectedTrack.cover_image_url ? <img src={selectedTrack.cover_image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ background: '#15162a' }}><Music className="h-4 w-4 text-white/40" /></div>}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">{selectedTrack.title}</p>
                <p className="text-[9px] text-white/55 truncate">{selectedTrack.created_by?.split('@')[0]}</p>
              </div>
            </>
          ) : <span className="text-[11px] text-white/45">No track loaded</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentTime((t) => Math.max(0, t - 10))} className="p-1 rounded hover:bg-white/10 text-white/65 transition-colors" aria-label="Skip back"><SkipBack className="h-4 w-4" /></button>
          <button className="p-1 rounded hover:bg-white/10 text-white/65 transition-colors" aria-label="Step back" onClick={() => setCurrentTime((t) => Math.max(0, t - 5))}><RefreshCw className="h-4 w-4" /></button>
          <button className="w-9 h-9 rounded-full flex items-center justify-center transition-all" style={{ background: 'rgba(255,255,255,0.18)' }} onClick={() => setIsPlaying((p) => !p)} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}</button>
          <button onClick={() => setCurrentTime((t) => Math.min(totalDuration, t + 5))} className="p-1 rounded hover:bg-white/10 text-white/65 transition-colors" aria-label="Fast forward"><FastForward className="h-4 w-4" /></button>
          <button onClick={() => setCurrentTime((t) => Math.min(totalDuration, t + 10))} className="p-1 rounded hover:bg-white/10 text-white/65 transition-colors" aria-label="Skip forward"><SkipForward className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2 font-mono text-sm text-white"><span>{formatTime(currentTime)}</span></div>
        <div className="flex items-center gap-1 ml-auto">
          <Settings className="h-3 w-3 text-white/35" />
          <span className="text-xs text-white/75 font-mono">{bpm}</span>
          <input type="range" min={40} max={200} value={bpm} onChange={(e) => setBpm(+e.target.value)} className="w-16 h-1 accent-cyan-300" aria-label="BPM" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors" aria-label="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></button>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors" aria-label="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></button>
          <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); else editorRootRef.current?.requestFullscreen?.(); }} className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors" aria-label="Fullscreen"><Maximize2 className="h-3.5 w-3.5" /></button>
          <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); }} className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors" aria-label="Minimize"><Minimize2 className="h-3.5 w-3.5" /></button>
        </div>
      </footer>
    </div>
  );
}
