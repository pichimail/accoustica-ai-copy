import React, { useState } from 'react';
import { Sparkles, Wand2, ChevronDown, ChevronUp, Loader2, Mic2, Music, Plus, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceClonePanel from './VoiceClonePanel';
import PresetPromptsPanel from './PresetPromptsPanel';

const TABS = ['simple', 'advanced', 'mashup', 'remix'];

const STYLE_SUGGESTIONS = [
  'lo-fi', 'ambient', 'emotional', 'acoustic', 'dreamy', 'folk',
  'deep', 'warm', 'ballad', 'slow', 'soft', 'poetic', 'cinematic',
  'punchy', 'soulful', 'jazzy', 'ethereal', 'indie', 'upbeat', 'dark',
];

const VOCAL_GENDERS = ['Auto', 'Male', 'Female', 'Duet'];
const REMIX_STYLES = ['lo-fi, jazz, ambient', 'cinematic, orchestral', 'trap, hard bass', 'acoustic, folk', 'electronic, club'];

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
  const activeStyleChips = styles.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const readyTracks = tracks.filter(t => t.status === 'ready' && (t.audio_url || t.stream_audio_url));

  const handleApplyPreset = ({ prompt, styles: presetStyles }) => {
    onSimplePromptChange(prompt);
    if (presetStyles) onStylesChange(presetStyles);
    setShowPresets(false);
  };

  const toggleStyleChip = (chip) => {
    const arr = styles.split(',').map(s => s.trim()).filter(Boolean);
    const idx = arr.findIndex(s => s.toLowerCase() === chip);
    if (idx > -1) arr.splice(idx, 1);
    else arr.push(chip);
    onStylesChange(arr.join(', '));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative" style={{ background: 'rgba(10,10,16,0.97)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
      {showPresets && (
        <div className="absolute inset-0 z-20">
          <PresetPromptsPanel onApply={handleApplyPreset} onClose={() => setShowPresets(false)} />
        </div>
      )}
      <div className="flex-shrink-0 px-4 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-extrabold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.85)' }}>Generate</p>
          <button
            type="button"
            onClick={() => setShowPresets(v => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border"
            style={showPresets
              ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }
            }
          >
            <BookOpen className="h-3 w-3" /> Presets
          </button>
        </div>
        <div role="tablist" aria-label="Generation mode" className="flex overflow-hidden border rounded-lg" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
          {TABS.map(t => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTabChange(t)}
              className="flex-1 py-1.5 text-[10px] font-bold capitalize transition-all focus:outline-none focus:ring-1 focus:ring-rose-400"
              style={tab === t
                ? { background: 'rgba(225,29,72,0.26)', borderBottom: '2px solid #e11d48', color: '#fff' }
                : { color: 'rgba(255,255,255,0.36)' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-3">
        {tab === 'simple' && (
          <PanelSection label="Description">
            <textarea
              value={simplePrompt}
              onChange={e => onSimplePromptChange(e.target.value)}
              placeholder="Describe your music..."
              rows={5}
              aria-label="Simple generation description"
              className={fieldClass('resize-none leading-relaxed')}
              style={fieldStyle}
            />
          </PanelSection>
        )}

        {tab === 'advanced' && (
          <>
            <VocalModeRow isInstrumental={isInstrumental} onChange={onInstrumentalChange} />

            <PanelSection label={isInstrumental ? 'Structure Prompt' : 'Lyrics & Structure'}>
              <div className="relative">
                <textarea
                  value={lyrics}
                  onChange={e => onLyricsChange(e.target.value)}
                  placeholder={isInstrumental ? 'Describe arrangement, sections, mood, and instrumentation...' : `[Verse 1]\nYour lyrics here...\n\n[Chorus]\n...`}
                  rows={7}
                  aria-label={isInstrumental ? 'Instrumental structure prompt' : 'Lyrics and song structure'}
                  className={fieldClass('resize-none font-mono leading-relaxed pr-9')}
                  style={fieldStyle}
                />
                <button
                  type="button"
                  aria-label="Assist lyrics"
                  className="absolute top-2 right-2 p-1 hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-400"
                >
                  <Wand2 className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                </button>
              </div>
            </PanelSection>

            <PanelSection label="Title (optional)">
              <input
                value={title}
                onChange={e => onTitleChange(e.target.value)}
                placeholder="Auto if empty"
                aria-label="Optional track title"
                className={fieldClass()}
                style={fieldStyle}
              />
            </PanelSection>

            <StyleChipField value={styles} onChange={onStylesChange} activeChips={activeStyleChips} onToggleChip={toggleStyleChip} />

            <PanelSection label="Voice Persona">
              <VoiceClonePanel selectedPersonaId={selectedPersonaId} onSelectPersona={onSelectPersona} />
            </PanelSection>

            <PanelSection label="Vocal Gender">
              <div className="grid grid-cols-4 gap-1">
                {VOCAL_GENDERS.map(g => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={vocalGender === g}
                    onClick={() => onVocalGenderChange(g)}
                    className="py-1.5 rounded-lg text-[10px] font-bold transition-all border capitalize focus:outline-none focus:ring-1 focus:ring-rose-400"
                    style={vocalGender === g
                      ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>
            </PanelSection>

            <div className="overflow-hidden border rounded-lg" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <button
                type="button"
                aria-expanded={showMoreOptions}
                onClick={onToggleMoreOptions}
                className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-rose-400"
              >
                <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.58)' }}>More Options</span>
                {showMoreOptions
                  ? <ChevronUp className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                  : <ChevronDown className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
                }
              </button>
              <AnimatePresence>
                {showMoreOptions && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 pt-1 space-y-3">
                      <PanelSection label="Negative Styles">
                        <input
                          value={negativeTag}
                          onChange={e => onNegativeTagChange(e.target.value)}
                          placeholder="Auto if empty"
                          aria-label="Negative styles"
                          className={fieldClass()}
                          style={fieldStyle}
                        />
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

        {tab === 'remix' && (
          <>
            <div className="flex gap-2">
              {[
                { label: 'Vocal', IconComp: Mic2, active: !isInstrumental },
                { label: 'No Vocal', IconComp: Music, active: isInstrumental },
                { label: 'Upload', IconComp: Plus, active: false },
              ].map(({ label, IconComp, active }) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (label === 'Vocal') onInstrumentalChange(false);
                    else if (label === 'No Vocal') onInstrumentalChange(true);
                  }}
                  className="flex-1 flex flex-col items-center gap-1 py-2.5 border rounded-lg transition-all text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-rose-400"
                  style={active
                    ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.45)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }
                  }
                >
                  <IconComp className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            <PanelSection label="Remix Source">
              <select
                value={remixSource}
                onChange={e => onRemixSourceChange(e.target.value)}
                aria-label="Remix source track"
                className={fieldClass('appearance-none')}
                style={{ ...fieldStyle, color: remixSource ? '#fff' : 'rgba(255,255,255,0.35)' }}
              >
                <option value="" style={{ background: '#111' }}>Choose a generated or uploaded source</option>
                {readyTracks.map(t => (
                  <option key={t.id} value={t.id} style={{ background: '#111' }}>{t.title}</option>
                ))}
              </select>
            </PanelSection>

            <PanelSection label="Target Style">
              <input
                value={styles}
                onChange={e => onStylesChange(e.target.value)}
                placeholder="lo-fi, jazz, ambient..."
                aria-label="Remix target style"
                className={fieldClass()}
                style={fieldStyle}
              />
              <ChipRow values={REMIX_STYLES} onPick={onStylesChange} />
            </PanelSection>

            <PanelSection label="Remix Prompt">
              <textarea
                value={remixPrompt}
                onChange={e => onRemixPromptChange(e.target.value)}
                placeholder="Describe the remix direction..."
                rows={3}
                aria-label="Remix prompt"
                className={fieldClass('resize-none')}
                style={fieldStyle}
              />
            </PanelSection>

            <PanelSection label={`Audio Influence ${remixInfluence}%`}>
              <PanelSlider label="" value={remixInfluence} onChange={onRemixInfluenceChange} hideLabel />
            </PanelSection>
          </>
        )}

        {tab === 'mashup' && (
          <>
            <PanelSection label={`Source Tracks (${mashupTrackIds.length}/2)`}>
              <div className="space-y-1 max-h-44 overflow-y-auto">
                {readyTracks.map(t => {
                  const selected = mashupTrackIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onToggleMashupTrack?.(t.id)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-left rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-rose-400"
                      style={{
                        background: selected ? 'rgba(225,29,72,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${selected ? 'rgba(225,29,72,0.35)' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      <div className="w-7 h-7 overflow-hidden rounded-lg flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        {t.cover_image_url
                          ? <img src={t.cover_image_url} alt="" className="w-full h-full object-cover" />
                          : <Music className="h-3 w-3 m-auto" style={{ color: 'rgba(255,255,255,0.18)' }} />
                        }
                      </div>
                      <span className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.82)' }}>{t.title}</span>
                      {selected && <span className="ml-auto text-[10px] font-bold" style={{ color: '#fb7185' }}>Selected</span>}
                    </button>
                  );
                })}
                {readyTracks.length === 0 && (
                  <p className="py-5 text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No ready tracks with audio URLs</p>
                )}
              </div>
            </PanelSection>
            <PanelSection label="Mashup Prompt">
              <textarea
                value={remixPrompt}
                onChange={e => onRemixPromptChange(e.target.value)}
                placeholder="Describe the mashup style..."
                rows={3}
                aria-label="Mashup prompt"
                className={fieldClass('resize-none')}
                style={fieldStyle}
              />
            </PanelSection>
            <StyleChipField value={styles} onChange={onStylesChange} activeChips={activeStyleChips} onToggleChip={toggleStyleChip} />
          </>
        )}
      </div>

      <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          aria-busy={isGenerating}
          className={cn('w-full py-3 rounded-lg font-extrabold text-sm flex items-center justify-center gap-2 transition-all tracking-wide focus:outline-none focus:ring-2 focus:ring-rose-400',
            isGenerating ? 'cursor-not-allowed' : 'active:scale-[0.99]')}
          style={isGenerating
            ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.28)' }
            : { background: 'linear-gradient(135deg, #e11d48, #be123c)', boxShadow: '0 0 24px rgba(225,29,72,0.42)', color: '#fff' }
          }
        >
          {isGenerating
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            : tab === 'remix' ? <><Sparkles className="h-4 w-4" /> Remix</>
            : tab === 'mashup' ? <><Sparkles className="h-4 w-4" /> Mashup</>
            : <><Sparkles className="h-4 w-4" /> Generate</>
          }
        </button>
      </div>
    </div>
  );
}

const fieldStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
};

function fieldClass(extra = '') {
  return cn('w-full px-3 py-2.5 rounded-lg text-xs placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-rose-400', extra);
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
          <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
          <span className="text-[10px] font-extrabold tabular-nums" style={{ color: '#fb7185' }}>{value}%</span>
        </div>
      )}
      <div className="relative h-1.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="absolute left-0 top-0 h-full" style={{ width: `${value}%`, background: 'linear-gradient(90deg, #e11d48, #be123c)' }} />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          aria-label={label || 'Slider'}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-white shadow-md pointer-events-none"
          style={{ left: `calc(${value}% - 6px)`, background: '#e11d48' }} />
      </div>
    </div>
  );
}

function VocalModeRow({ isInstrumental, onChange }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        aria-pressed={!isInstrumental}
        onClick={() => onChange(false)}
        className="flex-1 py-2 border rounded-lg text-[10px] font-bold transition-all focus:outline-none focus:ring-1 focus:ring-rose-400"
        style={!isInstrumental
          ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
          : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }
        }
      >
        <Mic2 className="h-3.5 w-3.5 mx-auto mb-0.5" />Vocal
      </button>
      <button
        type="button"
        aria-pressed={isInstrumental}
        onClick={() => onChange(true)}
        className="flex-1 py-2 border rounded-lg text-[10px] font-bold transition-all focus:outline-none focus:ring-1 focus:ring-rose-400"
        style={isInstrumental
          ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
          : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }
        }
      >
        <Music className="h-3.5 w-3.5 mx-auto mb-0.5" />Instrumental
      </button>
    </div>
  );
}

function StyleChipField({ value, onChange, activeChips, onToggleChip }) {
  return (
    <PanelSection label="Styles">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="soaring, acoustic, emotional, folk, deep, warm..."
        rows={2}
        aria-label="Style tags"
        className={fieldClass('resize-none leading-relaxed')}
        style={fieldStyle}
      />
      <div className="flex flex-wrap gap-1 mt-1">
        {STYLE_SUGGESTIONS.slice(0, 16).map(chip => (
          <button
            key={chip}
            type="button"
            aria-pressed={activeChips.includes(chip)}
            onMouseDown={() => onToggleChip(chip)}
            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all border focus:outline-none focus:ring-1 focus:ring-rose-400"
            style={activeChips.includes(chip)
              ? { background: '#e11d48', color: '#fff', borderColor: '#e11d48' }
              : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.48)' }
            }
          >
            {chip}
          </button>
        ))}
      </div>
    </PanelSection>
  );
}

function ChipRow({ values, onPick }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {values.map(value => (
        <button
          key={value}
          type="button"
          onMouseDown={() => onPick(value)}
          className="px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all border focus:outline-none focus:ring-1 focus:ring-rose-400"
          style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.48)' }}
        >
          {value}
        </button>
      ))}
    </div>
  );
}