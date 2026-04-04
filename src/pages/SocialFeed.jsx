import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { haptics } from '@/components/utils/haptics';
import { toast } from 'sonner';
import {
  Play, Pause, Heart, MessageCircle, Share2,
  Twitter, Send, Bell, BellOff, Loader2, Clock,
  UserCircle, ChevronDown, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const REFETCH_MS = 15000;

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function fmtSec(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// ─── Timestamp Comment Bubble ──────────────────────────────────────────────────
function TimestampCommentPanel({ track, user, isOpen, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [ts, setTs] = useState(0);
  const [loading, setLoading] = useState(false);
  const { currentTime } = useAudioPlayer();

  useEffect(() => {
    if (!isOpen) return;
    base44.entities.TrackComment.filter({ track_id: track.id }, '-created_date', 30)
      .then(setComments).catch(() => {});
  }, [isOpen, track.id]);

  useEffect(() => { setTs(Math.floor(currentTime || 0)); }, [currentTime]);

  const submit = async () => {
    if (!text.trim() || !user) return;
    setLoading(true);
    try {
      const c = await base44.entities.TrackComment.create({
        track_id: track.id,
        user_email: user.email,
        user_name: user.full_name,
        comment_text: text.trim(),
        timestamp_seconds: ts,
      });
      setComments(prev => [c, ...prev]);
      setText('');
      haptics.success();
    } catch { toast.error('Could not post comment'); }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="mt-3 rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="p-3 space-y-3">
          {/* Input */}
          {user ? (
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTs(Math.floor(currentTime || 0))}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-violet-400 transition-all"
                    style={{ background: 'rgba(124,58,237,0.15)' }}
                  >
                    <Clock className="h-3 w-3" />
                    {fmtSec(ts)}
                  </button>
                  <span className="text-[11px] text-white/20">tap to sync to now</span>
                </div>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
                  placeholder="Add a comment..."
                  className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40"
                />
              </div>
              <button
                onClick={submit}
                disabled={loading || !text.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-white/30 text-center py-1">Sign in to comment</p>
          )}

          {/* Comments list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-xs text-white/20 text-center py-3">No comments yet. Be first!</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2 text-xs">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white/30" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <UserCircle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-medium text-white/70 text-[11px]">{c.user_name || c.user_email?.split('@')[0]}</span>
                    {c.timestamp_seconds > 0 && (
                      <span className="text-violet-400 text-[10px]">@ {fmtSec(c.timestamp_seconds)}</span>
                    )}
                    <span className="text-white/20 text-[10px]">{timeAgo(c.created_date)}</span>
                  </div>
                  <p className="text-white/50 mt-0.5 leading-relaxed">{c.comment_text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Share menu ────────────────────────────────────────────────────────────────
function ShareMenu({ track, onClose }) {
  const url = `${window.location.origin}/PublicTrack?id=${track.id}`;
  const text = `🎵 Check out "${track.title}" – AI generated music by Accoustica`;

  const platforms = [
    {
      name: 'Twitter / X',
      icon: Twitter,
      color: '#1DA1F2',
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`),
    },
    {
      name: 'Copy Link',
      icon: () => (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      color: '#6d28d9',
      action: () => {
        navigator.clipboard.writeText(url);
        toast.success('Link copied!');
        onClose();
      },
    },
    {
      name: 'WhatsApp',
      icon: () => (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: '#25D366',
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute right-0 bottom-full mb-2 z-50 rounded-2xl overflow-hidden w-44"
      style={{ background: 'rgba(20,15,35,0.97)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
    >
      {platforms.map((p) => (
        <button
          key={p.name}
          onClick={() => { haptics.light(); p.action(); }}
          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/[0.05] transition-all"
        >
          <span style={{ color: p.color }}><p.icon /></span>
          {p.name}
        </button>
      ))}
      <button onClick={onClose} className="w-full flex items-center justify-center gap-1 py-2 text-xs text-white/20 hover:text-white/40 border-t border-white/[0.05]">
        <X className="h-3 w-3" /> Close
      </button>
    </motion.div>
  );
}

// ─── Feed Track Card ───────────────────────────────────────────────────────────
function FeedTrackCard({ track, user, following, onFollowToggle }) {
  const { playTrack, currentTrack, isPlaying, currentTime } = useAudioPlayer();
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(0);
  const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
  const isFollowing = following.includes(track.created_by);
  const creator = track.created_by?.split('@')[0] || 'Anonymous';

  const handlePlay = () => {
    haptics.medium();
    playTrack(track);
  };

  const handleLike = () => {
    haptics.light();
    setLiked(v => !v);
    setLocalLikes(v => liked ? Math.max(0, v - 1) : v + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Cover art with play overlay */}
      <div className="relative aspect-[16/7] overflow-hidden cursor-pointer" onClick={handlePlay}>
        <img
          src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=300&fit=crop'}
          alt={track.title}
          className={cn('w-full h-full object-cover transition-transform duration-700', isCurrentlyPlaying ? 'scale-105' : 'scale-100')}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(6,4,15,0.9) 0%, rgba(6,4,15,0.3) 40%, transparent 80%)' }} />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: isCurrentlyPlaying ? 'linear-gradient(135deg, #7c3aed, #ec4899)' : 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              boxShadow: isCurrentlyPlaying ? '0 8px 32px rgba(124,58,237,0.5)' : undefined,
            }}
          >
            {isCurrentlyPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-white ml-1" />}
          </motion.div>
        </div>

        {/* Live waveform bars when playing */}
        {isCurrentlyPlaying && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-[3px]">
            {[0.3, 0.7, 0.5, 1, 0.6, 0.8, 0.4].map((h, i) => (
              <div key={i} className="w-[3px] rounded-full" style={{
                height: `${h * 20}px`,
                background: 'linear-gradient(to top, #7c3aed, #ec4899)',
                animation: `mobileViz ${0.4 + h * 0.4}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.08}s`,
              }} />
            ))}
          </div>
        )}

        {/* Duration badge */}
        {track.duration && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] text-white/70 font-medium" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>
            {fmtSec(track.duration)}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Creator row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(236,72,153,0.2))' }}>
              <UserCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80">{creator}</p>
              <p className="text-[10px] text-white/30">{timeAgo(track.created_date)}</p>
            </div>
          </div>
          {user && user.email !== track.created_by && (
            <button
              onClick={() => { haptics.light(); onFollowToggle(track.created_by); }}
              className={cn('flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-all', isFollowing ? 'text-violet-300' : 'text-white/40 hover:text-white/70')}
              style={isFollowing ? { background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' } : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {isFollowing ? <BellOff className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Title & style */}
        <div>
          <h3 className="text-sm font-bold text-white leading-tight">{track.title}</h3>
          {track.style && <p className="text-xs text-white/30 mt-0.5">{track.style}</p>}
        </div>

        {/* Prompt snippet */}
        {track.prompt && (
          <p className="text-xs text-white/25 line-clamp-2 leading-relaxed">{track.prompt}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            {/* Like */}
            <button onClick={handleLike} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all', liked ? 'text-pink-400' : 'text-white/40 hover:text-white/70')} style={{ background: liked ? 'rgba(236,72,153,0.12)' : 'rgba(255,255,255,0.04)' }}>
              <Heart className="h-3.5 w-3.5" fill={liked ? 'currentColor' : 'none'} />
              <span>{(track.plays || 0) + localLikes}</span>
            </button>

            {/* Comment */}
            <button
              onClick={() => { haptics.light(); setShowComments(v => !v); }}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all', showComments ? 'text-violet-400' : 'text-white/40 hover:text-white/70')}
              style={{ background: showComments ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.04)' }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Comment
            </button>
          </div>

          {/* Share */}
          <div className="relative">
            <button
              onClick={() => { haptics.light(); setShowShare(v => !v); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <AnimatePresence>
              {showShare && <ShareMenu track={track} onClose={() => setShowShare(false)} />}
            </AnimatePresence>
          </div>
        </div>

        {/* Comment panel */}
        <AnimatePresence>
          {showComments && (
            <TimestampCommentPanel track={track} user={user} isOpen={showComments} onClose={() => setShowComments(false)} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main SocialFeed Page ──────────────────────────────────────────────────────
export default function SocialFeedPage() {
  const [user, setUser] = useState(null);
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    base44.auth.isAuthenticated().then(ok => {
      if (ok) base44.auth.me().then(u => {
        setUser(u);
        setFollowing(u?.following || []);
      });
    });
  }, []);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['socialFeed'],
    queryFn: () => base44.entities.Track.filter({ is_public: true, status: 'ready' }, '-created_date', 30),
    refetchInterval: REFETCH_MS,
  });

  const handleFollowToggle = async (email) => {
    if (!user) return;
    const newFollowing = following.includes(email) ? following.filter(e => e !== email) : [...following, email];
    setFollowing(newFollowing);
    try {
      await base44.auth.updateMe({ following: newFollowing });
    } catch { toast.error('Could not update follow'); }
  };

  // Separate followed and non-followed tracks for ordering
  const followedTracks = tracks.filter(t => following.includes(t.created_by));
  const otherTracks = tracks.filter(t => !following.includes(t.created_by));
  const sortedTracks = [...followedTracks, ...otherTracks];

  return (
    <div className="min-h-screen" style={{ background: '#06040f' }}>
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 100% 50% at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 60%)' }} />

      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: 'rgba(6,4,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Feed</h1>
            <p className="text-xs text-white/30">Live stream of new music</p>
          </div>
          {following.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-violet-400" style={{ background: 'rgba(124,58,237,0.12)' }}>
              <Bell className="h-3.5 w-3.5" />
              {following.length} following
            </div>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4 space-y-4 pb-40">
        {/* Following section */}
        {followedTracks.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-violet-400/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Bell className="h-3 w-3" /> From creators you follow
            </p>
            <div className="space-y-4">
              {followedTracks.map(t => (
                <FeedTrackCard key={t.id} track={t} user={user} following={following} onFollowToggle={handleFollowToggle} />
              ))}
            </div>
          </div>
        )}

        {/* All tracks section */}
        {otherTracks.length > 0 && (
          <div>
            {followedTracks.length > 0 && (
              <p className="text-[11px] font-semibold text-white/20 uppercase tracking-wider mb-3">Discover more</p>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {otherTracks.map(t => (
                  <FeedTrackCard key={t.id} track={t} user={user} following={following} onFollowToggle={handleFollowToggle} />
                ))}
              </div>
            )}
          </div>
        )}

        {!isLoading && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'rgba(124,58,237,0.15)' }}>
              <MessageCircle className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">No public tracks yet</h3>
            <p className="text-white/30 text-sm max-w-xs">Create a track and make it public to start the feed!</p>
            <Link to="/Create">
              <button className="mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
                Create Track
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}