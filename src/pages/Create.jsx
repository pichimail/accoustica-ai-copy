import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { Link } from 'react-router-dom';
import {
  Sparkles, Wand2, Shuffle, Loader2, Play, Pause,
  Music, ChevronDown, ChevronUp, Upload, Layers, Zap,
  Dice5, RefreshCw, Link2, Mic2, ChevronRight, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SwipeChips from '@/components/create/SwipeChips';
import MashupRemix from '@/components/create/MashupRemix';

const MODES = [
  { id: 'sketch', label: 'Sketch', icon: Sparkles },
  { id: 'studio', label: 'Studio', icon: Wand2 },
  { id: 'mashup', label: 'Mashup', icon: Shuffle },
];

const PROMPT_PALETTE = [
  '🎸 dreamy guitar reverb', '🥁 punchy 808 drums', '🎹 vintage Rhodes piano',
  '🌊 ambient ocean waves', '🎺 warm brass section', '🎻 lush string orchestra',
  '🤖 glitchy synth bass', '🌙 lo-fi midnight vibes', '🔥 aggressive trap hi-hats',
  '💫 ethereal female vocals', '🪗 folk acoustic strum', '🎷 smoky jazz saxophone',
  '🌸 K-Pop euphoric drop', '🧊 cold industrial beat', '☀️ Afrobeats groove',
  '🎤 raw rap flow', '🌺 Bossa Nova sway', '🌈 psychedelic prog rock',
  '🎙️ breathy ASMR vocal', '⚡ EDM festival drop',
];

const GENRE_CHIPS = [
  'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical',
  'Ambient', 'Lo-Fi', 'R&B', 'Country', 'Metal', 'Indie',
  'Funk', 'Soul', 'Reggae', 'Blues', 'Folk', 'Cinematic',
  'Trap', 'House', 'Drill', 'Afrobeats', 'K-Pop', 'Bossa Nova',
  'Carnatic', 'Bollywood', 'Telugu Folk', 'Hindi Pop',
];

const MOOD_CHIPS = [
  'Energetic', 'Chill', 'Dark', 'Happy', 'Melancholic',
  'Romantic', 'Epic', 'Dreamy', 'Aggressive', 'Peaceful',
  'Mysterious', 'Uplifting', 'Nostalgic', 'Tense', 'Playful',
];

const CULTURE_CHIPS = [
  'Telugu', 'Hindi', 'Tamil', 'Punjabi', 'Bengali', 'Marathi',
  'English', 'Korean', 'Spanish', 'French',
];

function getSuggestedChips(allChips, selected) {
  const affinityMap = {
    'Hip-Hop': ['Trap', 'R&B', 'Drill', 'Lo-Fi'],
    'Electronic': ['House', 'Ambient', 'EDM'],
    'Jazz': ['Bossa Nova', 'Blues', 'Soul'],
    'Pop': ['K-Pop', 'Indie', 'R&B', 'Bollywood'],
    'Rock': ['Metal', 'Indie', 'Blues', 'Folk'],
    'Energetic': ['Epic', 'Aggressive'],
    'Chill': ['Dreamy', 'Peaceful', 'Lo-Fi'],
    'Dark': ['Mysterious', 'Tense', 'Melancholic'],
    'Telugu': ['Carnatic', 'Telugu Folk'],
    'Hindi': ['Bollywood', 'Hindi Pop'],
  };
  const suggestions = new Set();
  selected.forEach(s => (affinityMap[s] || []).forEach(r => {
    if (!selected.includes(r) && allChips.includes(r)) suggestions.add(r);
  }));
  const rest = allChips.filter(c => !selected.includes(c) && !suggestions.has(c));
  return [...suggestions, ...rest];
}

export default function CreatePage() {
  const [mode, setMode] = useState('sketch');
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [refLink, setRefLink] = useState('');
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [generatingTrackId, setGeneratingTrackId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [vocalTone, setVocalTone] = useState('auto');
  const [chaosGuard, setChaosGuard] = useState(30);
  const [styleGrip, setStyleGrip] = useState(70);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [isImprovingLyrics, setIsImprovingLyrics] = useState(false);
  const queryClient = useQueryClient();
  const { playTrack } = useAudioPlayer();

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.Plan.list(),
  });

  useEffect(() => {
    if (plans.length > 0) {
      const plan = user?.plan_id ? plans.find(p => p.id === user.plan_id) : null;
      setUserPlan(plan || plans.find(p => p.name?.toLowerCase() === 'free') || plans[0]);
    }
  }, [user, plans]);

  const { data: recentTracks = [] } = useQuery({
    queryKey: ['createRecentTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Track.filter({ created_by: user.email }, '-created_date', 8);
    },
    enabled: !!user?.email,
    refetchInterval: (data) => {
      const hasGenerating = Array.isArray(data) && data.some(t => t.status === 'generating' || t.status === 'queued');
      return hasGenerating ? 2000 : false;
    },
  });

  const dailyUsage = user?.last_usage_reset === new Date().toISOString().split('T')[0] ? (user?.daily_usage || 0) : 0;
  const dailyLimit = userPlan?.daily_limit || 5;
  const remaining = Math.max(0, dailyLimit - dailyUsage);

  const toggleGenre = (s) => { haptics.selection(); setSelectedGenres(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); };
  const toggleMood = (m) => { haptics.selection(); setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]); };
  const toggleLanguage = (l) => { haptics.selection(); setSelectedLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]); };

  const buildStyle = () => [...selectedGenres, ...selectedMoods, ...selectedLanguages, style].filter(Boolean).join(', ');

  const handleImprovePrompt = async () => {
    if (!prompt.trim()) return;
    setIsImprovingPrompt(true);
    haptics.light();
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Refine this music description into a concise, evocative prompt under 500 characters. Preserve the intent but make it more specific and creative: "${prompt}"`,
      });
      setPrompt(typeof res === 'string' ? res.slice(0, 500) : String(res).slice(0, 500));
      toast.success('Prompt improved!');
      haptics.success();
    } catch { toast.error('Could not improve prompt'); }
    finally { setIsImprovingPrompt(false); }
  };

  const handleRandomPrompt = async () => {
    setIsImprovingPrompt(true);
    haptics.medium();
    try {
      const genres = selectedGenres.length ? selectedGenres.join(', ') : 'any genre';
      const moods = selectedMoods.length ? selectedMoods.join(', ') : 'any mood';
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a short, creative, evocative music-generation prompt (under 400 chars) for a song in these styles: ${genres}, moods: ${moods}. Be specific about instruments, vocals, and atmosphere.`,
      });
      setPrompt(typeof res === 'string' ? res.slice(0, 400) : String(res).slice(0, 400));
      toast.success('Random prompt generated!');
      haptics.success();
    } catch { toast.error('Could not generate prompt'); }
    finally { setIsImprovingPrompt(false); }
  };

  const handleImproveLyrics = async () => {
    if (!lyrics.trim()) return;
    setIsImprovingLyrics(true);
    haptics.light();
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Sharpen these song lyrics. Keep the meaning and language, but improve rhyme, rhythm, and emotional impact. Return ONLY the improved lyrics:\n\n${lyrics}`,
      });
      setLyrics(typeof res === 'string' ? res : String(res));
      toast.success('Lyrics improved!');
      haptics.success();
    } catch { toast.error('Could not improve lyrics'); }
    finally { setIsImprovingLyrics(false); }
  };

  const appendPaletteChip = (chip) => {
    haptics.selection();
    const clean = chip.replace(/^[\u{1F300}-\u{1FAD6}]\s*/u, '');
    setPrompt(prev => prev ? `${prev}, ${clean}` : clean);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let finalPrompt = prompt.trim();
      if (!finalPrompt && mode === 'sketch') throw new Error('Please describe your music');
      if (!lyrics.trim() && mode === 'studio') throw new Error('Please add lyrics in Studio mode');
      if (remaining <= 0) throw new Error('Daily limit reached');

      const today = new Date().toISOString().split('T')[0];
      await base44.auth.updateMe({
        daily_usage: dailyUsage + 1,
        last_usage_reset: today,
        monthly_usage: (user?.monthly_usage || 0) + 1,
        total_tracks: (user?.total_tracks || 0) + 1,
        last_active: new Date().toISOString(),
      });

      const isStudio = mode === 'studio';
      const response = await base44.functions.invoke('generateMusic', {
        mode: isInstrumental ? 'instrumental' : (isStudio ? 'custom' : 'simple'),
        model: 'V5',
        prompt: isStudio ? lyrics : finalPrompt,
        style: buildStyle() || 'Pop',
        title: title || (isStudio ? '' : finalPrompt.slice(0, 40)) || 'Untitled',
        customMode: isStudio,
        instrumental: isInstrumental,
      });
      if (!response.data.success) throw new Error(response.data.error || 'Failed to start generation');
      setGeneratingTrackId(response.data.taskId);
      pollStatus(response.data.taskId);
      return response.data;
    },
    onSuccess: () => {
      haptics.success();
      toast.success('Generating your track!');
      setPrompt(''); setTitle(''); setSelectedGenres([]); setSelectedMoods([]); setLyrics(''); setStyle('');
      queryClient.invalidateQueries({ queryKey: ['createRecentTracks'] });
    },
    onError: (e) => { haptics.error(); toast.error(e.message); },
  });

  const pollStatus = async (taskId) => {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const res = await base44.functions.invoke('checkMusicStatus', { taskId });
        if (res.data.success) {
          const tracks = res.data.tracks || [];
          if (tracks.length > 0 && tracks.every(t => t.status === 'ready')) {
            setGeneratingTrackId(null);
            queryClient.invalidateQueries({ queryKey: ['createRecentTracks'] });
            toast.success('Track ready!');
            return;
          }
          if (tracks.some(t => t.status === 'failed')) {
            setGeneratingTrackId(null);
            toast.error('Generation failed');
            queryClient.invalidateQueries({ queryKey: ['createRecentTracks'] });
            return;
          }
        }
        if (attempts < 60) setTimeout(poll, 2000);
        else { setGeneratingTrackId(null); toast.error('Timed out'); }
      } catch { setGeneratingTrackId(null); }
    };
    poll();
  };

  const isGenerating = !!generatingTrackId || createMutation.isPending;
  const canGenerate = mode === 'studio' ? !!lyrics.trim() : !!prompt.trim();

  const suggestedGenres = getSuggestedChips(GENRE_CHIPS, selectedGenres);
  const suggestedMoods = getSuggestedChips(MOOD_CHIPS, selectedMoods);
  const suggestedLanguages = getSuggestedChips(CULTURE_CHIPS, selectedLanguages);

  return (
    <div className="min-h-screen pb-40" style={{ background: '#0a0a0f' }}>
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(192,132,252,0.08) 0%, transparent 60%)',
        }} />
      </div>

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h1 className="text-2xl font-bold text-white mb-3">Create</h1>
        <div className="flex gap-1 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {MODES.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setMode(id); haptics.light(); }}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all',
                mode === id ? 'text-black' : 'text-white/40 hover:text-white/70')}
              style={mode === id ? { background: '#22c55e', boxShadow: '0 0 16px rgba(34,197,94,0.35)' } : {}}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative z-10 px-4 pt-5 space-y-4 max-w-2xl mx-auto">
        {/* Usage bar */}
        <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.04]">
          <div className="flex-1">
            <div className="flex justify-between text-[11px] text-white/30 mb-1.5">
              <span>Daily generations</span><span>{dailyUsage}/{dailyLimit}</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(dailyUsage / dailyLimit) * 100}%`, background: 'linear-gradient(90deg, #7c3aed, #ec4899)' }} />
            </div>
          </div>
          <span className={cn('text-sm font-semibold tabular-nums', remaining > 0 ? 'text-violet-400' : 'text-red-400')}>{remaining} left</span>
        </div>

        {/* MASHUP */}
        {mode === 'mashup' && (
          <MashupRemix recentTracks={recentTracks} user={user}
            onNewTrack={() => { queryClient.invalidateQueries({ queryKey: ['createRecentTracks'] }); toast.success('Mashup generating!'); }}
          />
        )}

        {/* SKETCH */}
        {mode === 'sketch' && (
          <div className="space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Song Description</label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe the vibe, mood, instruments, vocal feel, and language of your song..."
                rows={4}
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none transition-colors"
              />
              {/* AI Buttons */}
              <div className="flex gap-2">
                <button onClick={handleRandomPrompt} disabled={isImprovingPrompt}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/60 border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] active:scale-95 transition-all disabled:opacity-40"
                >
                  {isImprovingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Dice5 className="h-3.5 w-3.5" />}
                  AI Random
                </button>
                <button onClick={handleImprovePrompt} disabled={isImprovingPrompt || !prompt.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-violet-400 border border-violet-500/30 bg-violet-500/[0.08] hover:bg-violet-500/[0.15] active:scale-95 transition-all disabled:opacity-40"
                >
                  {isImprovingPrompt ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  AI Improve
                </button>
              </div>
            </div>

            {/* Prompt Palette */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Prompt Palette</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {PROMPT_PALETTE.map((chip) => (
                  <button key={chip} onClick={() => appendPaletteChip(chip)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] border border-white/[0.08] text-white/60 hover:bg-violet-500/20 hover:border-violet-500/40 hover:text-violet-300 active:scale-95 transition-all whitespace-nowrap">
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre + Mood chips */}
            <SwipeChips label="Genre" chips={suggestedGenres} selected={selectedGenres} onToggle={toggleGenre} accent="violet" />
            <SwipeChips label="Mood" chips={suggestedMoods} selected={selectedMoods} onToggle={toggleMood} accent="pink" />
            <SwipeChips label="Language" chips={suggestedLanguages} selected={selectedLanguages} onToggle={toggleLanguage} accent="blue" />

            {/* Title */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Title (optional)</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your track a name..."
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-colors" />
            </div>

            {/* Instrumental */}
            <InstrumentalToggle value={isInstrumental} onChange={setIsInstrumental} />
          </div>
        )}

        {/* STUDIO */}
        {mode === 'studio' && (
          <div className="space-y-4">
            {/* Lyrics */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Lyrics</label>
              <textarea value={lyrics} onChange={e => setLyrics(e.target.value)}
                placeholder="Write or paste your custom song lyrics here..."
                rows={6}
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none font-mono transition-colors" />
              <button onClick={handleImproveLyrics} disabled={isImprovingLyrics || !lyrics.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-violet-400 border border-violet-500/30 bg-violet-500/[0.08] hover:bg-violet-500/[0.15] active:scale-95 transition-all disabled:opacity-40"
              >
                {isImprovingLyrics ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                AI Improve Lyrics
              </button>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Style</label>
              <textarea value={style} onChange={e => setStyle(e.target.value)}
                placeholder={`e.g. "airy female vocal, vintage tape warmth, pulsing synth bass"`}
                rows={2}
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none transition-colors" />
              <SwipeChips label="" chips={suggestedGenres} selected={selectedGenres} onToggle={toggleGenre} accent="violet" />
              <SwipeChips label="" chips={suggestedMoods} selected={selectedMoods} onToggle={toggleMood} accent="pink" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title..."
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-colors" />
            </div>

            {/* Reference audio */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Reference (optional)</label>
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3">
                <Link2 className="h-4 w-4 text-white/20 flex-shrink-0" />
                <input value={refLink} onChange={e => setRefLink(e.target.value)} placeholder="YouTube or audio URL..."
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-white/20 focus:outline-none" />
              </div>
            </div>

            {/* Instrumental */}
            <InstrumentalToggle value={isInstrumental} onChange={setIsInstrumental} />

            {/* Advanced Panel */}
            <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
              <button onClick={() => { setShowAdvanced(!showAdvanced); haptics.selection(); }}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <span className="text-sm font-medium text-white/50">Advanced Options</span>
                {showAdvanced ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
              </button>
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 pt-2 space-y-4">
                      {/* Vocal Tone */}
                      <div>
                        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2">Vocal Tone</p>
                        <div className="flex gap-2">
                          {['auto', 'male', 'female'].map(v => (
                            <button key={v} onClick={() => { setVocalTone(v); haptics.selection(); }}
                              className={cn('flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all border',
                                vocalTone === v ? 'text-white border-violet-500/50' : 'text-white/35 border-white/[0.06] bg-white/[0.02]')}
                              style={vocalTone === v ? { background: 'rgba(124,58,237,0.2)' } : {}}
                            >{v}</button>
                          ))}
                        </div>
                      </div>
                      {/* Sliders */}
                      <SliderRow label="Chaos Guard" subLabel="Weirdness" value={chaosGuard} onChange={setChaosGuard} />
                      <SliderRow label="Style Grip" subLabel="Style Influence" value={styleGrip} onChange={setStyleGrip} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Generate Button */}
        {mode !== 'mashup' && (
          <button
            onClick={() => createMutation.mutate()}
            disabled={isGenerating || !canGenerate || remaining <= 0}
            className={cn('w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2',
              isGenerating || !canGenerate || remaining <= 0 ? 'text-white/30 cursor-not-allowed' : 'text-black active:scale-[0.98]')}
            style={!isGenerating && canGenerate && remaining > 0 ? {
              background: '#22c55e',
              boxShadow: '0 0 30px rgba(34,197,94,0.4)',
            } : { background: 'rgba(255,255,255,0.06)' }}
          >
            {isGenerating ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Generating…</>
            ) : remaining <= 0 ? 'Daily Limit Reached' : (
              <><Sparkles className="h-5 w-5" /> Generate Track</>
            )}
          </button>
        )}

        {/* Recent Tracks */}
        {recentTracks.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Recent</h2>
            <div className="space-y-2">
              <AnimatePresence>
                {recentTracks.map((track) => (
                  <RecentTrackRow key={track.id} track={track} onPlay={() => {
                    if (track.status === 'ready') playTrack(track, recentTracks.filter(t => t.status === 'ready'));
                  }} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InstrumentalToggle({ value, onChange }) {
  return (
    <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
      <div>
        <p className="text-sm font-medium text-white">Instrumental only</p>
        <p className="text-xs text-white/30">No vocals, pure music</p>
      </div>
      <button onClick={() => { onChange(!value); haptics.light(); }}
        className={cn('w-11 h-6 rounded-full transition-all relative flex-shrink-0', value ? '' : 'bg-white/10')}
        style={value ? { background: 'linear-gradient(90deg, #7c3aed, #ec4899)' } : {}}
      >
        <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all', value ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

function SliderRow({ label, subLabel, value, onChange }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1.5">
        <span className="text-white/50 font-medium">{label} <span className="text-white/25">({subLabel})</span></span>
        <span className="text-violet-400 tabular-nums">{value}%</span>
      </div>
      <input type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(90deg, #7c3aed ${value}%, rgba(255,255,255,0.1) ${value}%)` }}
      />
    </div>
  );
}

function RecentTrackRow({ track, onPlay }) {
  const statusColor = { ready: 'text-emerald-400', generating: 'text-violet-400', queued: 'text-yellow-400', failed: 'text-red-400' };
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
        {track.cover_image_url ? (
          <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Music className="h-4 w-4 text-white/20" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {track.status === 'ready' ? (
          <Link to={`/TrackInfo?id=${track.id}`}>
            <p className="text-sm font-medium text-white truncate hover:text-violet-300 transition-colors">{track.title}</p>
          </Link>
        ) : (
          <p className="text-sm font-medium text-white truncate">{track.title}</p>
        )}
        <p className={cn('text-xs', statusColor[track.status] || 'text-white/30')}>
          {track.status === 'generating' ? 'Generating…' : track.status === 'queued' ? 'In queue…' : track.status}
        </p>
      </div>
      {track.status === 'ready' && (
        <button onClick={onPlay} className="w-8 h-8 rounded-full flex items-center justify-center text-violet-400" style={{ background: 'rgba(124,58,237,0.15)' }}>
          <Play className="h-4 w-4 ml-0.5" />
        </button>
      )}
      {(track.status === 'generating' || track.status === 'queued') && (
        <Loader2 className="h-4 w-4 text-violet-400 animate-spin flex-shrink-0" />
      )}
    </motion.div>
  );
}