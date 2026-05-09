// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { useAlbumColor } from '@/components/audio/AlbumColorExtractor';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft, Play, Pause, Heart, Share2, Edit3, Music,
  Clock, Mic2, Globe, Lock, Save, X, Check, TrendingUp, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TrackInfoPage() {
  const params = new URLSearchParams(window.location.search);
  const trackId = params.get('id');

  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [albumColor, setAlbumColor] = useState(null);
  const queryClient = useQueryClient();
  const { playTrack, currentTrack, isPlaying, pauseTrack } = useAudioPlayer();

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: track, isLoading } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => base44.entities.Track.filter({ id: trackId }, '-created_date', 1).then(r => r[0]),
    enabled: !!trackId,
  });

  useAlbumColor(track?.cover_image_url, setAlbumColor);

  useEffect(() => {
    if (track) setEditData({ title: track.title, style: track.style || '', lyrics: track.lyrics || '', prompt: track.prompt || '' });
  }, [track]);

  const isOwner = user && track && user.email === track.created_by;
  const isCurrentlyPlaying = currentTrack?.id === track?.id && isPlaying;
  const artistName = `Accoustica-${(track?.created_by || '').split('@')[0]}`;
  const c = albumColor?.css || 'rgba(124,58,237';

  const handleSave = async () => {
    if (!track) return;
    setIsSaving(true);
    haptics.medium();
    try {
      await base44.entities.Track.update(track.id, editData);
      queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      setIsEditing(false);
      toast.success('Track updated!');
      haptics.success();
    } catch {
      toast.error('Failed to save');
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!track) return;
    haptics.light();
    await base44.entities.Track.update(track.id, { is_favorite: !track.is_favorite });
    queryClient.invalidateQueries({ queryKey: ['track', trackId] });
  };

  const handleTogglePublic = async () => {
    if (!track) return;
    haptics.light();
    await base44.entities.Track.update(track.id, { is_public: !track.is_public });
    queryClient.invalidateQueries({ queryKey: ['track', trackId] });
    toast.success(track.is_public ? 'Track is now private' : 'Track is now public');
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: track?.title, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
    haptics.light();
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const TABS = [
    { id: 'info', label: 'Info' },
    { id: 'lyrics', label: 'Lyrics' },
    { id: 'stats', label: 'Stats' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Music className="h-16 w-16 text-white/10" />
        <p className="text-white/40">Track not found</p>
        <Link to="/Library" className="text-violet-400 text-sm">← Back to Library</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-36">
      {/* Dynamic ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-black" />
        {track.cover_image_url && (
          <img
            src={track.cover_image_url} alt=""
            className="absolute inset-0 w-full h-full object-cover scale-125 opacity-[0.08]"
            style={{ filter: 'blur(80px)' }}
          />
        )}
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse 120% 60% at 30% 0%, ${c},0.18) 0%, transparent 70%), radial-gradient(ellipse 70% 50% at 80% 90%, ${c},0.08) 0%, transparent 60%)`,
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/90" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-3">
        <Link to={-1} onClick={() => haptics.light()}>
          <div className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <ChevronLeft className="h-5 w-5 text-white" />
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => { setIsEditing(!isEditing); haptics.light(); }}
              className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center"
            >
              {isEditing ? <X className="h-4 w-4 text-white/60" /> : <Edit3 className="h-4 w-4 text-white/60" />}
            </button>
          )}
          <button onClick={handleShare} className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <Share2 className="h-4 w-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Album Art Hero */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-4 pb-6">
        <motion.div
          animate={{ scale: isCurrentlyPlaying ? 1 : 0.94 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="relative mb-6"
        >
          <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl"
            style={{ boxShadow: `0 24px 64px ${c},0.45), 0 0 0 1px rgba(255,255,255,0.06)` }}
          >
            {track.cover_image_url ? (
              <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-pink-500/20">
                <Music className="h-16 w-16 text-white/20" />
              </div>
            )}
          </div>
          {/* Beat pulse ring */}
          {isCurrentlyPlaying && (
            <div className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{ boxShadow: `0 0 0 0 ${c},0.5)`, animation: 'pulse-ring 2s ease-out infinite' }}
            />
          )}
        </motion.div>

        {/* Title + Artist */}
        {isEditing ? (
          <input
            value={editData.title}
            onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
            className="text-center text-2xl font-bold text-white bg-transparent border-b border-violet-500/50 focus:outline-none w-full max-w-xs mb-1 pb-1"
          />
        ) : (
          <h1 className="text-2xl font-bold text-white text-center mb-1">{track.title}</h1>
        )}

        <Link to={`/ArtistInfo?email=${encodeURIComponent(track.created_by)}`}>
          <p className="text-sm text-violet-400/80 hover:text-violet-300 transition-colors mb-4">{artistName}</p>
        </Link>

        {/* Play + Actions row */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { haptics.medium(); isCurrentlyPlaying ? pauseTrack() : playTrack(track, [track]); }}
            disabled={track.status !== 'ready'}
            className="w-16 h-16 rounded-full text-white flex items-center justify-center shadow-2xl transition-transform active:scale-95 disabled:opacity-30"
            style={{ background: `linear-gradient(135deg, ${c},1), ${c?.replace('rgba', 'rgb')?.replace(',0.', ',1') || '#ec4899'})` }}
          >
            {isCurrentlyPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
          </button>

          <button onClick={handleToggleFavorite} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
            <Heart className={cn('h-5 w-5', track.is_favorite ? 'text-red-400 fill-red-400' : 'text-white/40')} />
          </button>

          {isOwner && (
            <button onClick={handleTogglePublic} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md">
              {track.is_public ? <Globe className="h-5 w-5 text-emerald-400" /> : <Lock className="h-5 w-5 text-white/40" />}
            </button>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="relative z-10 mx-4 mb-4">
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 backdrop-blur-md border border-white/[0.06]">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); haptics.selection(); }}
              className={cn('flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                activeTab === t.id ? 'text-white' : 'text-white/35')}
              style={activeTab === t.id ? { background: `linear-gradient(135deg, ${c},0.5), ${c},0.3))` } : {}}
            >{t.label}</button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="relative z-10 px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'info' && (
            <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <GlassCard>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Style</p>
                {isEditing ? (
                  <input value={editData.style} onChange={e => setEditData(d => ({ ...d, style: e.target.value }))}
                    placeholder="Genre, mood, style..."
                    className="w-full bg-transparent text-white text-sm focus:outline-none border-b border-white/10" />
                ) : (
                  <p className="text-sm text-white">{track.style || 'No style set'}</p>
                )}
              </GlassCard>

              <GlassCard>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Prompt Used</p>
                {isEditing ? (
                  <textarea value={editData.prompt} onChange={e => setEditData(d => ({ ...d, prompt: e.target.value }))}
                    rows={3} className="w-full bg-transparent text-white text-sm focus:outline-none resize-none border-b border-white/10" />
                ) : (
                  <p className="text-sm text-white/80 leading-relaxed">{track.prompt || '—'}</p>
                )}
              </GlassCard>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Clock, label: 'Duration', value: fmt(track.duration) },
                  { icon: TrendingUp, label: 'Plays', value: track.plays || 0 },
                  { icon: Mic2, label: 'Type', value: track.is_instrumental ? 'Instrumental' : 'Vocal' },
                ].map(({ icon: Icon, label, value }) => (
                  <GlassCard key={label} className="text-center">
                    <Icon className="h-4 w-4 text-white/30 mx-auto mb-1" />
                    <p className="text-sm font-bold text-white">{value}</p>
                    <p className="text-[10px] text-white/30">{label}</p>
                  </GlassCard>
                ))}
              </div>

              {isEditing && (
                <button onClick={handleSave} disabled={isSaving}
                  className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  style={{ background: `linear-gradient(135deg, ${c},0.9), ${c},0.7))` }}
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Save Changes</>}
                </button>
              )}
            </motion.div>
          )}

          {activeTab === 'lyrics' && (
            <motion.div key="lyrics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <GlassCard>
                {isEditing ? (
                  <>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Lyrics</p>
                    <textarea value={editData.lyrics} onChange={e => setEditData(d => ({ ...d, lyrics: e.target.value }))}
                      rows={12} placeholder="Paste or write lyrics..."
                      className="w-full bg-transparent text-white text-sm focus:outline-none resize-none font-mono" />
                    <button onClick={handleSave} disabled={isSaving}
                      className="mt-3 w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${c},0.6), ${c},0.4))` }}
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Lyrics</>}
                    </button>
                  </>
                ) : track.lyrics ? (
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap font-mono">{track.lyrics}</p>
                ) : (
                  <div className="py-8 text-center">
                    <Mic2 className="h-10 w-10 text-white/10 mx-auto mb-2" />
                    <p className="text-white/30 text-sm">No lyrics available</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {[
                { label: 'Total Plays', value: track.plays || 0, icon: TrendingUp },
                { label: 'Status', value: track.status, icon: Check },
                { label: 'Visibility', value: track.is_public ? 'Public' : 'Private', icon: track.is_public ? Globe : Lock },
                { label: 'Model', value: track.model_version || 'V5', icon: Mic2 },
                { label: 'Created', value: track.created_date ? new Date(track.created_date).toLocaleDateString() : '—', icon: Clock },
              ].map(({ label, value, icon: Icon }) => (
                <GlassCard key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c},0.15)` }}>
                      <Icon className="h-4 w-4" style={{ color: albumColor ? `rgb(${albumColor.r},${albumColor.g},${albumColor.b})` : '#a855f7' }} />
                    </div>
                    <p className="text-sm text-white/70">{label}</p>
                  </div>
                  <p className="text-sm font-semibold text-white capitalize">{value}</p>
                </GlassCard>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 ${c},0.5); }
          70% { box-shadow: 0 0 0 24px ${c},0); }
          100% { box-shadow: 0 0 0 0 ${c},0); }
        }
      `}</style>
    </div>
  );
}

function GlassCard({ children, className }) {
  return (
    <div className={cn('bg-white/[0.04] backdrop-blur-md border border-white/[0.06] rounded-2xl p-4', className)}>
      {children}
    </div>
  );
}