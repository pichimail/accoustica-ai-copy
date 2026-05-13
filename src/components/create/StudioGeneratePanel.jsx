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

const STYLE_TEMPLATES = {
  shamanic: {
    label: 'Shamanic',
    themes: ['root-chakra grounding', 'ecstatic dance ritual', 'cosmic earth trance', 'ceremonial momentum'],
    instruments: ['ceremonial drums', 'tabla', 'sitar', 'bansuri', 'tanpura drone', 'earthy hand percussion'],
    descriptors: ['ecstatic dance', 'tribal pulse', 'spiritual', 'hypnotic', 'organic', 'cinematic'],
    arrangements: [
      'steady tribal groove that rises in layers with flute calls and sitar phrases',
      'deep drum pulse with slow-building hand percussion, drone bed, and trance-like breaks',
      'grounded dance flow with tabla variations, bansuri answers, and a wide ritual atmosphere',
    ],
    styleTags: ['ecstatic dance', 'shamanic drumming', 'root chakra', 'sitar', 'tabla', 'bansuri', 'tribal ambient', 'organic trance'],
    avoidTags: ['pop chorus', 'trap hats', 'dubstep wobble', 'metal guitars', 'cheap EDM risers', 'cartoon vocals', 'harsh distortion'],
  },
  hitchhiker: {
    label: 'Hitch Hiker',
    themes: ['desert canyon momentum', 'dusty road-trip mystery', 'wide-open sunset travel', 'restless highway pulse'],
    instruments: ['pulsing house bass', 'dusty kick drums', 'tribal toms', 'wide desert pads', 'plucked guitar accents'],
    descriptors: ['canyon pulse', 'driving', 'sun-baked', 'cinematic', 'groovy', 'wide-screen'],
    arrangements: [
      'tight house groove with desert percussion, airy breaks, and a rolling low-end hook',
      'road-trip build with dry drums, hypnotic bass movement, and spacious melodic fragments',
      'dusty electronic pulse with tribal accents, long filter sweeps, and a strong travel motif',
    ],
    styleTags: ['desert house', 'canyon pulse', 'tribal house', 'dusty groove', 'cinematic electronic', 'wide bass'],
    avoidTags: ['cheesy pop', 'happy ukulele', 'thin bass', 'over-bright vocals', 'trap hi-hats', 'generic festival EDM'],
  },
  maksim: {
    label: 'Maksim',
    themes: ['dark club hypnosis', 'warehouse pressure', 'peak-time tension', 'mechanical night drive'],
    instruments: ['dry kick drum', 'rolling sub bass', 'percussive synth stabs', 'metallic hats', 'acid accents'],
    descriptors: ['dark minimal techno', 'driving', 'live set energy', 'pounding', 'precise', 'underground'],
    arrangements: [
      'relentless minimal groove with dry stabs, rolling bass, and tension that mutates every few bars',
      'dark techno pressure with sparse percussion, precise drops, and a hypnotic warehouse build',
      'peak-time live-set flow with mechanical bass movement, sharp hats, and restrained acid details',
    ],
    styleTags: ['dark minimal techno', 'underground techno', 'rolling sub bass', 'percussive stabs', 'warehouse groove', '128-132 BPM'],
    avoidTags: ['pop vocals', 'soft ballad', 'acoustic guitar', 'bright tropical house', 'lo-fi haze', 'orchestral drama'],
  },
  nostalgia: {
    label: 'Nostalgia',
    themes: ['night-drive longing', 'sunset city memories', 'bittersweet youth', 'retro romance'],
    instruments: ['analog arpeggiators', 'gated drums', 'neon pads', 'electric bass', 'vocoder-tinted chops', 'bright synth plucks'],
    descriptors: ['retro synthwave', 'dreamy', 'bittersweet', 'indie electronic', 'polished', 'cinematic'],
    arrangements: [
      'glowing synthwave build with pulsing arps, sidechained pads, and a bittersweet hook',
      'night-drive groove with vocoder texture, smooth bass, and an emotional retro chorus lift',
      'polished indie-electronic flow with gated drums, nostalgic synth layers, and a clean melodic payoff',
    ],
    styleTags: ['retro synthwave', 'night drive', 'analog arps', 'gated drums', 'vocoder texture', 'bittersweet electronic'],
    avoidTags: ['metal guitars', 'folk acoustic', 'raw punk', 'trap beat', 'atonal noise', 'muddy mix'],
  },
  rock: {
    label: 'Rock',
    themes: ['rebellion', 'freedom', 'power', 'angst', 'energy'],
    instruments: ['electric guitar', 'drums', 'bass', 'distortion'],
    descriptors: ['powerful', 'energetic', 'raw', 'aggressive', 'intense'],
    arrangements: ['big riff intro, tight verse groove, explosive chorus, and a short guitar break'],
    styleTags: ['rock', 'electric guitar', 'live drums', 'distortion', 'anthemic'],
    avoidTags: ['soft lounge', 'sleepy ambient', 'thin drums', 'lo-fi muffled mix', 'cartoon synths'],
  },
  romantic: {
    label: 'Romantic',
    themes: ['intimacy', 'warmth', 'tenderness', 'affection', 'romance'],
    instruments: ['soft piano', 'warm pads', 'gentle guitar', 'light percussion'],
    descriptors: ['intimate', 'warm', 'moody', 'tender', 'slow-burning', 'dreamy'],
    arrangements: ['soft intro, close emotional verse, lifted chorus, and a warm outro'],
    styleTags: ['romantic', 'warm piano', 'gentle guitar', 'dreamy pads', 'emotional ballad'],
    avoidTags: ['aggressive drums', 'harsh distortion', 'comedy vocals', 'industrial noise', 'rave drop'],
  },
  deephouse: {
    label: 'Deep House',
    themes: ['groove', 'hypnotic', 'atmospheric', 'underground'],
    instruments: ['deep bass', 'filtered pads', 'subtle percussion', 'vinyl texture'],
    descriptors: ['120-126 BPM', 'deep', 'groovy', 'minimal', 'hypnotic'],
    arrangements: ['patient four-on-the-floor groove with filtered chords, bass movement, and a late-night breakdown'],
    styleTags: ['deep house', '120-126 BPM', 'deep bass', 'filtered pads', 'subtle percussion', 'late-night groove'],
    avoidTags: ['rock guitars', 'blast beats', 'folk strumming', 'harsh trance leads', 'cheap risers'],
  },
  techno: {
    label: 'Techno',
    themes: ['industrial', 'driving', 'relentless', 'futuristic'],
    instruments: ['kick drum', 'hi-hats', 'synth stabs', '303 bass'],
    descriptors: ['128-160 BPM', 'pounding', 'hypnotic', 'repetitive', 'dark'],
    arrangements: ['hard kick foundation, evolving stabs, stripped break, and a controlled peak-time return'],
    styleTags: ['techno', '128-160 BPM', 'kick drum', 'synth stabs', '303 bass', 'dark club'],
    avoidTags: ['acoustic ballad', 'soft piano solo', 'bright pop hook', 'loose live drums', 'country twang'],
  },
  psychedelic: {
    label: 'Psychedelic',
    themes: ['mind-expanding', 'trippy', 'cosmic', 'consciousness'],
    instruments: ['acid bassline', 'modulated synths', 'reverb', 'delay effects'],
    descriptors: ['LSD-inspired', 'trippy', 'swirling', 'hallucinogenic', 'psychedelic'],
    arrangements: ['swirling intro, modulated groove, delayed motifs, and an evolving cosmic peak'],
    styleTags: ['psychedelic', 'acid bassline', 'modulated synths', 'delay effects', 'cosmic'],
    avoidTags: ['plain pop', 'dry acoustic', 'sterile mix', 'corporate music', 'simple nursery melody'],
  },
  minimaltechno: {
    label: 'Minimal Techno',
    themes: ['stripped-back', 'subtle', 'hypnotic', 'minimal'],
    instruments: ['sparse percussion', 'minimal synths', 'sub bass'],
    descriptors: ['128-135 BPM', 'minimal', 'precise', 'clean', 'focused'],
    arrangements: ['sparse loop discipline with tiny percussive changes, sub pressure, and no clutter'],
    styleTags: ['minimal techno', '128-135 BPM', 'sparse percussion', 'sub bass', 'precise'],
    avoidTags: ['busy orchestration', 'pop vocal hook', 'guitar solo', 'maximal EDM drop', 'muddy reverb'],
  },
  progressivepsych: {
    label: 'Progressive Psych',
    themes: ['journey', 'evolving', 'cosmic', 'transcendent'],
    instruments: ['layered synths', 'rolling bassline', 'complex percussion'],
    descriptors: ['135-145 BPM', 'evolving', 'progressive', 'psychedelic', 'layered'],
    arrangements: ['long progressive arc with rolling bass, psychedelic layers, and controlled energy lifts'],
    styleTags: ['progressive psychedelic', '135-145 BPM', 'rolling bassline', 'layered synths', 'complex percussion'],
    avoidTags: ['static loop', 'acoustic folk', 'pop ballad', 'thin kick', 'overly bright lead'],
  },
  telugu: {
    label: 'Telugu',
    themes: ['culture', 'tradition', 'emotion', 'storytelling'],
    instruments: ['tabla', 'flute', 'veena', 'mridangam', 'harmonium'],
    descriptors: ['crystal clear Telugu lyrics', 'traditional', 'melodic', 'soulful', 'authentic'],
    arrangements: ['melodic Telugu song flow with expressive lead lines, Indian percussion, and emotional chorus lift'],
    styleTags: ['Telugu song', 'clear Telugu lyrics', 'traditional melodic', 'flute', 'veena', 'mridangam'],
    avoidTags: ['unclear diction', 'heavy auto-tune', 'trap beat', 'harsh EDM', 'atonal noise'],
  },
  telugu70s: {
    label: 'Telugu 70s',
    themes: ['nostalgia', 'golden era', 'classic', 'timeless'],
    instruments: ['vintage keyboard', 'acoustic guitar', 'traditional drums', 'classical vocals'],
    descriptors: ['1970s Telugu classic style', 'retro', 'melodious', 'vintage production'],
    arrangements: ['vintage Telugu film-song arc with warm intro, expressive verse, string lift, and melodic refrain'],
    styleTags: ['1970s Telugu classic', 'vintage keyboard', 'acoustic guitar', 'traditional drums', 'melodious'],
    avoidTags: ['modern trap', 'dubstep', 'hyperpop', 'harsh distortion', 'flat robotic vocals'],
  },
  synthwave: {
    label: 'Synthwave',
    themes: ['nostalgia', '80s', 'retro-futuristic', 'neon'],
    instruments: ['analog synths', 'drum machines', 'arpeggiators', 'gated reverb'],
    descriptors: ['80s inspired', 'nostalgic', 'neon', 'retro', 'cinematic'],
    arrangements: ['neon intro, pulsing arps, gated drum lift, and wide cinematic chorus'],
    styleTags: ['synthwave', '80s inspired', 'analog synths', 'drum machines', 'gated reverb'],
    avoidTags: ['acoustic folk', 'metal growls', 'trap hi-hats', 'dry piano ballad', 'muddy low end'],
  },
  devotional: {
    label: 'Devotional',
    themes: ['spiritual', 'divine', 'prayer', 'worship', 'peace'],
    instruments: ['harmonium', 'tabla', 'bells', 'flute', 'tanpura'],
    descriptors: ['devotional', 'peaceful', 'spiritual', 'meditative', 'sacred'],
    arrangements: ['peaceful devotional rise with drone, call-and-response feel, gentle percussion, and sacred calm'],
    styleTags: ['devotional', 'harmonium', 'tabla', 'bells', 'flute', 'tanpura', 'sacred'],
    avoidTags: ['club beat', 'aggressive rap', 'distorted guitar', 'sarcastic tone', 'chaotic drums'],
  },
  lofi: {
    label: 'Lo-Fi',
    themes: ['chill', 'study', 'relaxation', 'nostalgia'],
    instruments: ['jazzy keys', 'vinyl crackle', 'lo-fi drums', 'smooth bass'],
    descriptors: ['70-90 BPM', 'chill', 'relaxed', 'nostalgic', 'warm'],
    arrangements: ['short mellow loop with dusty drums, soft keys, smooth bass, and subtle tape texture'],
    styleTags: ['lo-fi', '70-90 BPM', 'jazzy keys', 'vinyl crackle', 'smooth bass', 'warm'],
    avoidTags: ['aggressive vocals', 'bright EDM drop', 'metal drums', 'harsh distortion', 'busy arrangement'],
  },
  edm: {
    label: 'EDM',
    themes: ['energy', 'festival', 'euphoria', 'drop'],
    instruments: ['synth leads', 'big drums', 'sub bass', 'risers'],
    descriptors: ['128-140 BPM', 'energetic', 'festival-ready', 'massive drop', 'euphoric'],
    arrangements: ['festival build, pre-drop tension, wide synth hook, and a clean massive drop'],
    styleTags: ['EDM', '128-140 BPM', 'synth leads', 'big drums', 'sub bass', 'risers'],
    avoidTags: ['sleepy ambient', 'weak drop', 'thin bass', 'acoustic-only', 'muddy mix'],
  },
  raga: {
    label: 'Raga',
    themes: ['classical expression', 'spiritual depth', 'improvised journey', 'meditative storytelling'],
    instruments: ['sitar', 'tabla', 'tanpura', 'bansuri'],
    descriptors: ['Indian classical', 'ornamented melody', 'soulful', 'cinematic', 'emotive'],
    arrangements: ['alap-like opening, tabla entry, melodic improvisation, and a cinematic final lift'],
    styleTags: ['Indian classical', 'raga', 'sitar', 'tabla', 'tanpura', 'bansuri', 'ornamented melody'],
    avoidTags: ['western pop chorus', 'trap beat', 'auto-tune', 'distorted guitars', 'generic EDM'],
  },
  bhairavi: {
    label: 'Bhairavi',
    themes: ['devotion', 'late-morning reflection', 'surrender', 'serene longing'],
    instruments: ['tanpura', 'tabla', 'bansuri', 'sarangi', 'temple bells'],
    descriptors: ['raaga bhairavi', 'devotional', 'meditative', 'serene', 'soulful'],
    arrangements: ['slow devotional opening, bansuri responses, soft tabla pulse, and a peaceful refrain'],
    styleTags: ['raaga bhairavi', 'devotional', 'tanpura', 'bansuri', 'temple bells', 'meditative'],
    avoidTags: ['club drums', 'aggressive bass', 'trap hats', 'comic vocals', 'harsh synth lead'],
  },
  kafi: {
    label: 'Kafi Raga',
    themes: ['folk-classical longing', 'rainy evening emotion', 'earthy romance', 'haunting memory'],
    instruments: ['sarangi', 'tabla', 'tanpura', 'sitar', 'soft harmonium'],
    descriptors: ['raaga kafi', 'haunting', 'earthy', 'semi-classical', 'night mood'],
    arrangements: ['slow khayal-inspired arc with sarangi phrases, tabla patience, and a haunting refrain'],
    styleTags: ['raaga kafi', 'khayal', 'sarangi', 'tabla', 'haunting night mood'],
    avoidTags: ['EDM drop', 'over-compressed drums', 'metal guitar', 'cartoon synths', 'unclear tuning'],
  },
  darbari: {
    label: 'Darbari Night',
    themes: ['late-night gravity', 'royal introspection', 'deep stillness', 'serious devotion'],
    instruments: ['deep tanpura', 'rudra veena', 'tabla', 'bansuri', 'low strings'],
    descriptors: ['raaga darbari', 'late night', 'deep resonance', 'slow tempo', 'majestic'],
    arrangements: ['deep slow alap feel, restrained percussion entry, low-register melody, and a grave finish'],
    styleTags: ['raaga darbari', 'late night', 'deep resonance', 'dhrupad', 'slow tempo'],
    avoidTags: ['bright pop', 'fast dance beat', 'thin synths', 'comic vocal', 'happy ukulele'],
  },
  bollywood: {
    label: 'Bollywood',
    themes: ['cinematic romance', 'heroic drama', 'festival emotion', 'melodic storytelling'],
    instruments: ['strings', 'brass fanfare', 'tabla', 'dholak', 'cinematic percussion'],
    descriptors: ['bollywood orchestral', 'dramatic', 'melodic', 'cinematic', 'emotional'],
    arrangements: ['film-song structure with cinematic intro, expressive verse, big refrain, and orchestral bridge'],
    styleTags: ['bollywood orchestral', 'strings', 'brass fanfare', 'cinematic drama', 'tabla'],
    avoidTags: ['atonal noise', 'flat loop', 'industrial harshness', 'unclear vocal', 'tiny arrangement'],
  },
};

const STYLE_CHIPS = [
  { label: 'Shamanic', value: 'shamanic' },
  { label: 'Hitch Hiker', value: 'hitchhiker' },
  { label: 'Maksim', value: 'maksim' },
  { label: 'Nostalgia', value: 'nostalgia' },
  { label: 'Raga', value: 'raga' },
  { label: 'Bhairavi', value: 'bhairavi' },
  { label: 'Darbari Night', value: 'darbari' },
  { label: 'Kafi Raga', value: 'kafi' },
  { label: 'Telugu', value: 'telugu' },
  { label: 'Telugu 70s', value: 'telugu70s' },
  { label: 'Minimal Techno', value: 'minimaltechno' },
  { label: 'Deep House', value: 'deephouse' },
  { label: 'Progressive Psych', value: 'progressivepsych' },
  { label: 'Synthwave', value: 'synthwave' },
  { label: 'Bollywood', value: 'bollywood' },
  { label: 'Devotional', value: 'devotional' },
  { label: 'Romantic', value: 'romantic' },
  { label: 'Techno', value: 'techno' },
  { label: 'Psychedelic', value: 'psychedelic' },
  { label: 'Rock', value: 'rock' },
  { label: 'Lo-Fi', value: 'lofi' },
  { label: 'EDM', value: 'edm' },
];

const SIMPLE_CHIPS = STYLE_CHIPS;
const ADV_STYLE_CHIPS = STYLE_CHIPS;

function pickRandom(items, count) {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(count, shuffled.length)));
}

function limitText(value, max, keepBreaks = false) {
  const normalized = String(value || '')
    .replace(keepBreaks ? /[ \t]+/g : /\s+/g, ' ')
    .replace(keepBreaks ? /\n{3,}/g : /^$/, keepBreaks ? '\n\n' : '')
    .trim();
  return normalized.length > max ? normalized.slice(0, max).trimEnd() : normalized;
}

function generateStyleParts(styleKey, { instrumental = false } = {}) {
  const template = STYLE_TEMPLATES[styleKey];
  if (!template) return { prompt: '', styles: '', lyrics: '', negativeTags: '' };

  const theme = template.themes[Math.floor(Math.random() * template.themes.length)];
  const instruments = pickRandom(template.instruments, 2 + Math.floor(Math.random() * 2));
  const descriptors = pickRandom(template.descriptors, 2 + Math.floor(Math.random() * 2));
  const arrangement = template.arrangements[Math.floor(Math.random() * template.arrangements.length)];
  const avoidTags = pickRandom(template.avoidTags, Math.min(5, template.avoidTags.length));
  const negativeTags = avoidTags.join(', ');
  const strictness = 'strict original reference, preserve groove, instrumentation, tempo feel, mix texture, no copied melody';

  const prompt = limitText(
    `${template.label}: ${descriptors.join(', ')} track about ${theme}; ${arrangement}; feature ${instruments.join(', ')}. ${strictness}. Avoid: ${negativeTags}.`,
    SIMPLE_PROMPT_MAX
  );
  const styles = limitText([...template.styleTags, ...descriptors, ...instruments, strictness].join(', '), STYLE_MAX);
  const lyrics = instrumental
    ? limitText(
      `Instrumental only: ${arrangement}. Build around ${theme} with ${instruments.join(', ')}. Keep a ${descriptors.join(', ')} character, strong motif variation, clear intro-build-peak-outro flow, no vocals, no lyrics. Avoid: ${negativeTags}.`,
      LYRICS_MAX
    )
    : limitText(
      `[Song Brief]\nOriginal ${template.label} song about ${theme}. ${arrangement}. Use ${instruments.join(', ')} with a ${descriptors.join(', ')} mood.\n\n[Hook Direction]\nMemorable, fresh hook; do not copy any existing melody or lyrics.\n\nAvoid: ${negativeTags}.`,
      LYRICS_MAX,
      true
    );

  return { prompt, styles, lyrics, negativeTags };
}

function inferStyleKey(stylesValue) {
  const text = String(stylesValue || '').toLowerCase();
  return Object.entries(STYLE_TEMPLATES).find(([key, template]) => (
    text.includes(key)
    || text.includes(template.label.toLowerCase())
    || template.styleTags.some(tag => text.includes(tag.toLowerCase()))
  ))?.[0];
}

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
    .filter(c => {
      const template = STYLE_TEMPLATES[c.value];
      const stylesText = styles.toLowerCase();
      return template?.styleTags.some(tag => stylesText.includes(tag.toLowerCase()));
    })
    .map(c => c.value);

  const applyStyleChip = (styleKey) => {
    const generated = generateStyleParts(styleKey, { instrumental: isInstrumental });
    if (tab === 'simple') {
      onSimplePromptChange(generated.prompt);
      return;
    }

    onStylesChange(generated.styles);
    onLyricsChange(generated.lyrics);
    onNegativeTagChange?.(generated.negativeTags);
  };

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
      if (isInstrumental) {
        const styleKeys = Object.keys(STYLE_TEMPLATES);
        const styleKey = inferStyleKey(styles) || styleKeys[Math.floor(Math.random() * styleKeys.length)];
        const generated = generateStyleParts(styleKey, { instrumental: true });
        if (!styles.trim()) onStylesChange(generated.styles);
        onLyricsChange(generated.lyrics);
        if (!negativeTag.trim()) onNegativeTagChange?.(generated.negativeTags);
        toast.success('Instrumental structure generated');
        return;
      }

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
      const inferredStyleKey = inferStyleKey(response?.styles || styles);
      if (!negativeTag.trim() && inferredStyleKey) {
        onNegativeTagChange?.(generateStyleParts(inferredStyleKey).negativeTags);
      }
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
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-3 pb-20 md:pb-3">

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
            <HChipRow chips={SIMPLE_CHIPS} onPick={applyStyleChip} />
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
              <HChipRow chips={ADV_STYLE_CHIPS} onPick={applyStyleChip} activeValues={activeStyleValues} />
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
              <HChipRow chips={ADV_STYLE_CHIPS} onPick={v => onStylesChange(generateStyleParts(v).styles)} />
            </PanelSection>
          </>
        )}
      </div>

      {/* Generate button footer */}
      <div
        className="flex-shrink-0 md:static fixed left-0 right-0 z-30 px-4 pb-4 pt-3 border-t"
        style={{ bottom: 'var(--mobile-nav-reserve, 0px)', borderColor: 'rgba(255,255,255,0.08)', background: '#0a0a0f', backdropFilter: 'blur(8px)' }}
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
