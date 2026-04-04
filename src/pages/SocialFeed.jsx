import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Play, Pause, Heart, MessageCircle, Share2, Send, Zap,
  Loader2, Music, Clock, TrendingUp, Globe, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SocialFeedPage() {
  const [user, setUser] = useState(null);
  const [commentInput, setCommentInput] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [following, setFollowing] = useState({});
  const { playTrack, currentTrack, isPlaying, currentTime } = useAudioPlayer();
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['socialFeed'],
    queryFn: () => base44.entities.Track.filter({ is_public: true, status: 'ready' }, '-created_date', 30),
    refetchInterval: 15000, // live refresh every 15s
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['feedComments'],
    queryFn: () => base44.entities.TrackComment.list('-created_date', 200),
    refetchInterval: 10000,
  });

  const { data: likes = [] } = useQuery({
    queryKey: ['trackLikes'],
    queryFn: () => base44.entities.TrackLike.list('-created_date', 500),
  });

  const getTrackComments = (trackId) => comments.filter(c => c.track_id === trackId);
  const getTrackLikes = (trackId) => likes.filter(l => l.track_id === trackId && l.type === 'like');
  const isLiked = (trackId) => !!likes.find(l => l.track_id === trackId && l.user_email === user?.email && l.type === 'like');

  const handleLike = async (track) => {
    if (!user) { toast.error('Sign in to like tracks'); return; }
    haptics.light();
    const existing = likes.find(l => l.track_id === track.id && l.user_email === user.email);
    if (existing) {
      await base44.entities.TrackLike.delete(existing.id);
    } else {
      await base44.entities.TrackLike.create({ track_id: track.id, user_email: user.email, type: 'like' });
    }
    queryClient.invalidateQueries({ queryKey: ['trackLikes'] });
  };

  const handleComment = async (track) => {
    const text = commentInput[track.id]?.trim();
    if (!text || !user) return;
    haptics.medium();
    const ts = Math.round(currentTrack?.id === track.id ? currentTime : 0);
    await base44.entities.TrackComment.create({
      track_id: track.id,
      user_email: user.email,
      user_name: user.full_name || user.email.split('@')[0],
      comment_text: text,
      timestamp_seconds: ts,
    });
    setCommentInput(p => ({ ...p, [track.id]: '' }));
    queryClient.invalidateQueries({ queryKey: ['feedComments'] });
    toast.success('Comment posted!');
  };

  const handleShare = (track) => {
    haptics.light();
    const url = `${window.location.origin}/TrackInfo?id=${track.id}`;
    if (navigator.share) {
      navigator.share({ title: track.title, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-black pb-36">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 40% at 20% 10%, rgba(124,58,237,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(236,72,153,0.07) 0%, transparent 60%)',
        }} />
      </div>

      {/* Header */}
      <div className="relative z-10 sticky top-0 bg-black/70 backdrop-blur-2xl border-b border-white/[0.06] px-4 pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Feed</h1>
            <p className="text-[11px] text-white/30">Live stream of new tracks</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-400 border border-emerald-500/30" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="relative z-10 space-y-3 px-4 pt-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="h-12 w-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No public tracks yet</p>
          </div>
        ) : (
          tracks.map((track, i) => {
            const trackComments = getTrackComments(track.id);
            const trackLikes = getTrackLikes(track.id);
            const liked = isLiked(track.id);
            const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
            const artistHandle = `Accoustica-${(track.created_by || '').split('@')[0]}`;
            const showComments = expandedComments[track.id];

            return (
              <motion.article
                key={track.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white/[0.04] backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden"
              >
                {/* Artist row */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  <Link to={`/ArtistInfo?email=${encodeURIComponent(track.created_by)}`}>
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-gradient-to-br from-violet-500/30 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                      {track.cover_image_url ? (
                        <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="h-4 w-4 text-white/30" />
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/ArtistInfo?email=${encodeURIComponent(track.created_by)}`}>
                      <p className="text-sm font-semibold text-white hover:text-violet-300 transition-colors">{artistHandle}</p>
                    </Link>
                    <p className="text-[11px] text-white/30">{track.created_date ? new Date(track.created_date).toLocaleDateString() : ''}</p>
                  </div>
                  <button
                    onClick={() => { setFollowing(f => ({ ...f, [track.created_by]: !f[track.created_by] })); haptics.light(); }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all',
                      following[track.created_by] ? 'bg-white/10 text-white/50 border border-white/10' : 'text-violet-300 border border-violet-500/40'
                    )}
                    style={!following[track.created_by] ? { background: 'rgba(124,58,237,0.15)' } : {}}
                  >
                    {following[track.created_by] ? 'Following' : 'Follow'}
                  </button>
                </div>

                {/* Track card */}
                <div className="relative mx-4 mb-3 rounded-2xl overflow-hidden">
                  {/* Cover art */}
                  <div className="relative aspect-video sm:aspect-[2/1] bg-black overflow-hidden">
                    {track.cover_image_url ? (
                      <>
                        <img src={track.cover_image_url} alt={track.title}
                          className="absolute inset-0 w-full h-full object-cover scale-110 opacity-60"
                          style={{ filter: 'blur(20px)' }} />
                        <img src={track.cover_image_url} alt={track.title}
                          className="relative z-10 h-full mx-auto object-contain" />
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center">
                        <Music className="h-16 w-16 text-white/20" />
                      </div>
                    )}
                    {/* Play overlay */}
                    <button
                      onClick={() => { haptics.medium(); playTrack(track, tracks); }}
                      className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md bg-black/40 border border-white/20 shadow-2xl">
                        {isCurrentlyPlaying ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 text-white ml-1" />}
                      </div>
                    </button>
                    {/* Now playing indicator */}
                    {isCurrentlyPlaying && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 z-20" style={{ background: 'linear-gradient(90deg, #7c3aed, #ec4899)' }} />
                    )}
                  </div>

                  {/* Track info */}
                  <div className="bg-black/40 backdrop-blur-md px-4 py-3 border-t border-white/[0.06]">
                    <Link to={`/TrackInfo?id=${track.id}`}>
                      <h3 className="font-semibold text-white hover:text-violet-300 transition-colors truncate">{track.title}</h3>
                    </Link>
                    <p className="text-xs text-white/40 truncate mt-0.5">{track.style || 'AI Generated'}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 px-4 pb-3">
                  <button onClick={() => handleLike(track)}
                    className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all', liked ? 'text-red-400' : 'text-white/40 hover:text-white/70')}
                    style={liked ? { background: 'rgba(239,68,68,0.1)' } : {}}
                  >
                    <Heart className={cn('h-4 w-4', liked && 'fill-red-400')} />
                    <span className="text-[12px]">{trackLikes.length || ''}</span>
                  </button>

                  <button
                    onClick={() => { setExpandedComments(p => ({ ...p, [track.id]: !p[track.id] })); haptics.selection(); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 transition-all"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-[12px]">{trackComments.length || ''}</span>
                  </button>

                  <button onClick={() => handleShare(track)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white/40 hover:text-white/70 transition-all">
                    <Share2 className="h-4 w-4" />
                  </button>

                  <div className="flex-1" />
                  <div className="flex items-center gap-1 text-white/20 text-[11px]">
                    <TrendingUp className="h-3 w-3" />
                    {track.plays || 0}
                  </div>
                </div>

                {/* Comments */}
                <AnimatePresence>
                  {showComments && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-white/[0.06]"
                    >
                      <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
                        {trackComments.length === 0 ? (
                          <p className="text-xs text-white/25 text-center py-2">No comments yet</p>
                        ) : (
                          trackComments.slice(-10).map(c => (
                            <div key={c.id} className="flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/30 to-pink-500/20 flex-shrink-0" />
                              <div>
                                <span className="text-[11px] font-semibold text-violet-400">{c.user_name} </span>
                                <span className="text-[11px] text-white/60">{c.comment_text}</span>
                                {c.timestamp_seconds > 0 && (
                                  <span className="text-[10px] text-white/25 ml-1">@ {fmt(c.timestamp_seconds)}</span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {user && (
                        <div className="flex gap-2 px-4 pb-3">
                          <input
                            value={commentInput[track.id] || ''}
                            onChange={e => setCommentInput(p => ({ ...p, [track.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleComment(track)}
                            placeholder="Add a comment..."
                            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/40"
                          />
                          <button onClick={() => handleComment(track)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.7), rgba(236,72,153,0.6))' }}>
                            <Send className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })
        )}
      </div>
    </div>
  );
}