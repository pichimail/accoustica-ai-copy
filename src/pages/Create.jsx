import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import {
  Sparkles, Wand2, Shuffle, Loader2, Play, Pause,
  Music, ChevronDown, ChevronUp, Upload, Layers, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SwipeChips from '@/components/create/SwipeChips';
import MashupRemix from '@/components/create/MashupRemix';
import MultiTrackTimeline from '@/components/studio/MultiTrackTimeline';
import WaveformVisualizer from '@/components/studio/WaveformVisualizer';

const MODES = [
  { id: 'simple', label: 'Simple', icon: Sparkles },
  { id: 'custom', label: 'Custom', icon: Wand2 },
  { id: 'mashup', label: 'Mashup', icon: Shuffle },
];

const GENRE_CHIPS = [
  'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical',
  'Ambient', 'Lo-Fi', 'R&B', 'Country', 'Metal', 'Indie',
  'Funk', 'Soul', 'Reggae', 'Blues', 'Folk', 'Cinematic',
  'Trap', 'House', 'Drill', 'Afrobeats', 'K-Pop', 'Bossa Nova',
];

const MOOD_CHIPS = [
  'Energetic', 'Chill', 'Dark', 'Happy', 'Melancholic',
  'Romantic', 'Epic', 'Dreamy', 'Aggressive', 'Peaceful',
  'Mysterious', 'Uplifting', 'Nostalgic', 'Tense', 'Playful',
];

// Smart chip suggestions based on selection
function getSuggestedChips(allChips, selected) {
  const affinityMap = {
    'Hip-Hop': ['Trap', 'R&B', 'Drill', 'Lo-Fi'],
    'Electronic': ['House', 'Ambient', 'EDM'],
    'Jazz': ['Bossa Nova', 'Blues', 'Soul'],
    'Pop': ['K-Pop', 'Indie', 'R&B'],
    'Rock': ['Metal', 'Indie', 'Blues', 'Folk'],
    'Energetic': ['Epic', 'Aggressive'],
    'Chill': ['Dreamy', 'Peaceful', 'Lo-Fi'],
    'Dark': ['Mysterious', 'Tense', 'Melancholic'],
  };
  const suggestions = new Set();
  selected.forEach(s => {
    (affinityMap[s] || []).forEach(r => {
      if (!selected.includes(r) && allChips.includes(r)) suggestions.add(r);
    });
  });
  // Return suggested first, then the rest
  const suggested = [...suggestions];
  const rest = allChips.filter(c => !selected.includes(c) && !suggestions.has(c));
  return [...suggested, ...rest];
}

export default function CreatePage() {
  const [mode, setMode] = useState('simple');
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [generatingTrackId, setGeneratingTrackId] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineTracks, setTimelineTracks] = useState([]);
  const [uploadedBuffer, setUploadedBuffer] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [isMastering, setIsMastering] = useState(false);
  const fileRef = React.useRef(null);
  const queryClient = useQueryClient();
  const { playTrack } = useAudioPlayer();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

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

  const { data: recentTracks = [], refetch: refetchTracks } = useQuery({
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

  const toggleGenre = (s) => {
    haptics.selection();
    setSelectedGenres(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };
  const toggleMood = (m) => {
    haptics.selection();
    setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const buildStyle = () => [...selectedGenres, ...selectedMoods].join(', ');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!prompt.trim()) throw new Error('Please describe your music');
      if (remaining <= 0) throw new Error('Daily limit reached');
      const today = new Date().toISOString().split('T')[0];
      await base44.auth.updateMe({
        daily_usage: dailyUsage + 1,
        last_usage_reset: today,
        monthly_usage: (user?.monthly_usage || 0) + 1,
        total_tracks: (user?.total_tracks || 0) + 1,
        last_active: new Date().toISOString(),
      });
      const response = await base44.functions.invoke('generateMusic', {
        mode: isInstrumental ? 'instrumental' : (lyrics && mode === 'custom' ? 'custom' : 'simple'),
        model: 'V5',
        prompt: lyrics && mode === 'custom' ? lyrics : prompt,
        style: buildStyle() || 'Pop',
        title: title || prompt.slice(0, 40) || 'Untitled',
        customMode: mode === 'custom',
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
      setPrompt(''); setTitle(''); setSelectedGenres([]); setSelectedMoods([]); setLyrics('');
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

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await ctx.decodeAudioData(ab);
      setUploadedBuffer(buf);
      toast.success('Waveform loaded');
    } catch {
      toast.error('Could not decode audio file');
    }
  };

  const handleMasterNow = async () => {
    setIsMastering(true);
    try {
      // Find a ready track URL
      const track = recentTracks.find(t => t.status === 'ready' && (t.audio_url || t.stream_audio_url));
      if (!track) { toast.error('No ready tracks to master'); setIsMastering(false); return; }
      const res = await base44.functions.invoke('masterAudio', {
        audioUrl: track.audio_url || track.stream_audio_url,
        trackId: track.id,
      });
      if (res.data.success) {
        toast.success('Mastering complete!');
        queryClient.invalidateQueries({ queryKey: ['createRecentTracks'] });
      } else {
        toast.error(res.data.error || 'Mastering failed');
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsMastering(false);
    }
  };

  const isGenerating = !!generatingTrackId || createMutation.isPending;

  const suggestedGenres = getSuggestedChips(GENRE_CHIPS, selectedGenres);
  const suggestedMoods = getSuggestedChips(MOOD_CHIPS, selectedMoods);

  return (
    <div className="min-h-screen bg-black pb-40">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/[0.04] px-4 pt-2 pb-3">
        <h1 className="text-xl font-bold text-white mb-3">Create</h1>

        {/* Mode Switch */}
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setMode(id); haptics.light(); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
                mode === id
                  ? 'text-white shadow-lg'
                  : 'text-white/40 hover:text-white/70'
              )}
              style={mode === id ? {
                background: 'linear-gradient(135deg, rgba(124,58,237,0.8), rgba(236,72,153,0.7))',
                boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
              } : {}}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5 max-w-2xl mx-auto">
        {/* Usage bar */}
        <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3 border border-white/[0.04]">
          <div className="flex-1">
            <div className="flex justify-between text-[11px] text-white/30 mb-1.5">
              <span>Daily generations</span>
              <span>{dailyUsage}/{dailyLimit}</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(dailyUsage / dailyLimit) * 100}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #ec4899)',
                }}
              />
            </div>
          </div>
          <span className={cn('text-sm font-semibold tabular-nums', remaining > 0 ? 'text-violet-400' : 'text-red-400')}>
            {remaining} left
          </span>
        </div>

        {/* ── MASHUP mode ── */}
        {mode === 'mashup' && (
          <MashupRemix
            recentTracks={recentTracks}
            user={user}
            onNewTrack={() => {
              queryClient.invalidateQueries({ queryKey: ['createRecentTracks'] });
              toast.success('Mashup generating!');
            }}
          />
        )}

        {/* ── SIMPLE / CUSTOM modes ── */}
        {mode !== 'mashup' && (
          <>
            {/* Prompt */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Describe your music</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'custom'
                    ? 'e.g. Upbeat pop song about summer adventures...'
                    : 'e.g. A chill lo-fi beat with jazzy chords for studying...'
                }
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none transition-colors"
              />
            </div>

            {/* Title (optional) */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your track a name..."
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-colors"
              />
            </div>

            {/* Genre chips — horizontal swipe, selected removed */}
            <SwipeChips
              label="Genre"
              chips={suggestedGenres}
              selected={selectedGenres}
              onToggle={toggleGenre}
              accent="violet"
            />

            {/* Mood chips */}
            <SwipeChips
              label="Mood"
              chips={suggestedMoods}
              selected={selectedMoods}
              onToggle={toggleMood}
              accent="pink"
            />

            {/* Custom lyrics */}
            {mode === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Custom Lyrics</label>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="Write your lyrics here... or leave empty for AI-generated lyrics"
                  rows={5}
                  className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none font-mono transition-colors"
                />
              </motion.div>
            )}

            {/* Instrumental toggle */}
            <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Instrumental only</p>
                <p className="text-xs text-white/30">No vocals, pure music</p>
              </div>
              <button
                onClick={() => { setIsInstrumental(!isInstrumental); haptics.light(); }}
                className={cn('w-11 h-6 rounded-full transition-all relative flex-shrink-0', isInstrumental ? '' : 'bg-white/10')}
                style={isInstrumental ? { background: 'linear-gradient(90deg, #7c3aed, #ec4899)' } : {}}
              >
                <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all', isInstrumental ? 'left-[22px]' : 'left-0.5')} />
              </button>
            </div>

            {/* Generate Button */}
            <button
              onClick={() => createMutation.mutate()}
              disabled={isGenerating || !prompt.trim() || remaining <= 0}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-white text-base transition-all flex items-center justify-center gap-2',
                isGenerating || !prompt.trim() || remaining <= 0
                  ? 'bg-white/[0.06] text-white/30 cursor-not-allowed'
                  : 'active:scale-[0.98]'
              )}
              style={!isGenerating && prompt.trim() && remaining > 0 ? {
                background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
                boxShadow: '0 8px 32px rgba(124,58,237,0.35)',
              } : {}}
            >
              {isGenerating ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Generating…</>
              ) : remaining <= 0 ? 'Daily Limit Reached' : (
                <><Sparkles className="h-5 w-5" /> Generate Track</>
              )}
            </button>
          </>
        )}

        {/* ── Multi-Track Timeline ── */}
        <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-white/60">
              <Layers className="h-4 w-4" />
              Multi-Track Timeline
              {timelineTracks.length > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] text-violet-400" style={{ background: 'rgba(124,58,237,0.15)' }}>
                  {timelineTracks.length} layers
                </span>
              )}
            </div>
            {showTimeline ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
          </button>
          <AnimatePresence>
            {showTimeline && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-3 space-y-4">
                  <MultiTrackTimeline
                    tracks={recentTracks}
                    onTracksChange={setTimelineTracks}
                  />

                  {/* Waveform section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">Audio Waveform Editor</label>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
                      >
                        <Upload className="h-3 w-3" /> Upload Audio
                      </button>
                      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                    </div>
                    <WaveformVisualizer
                      audioBuffer={uploadedBuffer}
                      onRegionSelect={setSelectedRegion}
                    />
                    {selectedRegion && (
                      <p className="text-[11px] text-violet-400/60">
                        Region selected · Ready for EQ / effects
                      </p>
                    )}
                  </div>

                  {/* Master Now */}
                  {recentTracks.some(t => t.status === 'ready') && (
                    <button
                      onClick={handleMasterNow}
                      disabled={isMastering}
                      className={cn(
                        'w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
                        isMastering ? 'bg-white/[0.05] text-white/30 cursor-not-allowed' : 'text-white active:scale-[0.98]'
                      )}
                      style={!isMastering ? {
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.6), rgba(5,150,105,0.6))',
                        border: '1px solid rgba(16,185,129,0.3)',
                      } : {}}
                    >
                      {isMastering ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Mastering…</>
                      ) : (
                        <><Zap className="h-4 w-4" /> Master Now · EQ + Compression + Loudness</>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Tracks */}
        {recentTracks.length > 0 && (
          <div className="space-y-3 pt-1">
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

function RecentTrackRow({ track, onPlay }) {
  const statusColor = {
    ready: 'text-emerald-400',
    generating: 'text-violet-400',
    queued: 'text-yellow-400',
    failed: 'text-red-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
        {track.cover_image_url ? (
          <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-4 w-4 text-white/20" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{track.title}</p>
        <p className={cn('text-xs', statusColor[track.status] || 'text-white/30')}>
          {track.status === 'generating' ? 'Generating…' : track.status === 'queued' ? 'In queue…' : track.status}
        </p>
      </div>
      {track.status === 'ready' && (
        <button
          onClick={onPlay}
          className="w-8 h-8 rounded-full flex items-center justify-center text-violet-400 transition-all hover:scale-110"
          style={{ background: 'rgba(124,58,237,0.15)' }}
        >
          <Play className="h-4 w-4 ml-0.5" />
        </button>
      )}
      {(track.status === 'generating' || track.status === 'queued') && (
        <Loader2 className="h-4 w-4 text-violet-400 animate-spin flex-shrink-0" />
      )}
    </motion.div>
  );
}