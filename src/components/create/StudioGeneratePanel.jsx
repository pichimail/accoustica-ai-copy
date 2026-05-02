import React, { useState } from 'react';
import { Sparkles, Wand2, ChevronDown, ChevronUp, Loader2, Mic2, Music, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceClonePanel from './VoiceClonePanel';

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
  selectedPersonaId, onSelectPersona,
  onGenerate, isGenerating,
  tracks,
}) {
  const activeStyleChips = styles.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const toggleStyleChip = (chip) => {
    const arr = styles.split(',').map(s => s.trim()).filter(Boolean);
    const idx = arr.findIndex(s => s.toLowerCase() === chip);
    if (idx > -1) arr.splice(idx, 1);
    else arr.push(chip);
    onStylesChange(arr.join(', '));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'rgba(10,10,16,0.97)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-extrabold tracking-widest uppercase mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>Generate</p>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className="flex-1 py-1.5 text-[10px] font-bold capitalize transition-all"
              style={tab === t
                ? { background: 'rgba(225,29,72,0.3)', borderBottom: '2px solid #e11d48', color: '#fff' }
                : { color: 'rgba(255,255,255,0.3)' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-3">

        {/* SIMPLE */}
        {tab === 'simple' && (
          <>
            <PanelSection label="Description">
              <textarea
                value={simplePrompt}
                onChange={e => onSimplePromptChange(e.target.value)}
                placeholder="Describe your music..."
                rows={3}
                className="w-full rounded-xl px-3 py-2.5 text-xs placeholder:text-white/20 focus:outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
              />
            </PanelSection>
            <StyleChipField value={styles} onChange={onStylesChange} activeChips={activeStyleChips} onToggleChip={toggleStyleChip} />
            <VocalModeRow isInstrumental={isInstrumental} onChange={onInstrumentalChange} />
            <PanelSection label="Voice Persona">
              <VoiceClonePanel selectedPersonaId={selectedPersonaId} onSelectPersona={onSelectPersona} />
            </PanelSection>
            <PanelSection label="Title (optional)">
              <input value={title} onChange={e => onTitleChange(e.target.value)} placeholder="Track title..."
                className="w-full rounded-xl px-3 py-2.5 text-xs placeholder:text-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} />
            </PanelSection>
          </>
        )}

        {/* ADVANCED */}
        {tab === 'advanced' && (
          <>
            {/* Vocal mode */}
            <VocalModeRow isInstrumental={isInstrumental} onChange={onInstrumentalChange} />

            {/* Lyrics & Structure */}
            <PanelSection label="Lyrics & Structure">
              <div className="relative">
                <textarea
                  value={lyrics}
                  onChange={e => onLyricsChange(e.target.value)}
                  placeholder={`[Verse 1]\nYour lyrics here...\n\n[Chorus]\n...`}
                  rows={7}
                  className="w-full rounded-xl px-3 py-2.5 text-xs placeholder:text-white/20 focus:outline-none resize-none font-mono leading-relaxed"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                />
                <button className="absolute top-2 right-2 p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <Wand2 className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                </button>
              </div>
            </PanelSection>

            <PanelSection label="Title">
              <input value={title} onChange={e => onTitleChange(e.target.value)} placeholder="Track title..."
                className="w-full rounded-xl px-3 py-2.5 text-xs placeholder:text-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }} />
            </PanelSection>

            <StyleChipField value={styles} onChange={onStylesChange} activeChips={activeStyleChips} onToggleChip={toggleStyleChip} />

            {/* Voice Persona */}
            <PanelSection label="Voice Persona">
              <VoiceClonePanel selectedPersonaId={selectedPersonaId} onSelectPersona={onSelectPersona} />
            </PanelSection>

            {/* Vocal Gender */}
            <PanelSection label="Vocal Gender">
              <div className="grid grid-cols-4 gap-1">
                {VOCAL_GENDERS.map(g => (
                  <button key={g}
                    onClick={() => onVocalGenderChange(g)}
                    className="py-1.5 rounded-lg text-[10px] font-bold transition-all border capitalize"
                    style={vocalGender === g
                      ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }
                    }
                  >{g}</button>
                ))}
              </div>
            </PanelSection>

            {/* More Options accordion */}
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <button
                onClick={onToggleMoreOptions}
                className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-white/5"
              >
                <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>More Options</span>
                {showMoreOptions
                  ? <ChevronUp className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  : <ChevronDown className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
                }
              </button>
              <AnimatePresence>
                {showMoreOptions && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 pt-1 space-y-3">
                      <PanelSection label="Negative Tags">
                        <input
                          value={negativeTag}
                          onChange={e => onNegativeTagChange(e.target.value)}
                          placeholder="Heavy Metal, Upbeat Drums..."
                          className="w-full rounded-xl px-3 py-2 text-xs placeholder:text-white/20 focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                        />
                      </PanelSection>
                      <PanelSlider label="Style Weight" value={styleWeight} onChange={onStyleWeightChange} />
                      <PanelSlider label="Clearness" value={clarityWeight} onChange={onClarityWeightChange} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* MASHUP / REMIX */}
        {(tab === 'mashup' || tab === 'remix') && (
          <>
            {tab === 'remix' && (
              <>
                {/* Vocal mode buttons (Vocal / Vocal / Instr) */}
                <div className="flex gap-2">
                  {[
                    { label: 'Vocal', IconComp: Mic2, active: !isInstrumental },
                    { label: 'No Vocal', IconComp: Music, active: isInstrumental },
                    { label: 'Upload', IconComp: Plus, active: false },
                  ].map(({ label, IconComp, active }) => (
                    <button key={label}
                      onClick={() => {
                        if (label === 'Vocal') onInstrumentalChange(false);
                        else if (label === 'No Vocal') onInstrumentalChange(true);
                      }}
                      className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-[10px] font-bold"
                      style={active
                        ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.45)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }
                      }
                    >
                      <IconComp className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Remix source */}
                <PanelSection label="Remix Source">
                  <select
                    value={remixSource}
                    onChange={e => onRemixSourceChange(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none appearance-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: remixSource ? '#fff' : 'rgba(255,255,255,0.3)' }}
                  >
                    <option value="" style={{ background: '#111' }}>Choose a generated or uploaded source</option>
                    {tracks.filter(t => t.status === 'ready').map(t => (
                      <option key={t.id} value={t.id} style={{ background: '#111' }}>{t.title}</option>
                    ))}
                  </select>
                </PanelSection>

                <PanelSection label="Target Style">
                  <input
                    value={styles}
                    onChange={e => onStylesChange(e.target.value)}
                    placeholder="lo-fi, jazz, ambient..."
                    className="w-full rounded-xl px-3 py-2.5 text-xs placeholder:text-white/20 focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {REMIX_STYLES.map(s => (
                      <button key={s} onMouseDown={() => onStylesChange(s)}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </PanelSection>

                <PanelSection label="Remix Prompt">
                  <textarea
                    value={remixPrompt}
                    onChange={e => onRemixPromptChange(e.target.value)}
                    placeholder="Describe the remix direction..."
                    rows={3}
                    className="w-full rounded-xl px-3 py-2.5 text-xs placeholder:text-white/20 focus:outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                  />
                </PanelSection>

                <PanelSection label={`Audio Influence  ${remixInfluence}%`}>
                  <PanelSlider label="" value={remixInfluence} onChange={onRemixInfluenceChange} hideLabel />
                </PanelSection>
              </>
            )}

            {tab === 'mashup' && (
              <>
                <PanelSection label="Source Tracks">
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {tracks.filter(t => t.status === 'ready').map(t => (
                      <button key={t.id}
                        onClick={() => onRemixSourceChange(t.id)}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                        style={{
                          background: remixSource === t.id ? 'rgba(225,29,72,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${remixSource === t.id ? 'rgba(225,29,72,0.35)' : 'rgba(255,255,255,0.07)'}`,
                        }}>
                        <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {t.cover_image_url ? <img src={t.cover_image_url} className="w-full h-full object-cover" /> : <Music className="h-3 w-3 m-auto" style={{ color: 'rgba(255,255,255,0.15)' }} />}
                        </div>
                        <span className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{t.title}</span>
                      </button>
                    ))}
                  </div>
                </PanelSection>
                <PanelSection label="Mashup Prompt">
                  <textarea
                    value={remixPrompt}
                    onChange={e => onRemixPromptChange(e.target.value)}
                    placeholder="Describe the mashup style..."
                    rows={3}
                    className="w-full rounded-xl px-3 py-2.5 text-xs placeholder:text-white/20 focus:outline-none resize-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                  />
                </PanelSection>
                <StyleChipField value={styles} onChange={onStylesChange} activeChips={activeStyleChips} onToggleChip={toggleStyleChip} />
              </>
            )}
          </>
        )}
      </div>

      {/* Generate Button */}
      <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className={cn('w-full py-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all tracking-wide',
            isGenerating ? 'cursor-not-allowed' : 'active:scale-[0.98]')}
          style={isGenerating
            ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }
            : { background: 'linear-gradient(135deg, #e11d48, #be123c)', boxShadow: '0 0 24px rgba(225,29,72,0.45)', color: '#fff' }
          }
        >
          {isGenerating
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
            : tab === 'remix' ? <><Sparkles className="h-4 w-4" /> Remix</>
            : tab === 'mashup' ? <><Sparkles className="h-4 w-4" /> Mashup</>
            : <><Sparkles className="h-4 w-4" /> Generate</>
          }
        </button>
      </div>
    </div>
  );
}

/* ── Shared sub-components ── */
function PanelSection({ label, children }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>}
      {children}
    </div>
  );
}

function PanelSlider({ label, value, onChange, hideLabel }) {
  return (
    <div>
      {!hideLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
          <span className="text-[10px] font-extrabold tabular-nums" style={{ color: '#e11d48' }}>{value}%</span>
        </div>
      )}
      <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${value}%`, background: 'linear-gradient(90deg, #e11d48, #be123c)' }} />
        <input
          type="range" min={0} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{ left: `calc(${value}% - 6px)`, background: '#e11d48' }} />
      </div>
    </div>
  );
}

function VocalModeRow({ isInstrumental, onChange }) {
  return (
    <div className="flex gap-2">
      <button onClick={() => onChange(false)}
        className="flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all"
        style={!isInstrumental
          ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
          : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }
        }>
        <Mic2 className="h-3.5 w-3.5 mx-auto mb-0.5" />Vocal
      </button>
      <button onClick={() => onChange(true)}
        className="flex-1 py-2 rounded-xl border text-[10px] font-bold transition-all"
        style={isInstrumental
          ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
          : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }
        }>
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
        className="w-full rounded-xl px-3 py-2.5 text-xs placeholder:text-white/20 focus:outline-none resize-none leading-relaxed"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
      />
      <div className="flex flex-wrap gap-1 mt-1">
        {STYLE_SUGGESTIONS.slice(0, 16).map(chip => (
          <button key={chip} onMouseDown={() => onToggleChip(chip)}
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all"
            style={activeChips.includes(chip)
              ? { background: '#e11d48', color: '#fff' }
              : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }
            }
          >{chip}</button>
        ))}
      </div>
    </PanelSection>
  );
}