// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Loader2, MessageCircle, Pause, Play, Search, Send, Share2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { getPublicTrackUrl } from '@/lib/trackSharing';

export default function SocialFeedPage() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [sort] = useState('-created_date');
  const [commentInput, setCommentInput] = useState({});
  const [openComments, setOpenComments] = useState({});
  const { playTrack, currentTrack, isPlaying, currentTime } = useAudioPlayer();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((ok) => ok ? base44.auth.me().then(setUser) : null);
  }, []);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['socialPublicTracks', sort],
    queryFn: () => base44.entities.Track.filter({ is_public: true, status: 'ready' }, sort, 80),
    refetchInterval: 20000
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['feedComments'],
    queryFn: () => base44.entities.TrackComment.list('-created_date', 500),
    refetchInterval: 12000
  });

  const { data: likes = [] } = useQuery({
    queryKey: ['trackLikes'],
    queryFn: () => base44.entities.TrackLike.list('-created_date', 1000),
    refetchInterval: 15000
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter((track) =>
    track.title?.toLowerCase().includes(q) ||
    track.style?.toLowerCase().includes(q) ||
    track.tags?.toLowerCase().includes(q) ||
    track.created_by?.toLowerCase().includes(q)
    );
  }, [search, tracks]);

  const handlePlay = async (track) => {
    haptics.medium();
    playTrack(track, filtered);
    await Promise.allSettled([
    base44.entities.Track.update(track.id, { plays: (track.plays || 0) + 1 }),
    base44.entities.TrackPlay.create({
      track_id: track.id,
      user_email: user?.email || '',
      played_at: new Date().toISOString(),
      source: 'feed',
      referrer: window.location.href
    })]
    );
  };

  const handleLike = async (track) => {
    if (!user?.email) {
      toast.error('Sign in to like tracks');
      return;
    }
    haptics.light();
    const existing = likes.find((like) => like.track_id === track.id && like.user_email === user.email);
    if (existing) await base44.entities.TrackLike.delete(existing.id);else
    await base44.entities.TrackLike.create({ track_id: track.id, user_email: user.email, type: 'like' });
    queryClient.invalidateQueries({ queryKey: ['trackLikes'] });
  };

  const handleComment = async (track) => {
    const text = commentInput[track.id]?.trim();
    if (!text) return;
    if (!user?.email) {
      toast.error('Sign in to comment');
      return;
    }
    haptics.medium();
    await base44.entities.TrackComment.create({
      track_id: track.id,
      user_email: user.email,
      user_name: user.full_name || user.email.split('@')[0],
      comment_text: text,
      timestamp_seconds: Math.round(currentTrack?.id === track.id ? currentTime : 0)
    });
    setCommentInput((prev) => ({ ...prev, [track.id]: '' }));
    setOpenComments((prev) => ({ ...prev, [track.id]: true }));
    queryClient.invalidateQueries({ queryKey: ['feedComments'] });
  };

  const handleShare = async (track) => {
    const url = getPublicTrackUrl(track);
    if (navigator.share) {
      await navigator.share({ title: track.title, text: track.seo_description || track.style || 'Listen on Accoustica', url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success('Public player link copied');
  };

  return (
    <main className="min-h-screen pb-36" style={{ background: '#020204', color: '#fff' }}>
      <header className="sticky top-0 z-30 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(2,2,4,0.92)', backdropFilter: 'blur(18px)' }}>
        <div className="px-4 md:px-6 py-4 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">Social Discovery</h1>
              
            </div>
            













            
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(255,255,255,0.34)' }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tracks, styles, creators..."
              aria-label="Search public tracks"
              className="w-full pl-10 pr-3 py-3 text-sm bg-white/[0.06] border border-white/10 text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-rose-400"
              style={{ borderRadius: 8 }} />
            
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-5">
        {isLoading ?
        <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#22c55e' }} />
          </div> :
        filtered.length === 0 ?
        <div className="py-24 text-center border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.42)' }}>No public tracks match this search.</p>
          </div> :

        <div className="columns-1 sm:columns-2 xl:columns-3 gap-3 [column-fill:_balance]">
            {filtered.map((track) =>
          <TrackMasonryCard
            key={track.id}
            track={track}
            comments={comments.filter((comment) => comment.track_id === track.id)}
            likes={likes.filter((like) => like.track_id === track.id)}
            liked={!!likes.find((like) => like.track_id === track.id && like.user_email === user?.email)}
            playing={currentTrack?.id === track.id && isPlaying}
            openComments={!!openComments[track.id]}
            commentValue={commentInput[track.id] || ''}
            onToggleComments={() => setOpenComments((prev) => ({ ...prev, [track.id]: !prev[track.id] }))}
            onCommentChange={(value) => setCommentInput((prev) => ({ ...prev, [track.id]: value }))}
            onComment={() => handleComment(track)}
            onLike={() => handleLike(track)}
            onPlay={() => handlePlay(track)}
            onShare={() => handleShare(track)} />

          )}
          </div>
        }
      </section>
    </main>);

}

function TrackMasonryCard({
  track,
  comments,
  likes,
  liked,
  playing,
  openComments,
  commentValue,
  onToggleComments,
  onCommentChange,
  onComment,
  onLike,
  onPlay,
  onShare
}) {
  const cover = track.cover_image_url || '';
  const publicUrl = getPublicTrackUrl(track);
  const tall = (track.title?.length || 0) % 3 === 0;

  return (
    <article className="break-inside-avoid mb-3 overflow-hidden" style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#09090f' }}>
      <div className={`relative ${tall ? 'aspect-[4/5]' : 'aspect-square'} overflow-hidden`} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
        {cover ? <img src={cover} alt={track.title} className="h-full w-full object-cover" /> : null}
        <button type="button" onClick={onPlay} className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/45 transition-colors" aria-label={playing ? 'Pause track' : 'Play track'}>
          <span className="h-14 w-14 flex items-center justify-center" style={{ borderRadius: 8, background: playing ? '#22c55e' : 'rgba(2,2,4,0.75)', border: `1px solid ${playing ? '#22c55e' : 'rgba(255,255,255,0.22)'}`, color: playing ? '#020204' : '#fff' }}>
            {playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
          </span>
        </button>
        {playing && <div className="absolute left-0 right-0 bottom-0 h-1" style={{ background: '#22c55e' }} />}
      </div>

      <div className="p-4">
        <Link to={publicUrl.replace(window.location.origin, '')}>
          <h2 className="text-lg font-extrabold leading-tight hover:text-rose-300 transition-colors">{track.title}</h2>
        </Link>
        <p className="mt-1 text-sm line-clamp-2" style={{ color: 'rgba(255,255,255,0.52)' }}>{track.style || track.tags || 'AI Generated'}</p>
        <p className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.34)' }}>{track.created_by?.split('@')[0] || 'Accoustica'}</p>
      </div>

      <div className="grid grid-cols-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <ActionButton active={liked} onClick={onLike} label={likes.length || ''}><Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /></ActionButton>
        <ActionButton active={openComments} onClick={onToggleComments} label={comments.length || ''}><MessageCircle className="h-4 w-4" /></ActionButton>
        <ActionButton onClick={onShare}><Share2 className="h-4 w-4" /></ActionButton>
        <div className="flex items-center justify-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>
          <TrendingUp className="h-4 w-4" />
          {track.plays || 0}
        </div>
      </div>

      {openComments &&
      <div className="p-3 space-y-3">
          <div className="max-h-48 overflow-y-auto divide-y divide-white/5 rounded-lg border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {comments.length === 0 ?
          <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.34)' }}>No comments yet</p> :
          comments.slice(0, 12).map((comment) =>
          <div key={comment.id} className="px-3 py-2">
                <p className="text-xs font-bold" style={{ color: '#fb7185' }}>{comment.user_name || comment.user_email || 'Listener'}</p>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.68)' }}>{comment.comment_text}</p>
              </div>
          )}
          </div>
          <div className="flex gap-2">
            <input
            value={commentValue}
            onChange={(event) => onCommentChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onComment()}
            placeholder="Add a comment..."
            aria-label={`Comment on ${track.title}`}
            className="flex-1 px-3 py-2 text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-rose-400"
            style={{ borderRadius: 8 }} />
          
            <button type="button" onClick={onComment} className="px-3" aria-label="Send comment" style={{ background: '#e11d48', borderRadius: 8 }}>
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      }
    </article>);

}

function ActionButton({ active, onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 flex items-center justify-center gap-1 border-r text-sm font-bold focus:outline-none transition-colors"
      style={{
        borderColor: 'rgba(255,255,255,0.08)',
        color: active ? '#fb7185' : 'rgba(255,255,255,0.6)',
        background: active ? 'rgba(225,29,72,0.1)' : 'transparent'
      }}>
      
      {children}
      {label ? <span className="text-xs">{label}</span> : null}
    </button>);

}
