import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Wand2, ChevronDown, ChevronUp, Loader2, Mic2, Music, Plus, BookOpen, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import VoiceClonePanel from './VoiceClonePanel';
import PresetPromptsPanel from './PresetPromptsPanel';

const TABS = ['simple', 'advanced', 'mashup', 'remix'];
const SIMPLE_PROMPT_MAX = 495;
const STYLE_MAX = 995;
const LYRICS_MAX = 4995;

// Short-label chips → full prompt values
const SIMPLE_CHIPS = [
  { label: 'Hitchhiker', value: 'Hitchhiker-style cosmic road trip anthem with witty spoken hooks and neon synths' },
  { label: 'Indian Raga', value: 'Indian sitar raaga journey in Yaman with tabla groove and cinematic strings' },
  { label: 'Telugu 70s', value: 'Telugu retro 70s melody with warm analog keys and soulful chorus' },
  { label: 'Dawn Bhajan', value: 'Devotional dawn bhajan with tanpura drone, flute answers, and serene choir' },
  { label: 'Psy-Techno', value: 'Progressive psy-techno odyssey with rolling bass and hypnotic polyrhythms' },
  { label: 'Lo-Fi Rain', value: 'Lo-fi study rain beat with dusty vinyl texture and mellow jazz chords' },
  { label: 'Festival EDM', value: 'Festival EDM drop with euphoric build, chant vocals, and cinematic brass' },
];

// Horizontal-swipe style preset chips for advanced/mashup tabs
const ADV_STYLE_CHIPS = [
  { label: 'Hitchhiker Folk', value: 'hitchhiker-style cosmic folk, witty, surreal, warm analog, road-trip energy' },
  { label: 'Indian Raga', value: 'indian sitar raaga yaman, tabla, tanpura, cinematic ambient bed' },
  { label: 'Bhairavi', value: 'raaga bhairavi devotional, meditative, bansuri, temple bells' },
  { label: 'Minimal Techno', value: 'minimal techno, precise, sub bass, dark, 128 BPM' },
  { label: 'Telugu Ballad', value: 'telugu emotional ballad, classic strings, soulful lead, nostalgic' },
  { label: 'Synthwave 80s', value: 'synthwave retro neon, gated reverb, analog arps, 80s cinematic' },
  { label: 'Kafi Raga', value: 'raaga kafi, khayal, sarangi, tabla, haunting night mood' },
  { label: 'Darbari Night', value: 'raaga darbari, late night, deep resonance, dhrupad, slow tempo' },
  { label: 'Bollywood', value: 'bollywood orchestral, strings, brass fanfare, cinematic drama' },
  { label: 'Deep House', value: 'deep house, soulful vocals, sub bass, Chicago groove, 124 BPM' },
  { label: 'Psy-Prog', value: 'psychedelic progressive, swirling guitar, hypnotic groove, mind-bending layers' },
];

const REMIX_STYLE_CHIPS = [
  { label: 'Lo-Fi Jazz', value: 'lo-fi, jazz, ambient' },
  { label: 'Cinematic', value: 'cinematic, orchestral' },
  { label: 'Trap', value: 'trap, hard bass' },
  { label: 'Acoustic', value: 'acoustic, folk' },
  { label: 'Club', value: 'electronic, club' },
];

const VOCAL_GENDERS = ['Auto', 'Male', 'Female', 'Duet'];

// ── Field appearance ──
const fieldStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.13)',
  color: '#fff',
  transition: 'border-color 0.15s',
};

function fieldClass(extra = '') {
  return cn(
    'w-full px-3 py-2.5 rounded-lg text-xs placeholder:text-white/25',
    'focus:outline-none focus:ring-1 focus:ring-rose-400 focus:border-rose-400/40',
    'hover:border-white/25',
    extra
  );
}

// ── Draggable resize handle for individual textareas (mobile & desktop) ──
function TextareaDragHandle({ onDrag, label = 'Drag to resize' }) {
  const [active, setActive] = React.useState(false);
  const handleDown = (e) => {
    setActive(true);
    onDrag(e);
    const up = () => { setActive(false); window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up); };
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
  };
  return (
    <div
      role="separator"
      aria-label={label}
      onMouseDown={handleDown}
      onTouchStart={handleDown}
      className="flex items-center justify-center cursor-row-resize select-none transition-all rounded-b-lg"
      style={{
        height: 16,
        marginTop: -2,
        background: active ? 'rgba(225,29,72,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(225,29,72,0.35)' : 'rgba(255,255,255,0.1)'}`,
        borderTop: 'none',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
    >
      <GripHorizontal className="h-3 w-3 pointer-events-none" style={{ color: active ? '#e11d48' : 'rgba(255,255,255,0.32)' }} />
    </div>
  );
}

// ── Horizontal-scroll chip row (short labels → full values) ──
function HChipRow({ chips, onPick, activeValues = [] }) {
  return (
    <div
      className="flex overflow-x-auto gap-1.5 mt-1.5 pb-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {chips.map((chip, i) => {
        const label = typeof chip === 'string' ? chip : chip.label;
        const value = typeof chip === 'string' ? chip : chip.value;
        const isActive = activeValues.includes(value);
        return (
          <button
            key={i}
            type="button"
            onMouseDown={() => onPick(value)}
            onTouchEnd={(e) => { e.preventDefault(); onPick(value); }}
            className="flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap"
            style={isActive
              ? { background: '#e11d48', color: '#fff', border: '1px solid #e11d48' }
              : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function PanelSection({ label, children }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.44)' }}>{label}</p>}
      {children}
    </div>
  );
}

function PanelSlider({ label, value, onChange, hideLabel = false }) {
  return (
    <div>
      {!hideLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
          <span className="text-[10px] font-extrabold tabular-nums" style={{ color: '#fb7185' }}>{value}%</span>
        </div>
      )}
      <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${value}%`, background: 'linear-gradient(90deg, #e11d48, #be123c)' }} />
        <input type="range" min={0} max={100} value={value} aria-label={label || 'Slider'} onChange={e => onChange(Number(e.target.value))} className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md pointer-events-none" style={{ left: `calc(${value}% - 6px)`, background: '#e11d48' }} />
      </div>
    </div>
  );
}

function VocalModeRow({ isInstrumental, onChange }) {
  return (
    <div className="flex gap-2">
      <button type="button" aria-pressed={!isInstrumental} onClick={() => onChange(false)}
        className="flex-1 py-2 border rounded-lg text-[10px] font-bold transition-all"
        style={!isInstrumental
          ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
          : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)' }}>
        <Mic2 className="h-3.5 w-3.5 mx-auto mb-0.5" />Vocal
      </button>
      <button type="button" aria-pressed={isInstrumental} onClick={() => onChange(true)}
        className="flex-1 py-2 border rounded-lg text-[10px] font-bold transition-all"
        style={isInstrumental
          ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
          : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)' }}>
        <Music className="h-3.5 w-3.5 mx-auto mb-0.5" />Instrumental
      </button>
    </div>
  );
}

// Build a drag-resize handler for a single textarea row state
function makeDragResize(rowsRef, startYRef, setRows, minRows, maxRows) {
  return (event) => {
    event.preventDefault();
    startYRef.current = event.touches ? event.touches[0].clientY : event.clientY;
    const startRows = rowsRef.current;
    const move = (mv) => {
      const y = mv.touches ? mv.touches[0].clientY : mv.clientY;
      const delta = Math.round((y - startYRef.current) / 20);
      setRows(Math.max(minRows, Math.min(maxRows, startRows + delta)));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };
}

export default function StudioGeneratePanel({
  tab, onTabChange,
  title, onTitleChange,
  lyrics, onLyricsChange,
  styles, onStylesChange,
  vocalGender, onVocalGenderChange,
  negativeTag, onNegativeTagChange,
  styleWeight, onStyleWeightChange,
  clarityWeight, onClarityWeightChange,
  isInstrumental, onInstrumentalChange,
  strictVoiceClone, onStrictVoiceCloneChange,
  simplePrompt, onSimplePromptChange,
  showMoreOptions, onToggleMoreOptions,
  remixSource, onRemixSourceChange,
  remixPrompt, onRemixPromptChange,
  remixInfluence, onRemixInfluenceChange,
  mashupTrackIds = [],
  onToggleMashupTrack,
  selectedPersonaId, onSelectPersona,
  onGenerate, isGenerating,
  tracks = [],
}) {
  const [showPresets, setShowPresets] = useState(false);
  const [generatingSimplePrompt, setGeneratingSimplePrompt] = useState(false);
  const [enhancingAdvanced, setEnhancingAdvanced] = useState(false);

  // Textarea row heights
  const [simpleRows, setSimpleRows] = useState(6);
  const [styleRows, setStyleRows] = useState(3);
  const [lyricRows, setLyricRows] = useState(9);
  const [remixPromptRows, setRemixPromptRows] = useState(4);
  const [mashupPromptRows, setMashupPromptRows] = useState(4);

  // Refs for drag state
  const simpleRowsRef = useRef(6);
  const styleRowsRef = useRef(3);
  const lyricRowsRef = useRef(9);
  const remixRowsRef = useRef(4);
  const mashupRowsRef = useRef(4);
  const dragStartYRef = useRef(0);
  const advStyleStartRef = useRef(3);
  const advLyricsStartRef = useRef(9);

  simpleRowsRef.current = simpleRows;
  styleRowsRef.current = styleRows;
  lyricRowsRef.current = lyricRows;
  remixRowsRef.current = remixPromptRows;
  mashupRowsRef.current = mashupPromptRows;

  const readyTracks = tracks.filter(t => t.status === 'ready' && (t.audio_url || t.stream_audio_url));
  const simpleCount = simplePrompt.length;
  const stylesCount = styles.length;
  const lyricsCount = lyrics.length;

  const activeStyleValues = ADV_STYLE_CHIPS
    .filter(c => styles.toLowerCase().includes(c.value.toLowerCase()))
    .map(c => c.value);

  const handleApplyPreset = ({ prompt, styles: presetStyles }) => {
    if (tab === 'simple') {
      onSimplePromptChange((prompt || '').slice(0, SIMPLE_PROMPT_MAX));
    } else {
      onStylesChange((presetStyles || '').slice(0, STYLE_MAX));
      if (prompt) onLyricsChange(prompt.slice(0, LYRICS_MAX));
    }
    setShowPresets(false);
  };

  const generateSimplePrompt = async () => {
    const currentPrompt = simplePrompt.trim();
    const shouldEnhance = currentPrompt.length > 0;
    setGeneratingSimplePrompt(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: shouldEnhance
          ? `Enhance this music-generation prompt while preserving the user's intent. Make it more specific with mood, arrangement, instrumentation, and sonic texture. Keep it under ${SIMPLE_PROMPT_MAX} characters. Return plain text only.\n\nPrompt: ${currentPrompt}`
          : `Create one vivid music-generation prompt under ${SIMPLE_PROMPT_MAX} characters. Blend one unexpected hook, clear mood, instrumentation, and section flow cues. No markdown.`,
        add_context_from_internet: false,
      });
      onSimplePromptChange(String(response || '').slice(0, SIMPLE_PROMPT_MAX));
      toast.success(shouldEnhance ? 'Prompt enhanced' : 'Random prompt generated');
    } catch {
      toast.error(shouldEnhance ? 'Failed to enhance prompt' : 'Failed to generate prompt');
    } finally {
      setGeneratingSimplePrompt(false);
    }
  };

  const enhanceAdvanced = async () => {
    setEnhancingAdvanced(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Enhance these music generation inputs with stronger clarity and detail. Return JSON with keys styles and lyrics only.\nstyles: ${styles || 'none'}\nlyrics: ${lyrics || 'none'}\nLimit styles to ${STYLE_MAX} chars and lyrics to ${LYRICS_MAX} chars.`,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: { styles: { type: 'string' }, lyrics: { type: 'string' } },
          required: ['styles', 'lyrics'],
        },
      });
      if (response?.styles) onStylesChange(String(response.styles).slice(0, STYLE_MAX));
      if (response?.lyrics) onLyricsChange(String(response.lyrics).slice(0, LYRICS_MAX));
      toast.success('Advanced prompts enhanced');
    } catch {
      toast.error('Failed to enhance advanced prompts');
    } finally {
      setEnhancingAdvanced(false);
    }
  };

  // Advanced: split-drag between Styles and Lyrics textareas
  const beginTextareaSplitDrag = useCallback((event) => {
    event.preventDefault();
    dragStartYRef.current = event.touches ? event.touches[0].clientY : event.clientY;
    advStyleStartRef.current = styleRowsRef.current;
    advLyricsStartRef.current = lyricRowsRef.current;
    const move = (mv) => {
      const y = mv.touches ? mv.touches[0].clientY : mv.clientY;
      const deltaRows = Math.round((y - dragStartYRef.current) / 20);
      setStyleRows(Math.max(2, Math.min(12, advStyleStartRef.current + deltaRows)));
      setLyricRows(Math.max(4, Math.min(20, advLyricsStartRef.current - deltaRows)));
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  }, []);

  // Individual textarea resize handlers
  const beginSimpleDrag = useCallback(
    makeDragResize(simpleRowsRef, dragStartYRef, setSimpleRows, 3, 22), []
  );
  const beginRemixDrag = useCallback(
    makeDragResize(remixRowsRef, dragStartYRef, setRemixPromptRows, 2, 18), []
  );
  const beginMashupDrag = useCallback(
    makeDragResize(mashupRowsRef, dragStartYRef, setMashupPromptRows, 2, 18), []
  );

  return (
    <div className="flex flex-col h-full overflow-hidden relative" style={{ background: '#0a0a0f', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
      {showPresets && (
        <div className="absolute inset-0 z-20">
          <PresetPromptsPanel onApply={handleApplyPreset} onClose={() => setShowPresets(false)} />
        </div>
      )}

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-extrabold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.85)' }}>Generate</p>
          <button
            type="button"
            onClick={() => setShowPresets(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border"
            style={showPresets
              ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.5)' }}>
            <BookOpen className="h-3 w-3" /> Presets
          </button>
        </div>
        <div
          role="tablist"
          aria-label="Generation mode"
          className="flex overflow-hidden border rounded-lg"
          style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}
        >
          {TABS.map(t => (
            <button
              key={t} type="button" role="tab" aria-selected={tab === t}
              onClick={() => onTabChange(t)}
              className="flex-1 py-1.5 text-[10px] font-bold capitalize transition-all focus:outline-none focus:ring-1 focus:ring-rose-400"
              style={tab === t
                ? { background: 'rgba(225,29,72,0.26)', borderBottom: '2px solid #e11d48', color: '#fff' }
                : { color: 'rgba(255,255,255,0.42)' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-3">

        {/* ════ SIMPLE ════ */}
        {tab === 'simple' && (
          <PanelSection label="Description">
            <div className="relative">
              <textarea
                value={simplePrompt}
                onChange={e => onSimplePromptChange(e.target.value.slice(0, SIMPLE_PROMPT_MAX))}
                placeholder="Describe your music..."
                rows={simpleRows}
                aria-label="Simple generation description"
                className={fieldClass('resize-none leading-relaxed pr-10')}
                style={fieldStyle}
              />
              <button
                type="button"
                onClick={generateSimplePrompt}
                className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 transition-colors"
                aria-label={simplePrompt.trim() ? 'Enhance prompt' : 'Generate random prompt'}
              >
                {generatingSimplePrompt
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white/45" />
                  : <Wand2 className="h-3.5 w-3.5 text-white/45" />}
              </button>
            </div>
            <TextareaDragHandle onDrag={beginSimpleDrag} label="Drag to resize prompt" />
            <div className="text-[10px] text-right mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
              {simpleCount}/{SIMPLE_PROMPT_MAX}
            </div>
            {/* Short-label prompt chips */}
            <HChipRow chips={SIMPLE_CHIPS} onPick={v => onSimplePromptChange(v.slice(0, SIMPLE_PROMPT_MAX))} />
          </PanelSection>
        )}

        {/* ════ ADVANCED ════ */}
        {tab === 'advanced' && (
          <>
            <VocalModeRow isInstrumental={isInstrumental} onChange={onInstrumentalChange} />

            {/* Styles input + horizontal preset chips */}
            <PanelSection label="Styles">
              <textarea
                value={styles}
                onChange={e => onStylesChange(e.target.value.slice(0, STYLE_MAX))}
                placeholder="soaring, acoustic, emotional, folk, deep, warm..."
                rows={styleRows}
                aria-label="Style tags"
                className={fieldClass('resize-none leading-relaxed')}
                style={fieldStyle}
              />
              <div className="text-[10px] text-right mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
                {stylesCount}/{STYLE_MAX}
              </div>
              {/* Horizontal-scroll preset chips only — no single-word genre chips */}
              <HChipRow chips={ADV_STYLE_CHIPS} onPick={v => onStylesChange(v.slice(0, STYLE_MAX))} activeValues={activeStyleValues} />
            </PanelSection>

            {/* Styles ↔ Lyrics splitter */}
            <div
              role="separator"
              aria-label="Resize styles and lyrics panels"
              onMouseDown={beginTextareaSplitDrag}
              onTouchStart={beginTextareaSplitDrag}
              className="flex items-center justify-center cursor-row-resize rounded transition-all select-none"
              style={{ height: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225,29,72,0.1)'; e.currentTarget.style.borderColor = 'rgba(225,29,72,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              <GripHorizontal className="h-3.5 w-3.5 pointer-events-none" style={{ color: 'rgba(255,255,255,0.35)' }} />
            </div>

            {/* Lyrics / Structure */}
            <PanelSection label={isInstrumental ? 'Structure Prompt' : 'Lyrics & Structure'}>
              <div className="relative">
                <textarea
                  value={lyrics}
                  onChange={e => onLyricsChange(e.target.value.slice(0, LYRICS_MAX))}
                  placeholder={isInstrumental
                    ? 'Describe arrangement, sections, mood, and instrumentation...'
                    : '[Verse 1]\nYour lyrics here...\n\n[Chorus]\n...'}
                  rows={lyricRows}
                  aria-label={isInstrumental ? 'Instrumental structure prompt' : 'Lyrics and song structure'}
                  className={fieldClass('resize-none font-mono leading-relaxed pr-10')}
                  style={fieldStyle}
                />
                <button
                  type="button"
                  onClick={enhanceAdvanced}
                  aria-label="Enhance advanced prompts"
                  className="absolute top-2 right-2 p-1 rounded hover:bg-white/10 transition-colors"
                >
                  {enhancingAdvanced
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white/45" />
                    : <Sparkles className="h-3.5 w-3.5 text-white/45" />}
                </button>
              </div>
              <div className="text-[10px] text-right mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
                {lyricsCount}/{LYRICS_MAX}
              </div>
              {/* Lyric idea chips removed as requested */}
            </PanelSection>

            <PanelSection label="Voice Persona">
              <VoiceClonePanel selectedPersonaId={selectedPersonaId} onSelectPersona={onSelectPersona} />
              <label className="flex items-center gap-2 text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <input type="checkbox" checked={!!strictVoiceClone} onChange={e => onStrictVoiceCloneChange?.(e.target.checked)} />
                Strict voice match (best effort)
              </label>
            </PanelSection>

            <PanelSection label="Vocal Gender">
              <div className="grid grid-cols-4 gap-1">
                {VOCAL_GENDERS.map(g => (
                  <button key={g} type="button" aria-pressed={vocalGender === g} onClick={() => onVocalGenderChange(g)}
                    className="py-1.5 rounded-lg text-[10px] font-bold transition-all border capitalize"
                    style={vocalGender === g
                      ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)' }}>
                    {g}
                  </button>
                ))}
              </div>
            </PanelSection>

            <div className="overflow-hidden border rounded-lg" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <button
                type="button"
                aria-expanded={showMoreOptions}
                onClick={onToggleMoreOptions}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/3 transition-colors"
              >
                <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>More Options</span>
                {showMoreOptions
                  ? <ChevronUp className="h-3.5 w-3.5 text-white/40" />
                  : <ChevronDown className="h-3.5 w-3.5 text-white/40" />}
              </button>
              <AnimatePresence>
                {showMoreOptions && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 pt-1 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <PanelSection label="Track Title (optional)">
                        <input value={title} onChange={e => onTitleChange(e.target.value)}
                          placeholder="Auto if empty" aria-label="Optional track title"
                          className={fieldClass()} style={fieldStyle} />
                      </PanelSection>
                      <PanelSection label="Negative Styles (auto-filled if empty)">
                        <input value={negativeTag} onChange={e => onNegativeTagChange(e.target.value)}
                          placeholder="aggressive, distorted…" aria-label="Negative styles"
                          className={fieldClass()} style={fieldStyle} />
                      </PanelSection>
                      <PanelSlider label="Style Influence" value={styleWeight} onChange={onStyleWeightChange} />
                      <PanelSlider label="Weirdness" value={clarityWeight} onChange={onClarityWeightChange} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* ════ REMIX ════ */}
        {tab === 'remix' && (
          <>
            <div className="flex gap-2">
              {[
                { label: 'Vocal', IconComp: Mic2, active: !isInstrumental },
                { label: 'No Vocal', IconComp: Music, active: isInstrumental },
                { label: 'Upload', IconComp: Plus, active: false },
              ].map(({ label, IconComp, active }) => (
                <button key={label} type="button" aria-pressed={active}
                  onClick={() => { if (label === 'Vocal') onInstrumentalChange(false); else if (label === 'No Vocal') onInstrumentalChange(true); }}
                  className="flex-1 flex flex-col items-center gap-1 py-2.5 border rounded-lg transition-all text-[10px] font-bold"
                  style={active
                    ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.45)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)' }}>
                  <IconComp className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <PanelSection label="Remix Source">
              <select value={remixSource} onChange={e => onRemixSourceChange(e.target.value)}
                aria-label="Remix source track"
                className={fieldClass('appearance-none')}
                style={{ ...fieldStyle, color: remixSource ? '#fff' : 'rgba(255,255,255,0.35)' }}>
                <option value="" style={{ background: '#0a0a0f' }}>Choose a generated or uploaded source</option>
                {readyTracks.map(t => <option key={t.id} value={t.id} style={{ background: '#0a0a0f' }}>{t.title}</option>)}
              </select>
            </PanelSection>

            <PanelSection label="Target Style">
              <input value={styles} onChange={e => onStylesChange(e.target.value.slice(0, STYLE_MAX))}
                placeholder="lo-fi, jazz, ambient…" aria-label="Remix target style"
                className={fieldClass()} style={fieldStyle} />
              <HChipRow chips={REMIX_STYLE_CHIPS} onPick={onStylesChange} />
            </PanelSection>

            <PanelSection label="Remix Prompt">
              <textarea value={remixPrompt} onChange={e => onRemixPromptChange(e.target.value)}
                placeholder="Describe the remix direction…" rows={remixPromptRows}
                aria-label="Remix prompt" className={fieldClass('resize-none')} style={fieldStyle} />
              <TextareaDragHandle onDrag={beginRemixDrag} label="Drag to resize remix prompt" />
            </PanelSection>

            <PanelSection label={`Audio Influence ${remixInfluence}%`}>
              <PanelSlider label="" value={remixInfluence} onChange={onRemixInfluenceChange} hideLabel />
            </PanelSection>
          </>
        )}

        {/* ════ MASHUP ════ */}
        {tab === 'mashup' && (
          <>
            <PanelSection label={`Source Tracks (${mashupTrackIds.length}/2)`}>
              <div className="space-y-1 max-h-44 overflow-y-auto">
                {readyTracks.map(t => {
                  const selected = mashupTrackIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" aria-pressed={selected}
                      onClick={() => onToggleMashupTrack?.(t.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-left rounded-lg transition-all"
                      style={{
                        background: selected ? 'rgba(225,29,72,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${selected ? 'rgba(225,29,72,0.35)' : 'rgba(255,255,255,0.1)'}`,
                      }}>
                      <div className="w-7 h-7 overflow-hidden rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        {t.cover_image_url
                          ? <img src={t.cover_image_url} alt="" className="w-full h-full object-cover" />
                          : <Music className="h-3 w-3 m-auto" style={{ color: 'rgba(255,255,255,0.18)' }} />}
                      </div>
                      <span className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.82)' }}>{t.title}</span>
                      {selected && <span className="ml-auto text-[10px] font-bold" style={{ color: '#fb7185' }}>Selected</span>}
                    </button>
                  );
                })}
              </div>
            </PanelSection>

            <PanelSection label="Mashup Prompt">
              <textarea value={remixPrompt} onChange={e => onRemixPromptChange(e.target.value)}
                placeholder="Describe the mashup style…" rows={mashupPromptRows}
                aria-label="Mashup prompt" className={fieldClass('resize-none')} style={fieldStyle} />
              <TextareaDragHandle onDrag={beginMashupDrag} label="Drag to resize mashup prompt" />
            </PanelSection>

            <PanelSection label="Styles">
              <input value={styles} onChange={e => onStylesChange(e.target.value.slice(0, STYLE_MAX))}
                placeholder="cinematic, orchestral…" aria-label="Mashup style"
                className={fieldClass()} style={fieldStyle} />
              <div className="text-[10px] text-right mt-0.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
                {styles.length}/{STYLE_MAX}
              </div>
              <HChipRow chips={ADV_STYLE_CHIPS} onPick={v => onStylesChange(v.slice(0, STYLE_MAX))} />
            </PanelSection>
          </>
        )}
      </div>

      {/* Generate button footer */}
      <div
        className="flex-shrink-0 md:static sticky z-10 px-4 pb-4 pt-3 border-t"
        style={{ bottom: 'calc(var(--mobile-nav-reserve, 0px) + var(--player-reserve, 0px))', borderColor: 'rgba(255,255,255,0.08)', background: '#0a0a0f', backdropFilter: 'blur(8px)' }}
      >
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          aria-busy={isGenerating}
          className={cn(
            'w-full py-3 rounded-lg font-extrabold text-sm flex items-center justify-center gap-2 transition-all tracking-wide focus:outline-none focus:ring-2 focus:ring-rose-400',
            isGenerating ? 'cursor-not-allowed' : 'active:scale-[0.99]'
          )}
          style={isGenerating
            ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.28)' }
            : { background: 'linear-gradient(135deg, #e11d48, #be123c)', boxShadow: '0 0 24px rgba(225,29,72,0.42)', color: '#fff' }}
        >
          {isGenerating
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            : tab === 'remix' ? <><Sparkles className="h-4 w-4" /> Remix</>
            : tab === 'mashup' ? <><Sparkles className="h-4 w-4" /> Mashup</>
            : <><Sparkles className="h-4 w-4" /> Generate</>}
        </button>
      </div>
    </div>
  );
}
