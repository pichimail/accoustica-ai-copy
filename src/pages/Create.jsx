import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { 
  Mic, Music, Sparkles, Wand2, ChevronRight, 
  Play, Pause, Loader2, X, Check, Info
} from 'lucide-react';
import { cn } from "@/lib/utils";

const MODES = [
  { id: 'simple', label: 'Simple', icon: Sparkles },
  { id: 'custom', label: 'Custom', icon: Wand2 },
  { id: 'instrumental', label: 'Instrumental', icon: Music },
];

const STYLE_CHIPS = [
  'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical',
  'Ambient', 'Lo-Fi', 'R&B', 'Country', 'Metal', 'Indie',
  'Funk', 'Soul', 'Reggae', 'Blues', 'Folk', 'Cinematic',
];

const MOOD_CHIPS = [
  'Energetic', 'Chill', 'Dark', 'Happy', 'Melancholic',
  'Romantic', 'Epic', 'Dreamy', 'Aggressive', 'Peaceful',
];

export default function CreatePage() {
  const [mode, setMode] = useState('simple');
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [generatingTrackId, setGeneratingTrackId] = useState(null);
  const queryClient = useQueryClient();
  const { playTrack } = useAudioPlayer();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
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
      return await base44.entities.Track.filter({ created_by: user.email }, '-created_date', 6);
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

  const toggleStyle = (s) => {
    haptics.selection();
    setSelectedStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };
  const toggleMood = (m) => {
    haptics.selection();
    setSelectedMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const buildStyle = () => [...selectedStyles, ...selectedMoods].join(', ');

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

      const isInst = mode === 'instrumental' || isInstrumental;
      const response = await base44.functions.invoke('generateMusic', {
        mode: mode === 'instrumental' ? 'instrumental' : (lyrics ? 'custom' : 'simple'),
        model: 'V5',
        prompt: lyrics && mode === 'custom' ? lyrics : prompt,
        style: buildStyle() || 'Pop',
        title: title || prompt.slice(0, 40) || 'Untitled',
        customMode: mode === 'custom',
        instrumental: isInst,
      });

      if (!response.data.success) throw new Error(response.data.error || 'Failed to start generation');

      setGeneratingTrackId(response.data.taskId);
      pollStatus(response.data.taskId);
      return response.data;
    },
    onSuccess: () => {
      haptics.success();
      toast.success('Generating your track!');
      setPrompt(''); setTitle(''); setSelectedStyles([]); setSelectedMoods([]); setLyrics('');
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
          const allReady = tracks.length > 0 && tracks.every(t => t.status === 'ready');
          const anyFailed = tracks.some(t => t.status === 'failed');
          if (allReady) {
            setGeneratingTrackId(null);
            queryClient.invalidateQueries({ queryKey: ['createRecentTracks'] });
            toast.success('Track ready!');
            return;
          }
          if (anyFailed) {
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

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 pt-2 pb-3">
        <h1 className="text-xl font-bold text-white mb-3">Create</h1>

        {/* Mode Switch */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setMode(id); haptics.light(); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
                mode === id
                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-white/50 hover:text-white/80'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-2xl mx-auto">
        {/* Usage bar */}
        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-white/40 mb-1.5">
              <span>Daily generations</span>
              <span>{dailyUsage}/{dailyLimit}</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all"
                style={{ width: `${(dailyUsage / dailyLimit) * 100}%` }}
              />
            </div>
          </div>
          <span className={cn('text-sm font-semibold', remaining > 0 ? 'text-violet-400' : 'text-red-400')}>
            {remaining} left
          </span>
        </div>

        {/* Prompt */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Describe your music</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === 'instrumental'
                ? 'e.g. Cinematic orchestral piece with epic horns and strings...'
                : mode === 'custom'
                ? 'e.g. Upbeat pop song about summer adventures...'
                : 'e.g. A chill lo-fi beat with jazzy chords for studying...'
            }
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 resize-none"
          />
        </div>

        {/* Title (optional) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your track a name..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Style Chips */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Genre</label>
          <div className="flex flex-wrap gap-2">
            {STYLE_CHIPS.map(s => (
              <button
                key={s}
                onClick={() => toggleStyle(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  selectedStyles.includes(s)
                    ? 'bg-violet-500/30 border border-violet-500/60 text-violet-300'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Mood Chips */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Mood</label>
          <div className="flex flex-wrap gap-2">
            {MOOD_CHIPS.map(m => (
              <button
                key={m}
                onClick={() => toggleMood(m)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  selectedMoods.includes(m)
                    ? 'bg-pink-500/30 border border-pink-500/60 text-pink-300'
                    : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Lyrics */}
        {mode === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Custom Lyrics</label>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Write your lyrics here... or leave empty for AI-generated lyrics"
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 resize-none font-mono"
            />
          </motion.div>
        )}

        {/* Instrumental Toggle */}
        {mode !== 'instrumental' && (
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Instrumental only</p>
              <p className="text-xs text-white/40">No vocals, pure music</p>
            </div>
            <button
              onClick={() => { setIsInstrumental(!isInstrumental); haptics.light(); }}
              className={cn(
                'w-12 h-6 rounded-full transition-all relative',
                isInstrumental ? 'bg-violet-500' : 'bg-white/15'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
                isInstrumental ? 'left-6' : 'left-0.5'
              )} />
            </button>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={() => createMutation.mutate()}
          disabled={isGenerating || !prompt.trim() || remaining <= 0}
          className={cn(
            'w-full py-4 rounded-xl font-bold text-white text-base transition-all',
            isGenerating || !prompt.trim() || remaining <= 0
              ? 'bg-white/10 text-white/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-600 to-pink-600 shadow-xl shadow-violet-500/30 active:scale-[0.98]'
          )}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating…
            </span>
          ) : remaining <= 0 ? 'Daily Limit Reached' : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Track
            </span>
          )}
        </button>

        {/* Recent Tracks */}
        {recentTracks.length > 0 && (
          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Recent</h2>
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
  const statusColor = { ready: 'text-emerald-400', generating: 'text-violet-400', queued: 'text-yellow-400', failed: 'text-red-400' };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl p-3"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
        {track.cover_image_url ? (
          <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-4 w-4 text-white/30" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{track.title}</p>
        <p className={cn('text-xs', statusColor[track.status] || 'text-white/40')}>
          {track.status === 'generating' ? 'Generating…' : track.status === 'queued' ? 'In queue…' : track.status}
        </p>
      </div>
      {track.status === 'ready' && (
        <button
          onClick={onPlay}
          className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400"
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