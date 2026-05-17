// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import {
  Sparkles, TrendingUp, Clock, Zap, Loader2, Play, Pause,
  Heart, MessageCircle, ChevronRight, Music2,
  Star, Radio, Headphones, RefreshCw, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

// ─── Genre definitions with gradients ──────────────────────────────────────
const GENRES = [
  { id: 'pop',        label: 'Pop',        grad: 'linear-gradient(135deg,#a855f7,#ec4899)' },
  { id: 'electronic', label: 'Electronic', grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
  { id: 'hip-hop',    label: 'Hip Hop',    grad: 'linear-gradient(135deg,#f97316,#dc2626)' },
  { id: 'rock',       label: 'Rock',       grad: 'linear-gradient(135deg,#0d9488,#065f46)' },
  { id: 'r&b',        label: 'R&B',        grad: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { id: 'latin',      label: 'Latin',      grad: 'linear-gradient(135deg,#84cc16,#eab308)' },
  { id: 'jazz',       label: 'Jazz',       grad: 'linear-gradient(135deg,#1d4ed8,#7c3aed)' },
  { id: 'country',    label: 'Country',    grad: 'linear-gradient(135deg,#f97316,#d97706)' },
  { id: 'ambient',    label: 'Ambient',    grad: 'linear-gradient(135deg,#0ea5e9,#0891b2)' },
  { id: 'classical',  label: 'Classical',  grad: 'linear-gradient(135deg,#a78bfa,#c4b5fd)' },
  { id: 'metal',      label: 'Metal',      grad: 'linear-gradient(135deg,#374151,#111827)' },
  { id: 'afrobeats',  label: 'Afrobeats',  grad: 'linear-gradient(135deg,#f59e0b,#b45309)' },
  { id: 'lo-fi',      label: 'Lo-Fi',      grad: 'linear-gradient(135deg,#64748b,#334155)' },
  { id: 'experimental',label:'Experimental',grad:'linear-gradient(135deg,#6366f1,#1e1b4b)' },
];

// ─── Noise SVG overlay for genre cards ─────────────────────────────────────
const NoiseOverlay = () => (
  <div
    className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundSize: 'cover',
    }}
  />
);

// ─── Format helpers ─────────────────────────────────────────────────────────
const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
};

const fmtDuration = (s) => {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, '0');
  return `${m}:${sec}`;
};

// ─── Genre card ─────────────────────────────────────────────────────────────
function GenreCard({ genre, tracks, onGenreClick, index }) {
  // pick a matching track cover for the card if available
  const cover = useMemo(() => {
    const match = tracks.find(t =>
      t.style?.toLowerCase().includes(genre.id) ||
      t.tags?.toLowerCase().includes(genre.id)
    );
    return match?.cover_image_url || null;
  }, [tracks, genre.id]);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => { haptics.light(); onGenreClick(genre); }}
      className="relative flex-shrink-0 w-36 h-20 sm:w-44 sm:h-24 rounded-xl overflow-hidden text-left focus:outline-none"
      style={{ background: genre.grad }}
    >
      {cover && (
        <img
          src={cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity"
        />
      )}
      <NoiseOverlay />
      {/* blur spheres */}
      <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/20 blur-xl" />
      <div className="absolute -left-4 -bottom-4 w-16 h-16 rounded-full bg-black/30 blur-xl" />
      <div className="absolute inset-0 p-3 flex flex-col justify-end">
        <p className="text-white font-bold text-sm sm:text-base leading-tight drop-shadow-lg">{genre.label}</p>
        <p className="text-white/60 text-[10px] mt-0.5">Best of</p>
      </div>
    </motion.button>
  );
}

// ─── Track card (horizontal scroll item) ────────────────────────────────────
function TrackCard({ track, index, isCurrentlyPlaying, onPlay, likesCount, commentsCount, isLiked, onLike, showBadge }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex-shrink-0 w-36 sm:w-44"
    >
      {/* Cover */}
      <button
        onClick={onPlay}
        className="relative w-full aspect-square rounded-xl overflow-hidden block group mb-2"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        {track.cover_image_url ? (
          <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.25),rgba(139,92,246,0.25))' }}
          >
            <Music2 className="w-8 h-8 text-white/20" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 active:opacity-100 transition-all duration-200">
          {isCurrentlyPlaying
            ? <Pause className="w-9 h-9 text-white drop-shadow-lg" />
            : <Play className="w-9 h-9 text-white drop-shadow-lg" />}
        </div>

        {/* Duration badge */}
        {track.duration && (
          <div
            className="absolute bottom-1.5 right-1.5 text-[10px] text-white/80 font-mono px-1 rounded"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          >
            {fmtDuration(track.duration)}
          </div>
        )}

        {/* Studio badge */}
        {showBadge && (
          <div
            className="absolute top-1.5 left-1.5 text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(34,197,94,0.85)' }}
          >
            Studio
          </div>
        )}

        {/* Active playing bar */}
        {isCurrentlyPlaying && (
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ background: 'linear-gradient(90deg,#06b6d4,#8b5cf6)' }}
          />
        )}
      </button>

      {/* Meta */}
      <p
        className="text-xs sm:text-sm font-semibold leading-tight truncate"
        style={{ color: isCurrentlyPlaying ? '#06b6d4' : '#fff' }}
      >
        {track.title || 'Untitled'}
      </p>
      <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {track.created_by?.split('@')[0] || 'Unknown'}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-2 mt-1.5">
        <span className="flex items-center gap-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <Play className="w-2.5 h-2.5" />
          <span className="text-[10px]">{fmt(track.plays)}</span>
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          className="flex items-center gap-0.5 transition-colors"
          style={{ color: isLiked ? '#f43f5e' : 'rgba(255,255,255,0.35)' }}
        >
          <Heart className="w-2.5 h-2.5" fill={isLiked ? '#f43f5e' : 'none'} />
          <span className="text-[10px]">{fmt(likesCount)}</span>
        </button>
        <span className="flex items-center gap-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <MessageCircle className="w-2.5 h-2.5" />
          <span className="text-[10px]">{fmt(commentsCount)}</span>
        </span>
      </div>
    </motion.div>
  );
}

// ─── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, iconColor, title, onSeeAll }) {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <h2 className="text-sm sm:text-base font-bold text-white">{title}</h2>
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="flex items-center gap-0.5 text-xs transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fff'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
        >
          See all <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Horizontal scroll row ───────────────────────────────────────────────────
function HScrollRow({ children, snap = true }) {
  const ref = useRef(null);
  return (
    <div
      ref={ref}
      className="flex gap-3 overflow-x-auto px-4 sm:px-6 pb-3 scrollbar-none"
      style={{
        scrollSnapType: snap ? 'x mandatory' : 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {React.Children.map(children, (child, i) => (
        <div key={i} style={{ scrollSnapAlign: snap ? 'start' : 'none' }}>
          {child}
        </div>
      ))}
    </div>
  );
}

// ─── Featured hero card (top-of-page highlighted track) ─────────────────────
function HeroCard({ track, isPlaying, onPlay, likesCount, commentsCount }) {
  if (!track) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-4 sm:mx-6 mb-6 rounded-2xl overflow-hidden relative"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}
    >
      <div className="flex gap-4 p-4 sm:p-5">
        {/* Cover */}
        <button
          onClick={onPlay}
          className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden group"
        >
          {track.cover_image_url ? (
            <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.3),rgba(139,92,246,0.3))' }}
            >
              <Headphones className="w-10 h-10 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 active:opacity-100 transition-all">
            {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white" />}
          </div>
          {isPlaying && (
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: 'linear-gradient(90deg,#06b6d4,#8b5cf6)' }}
            />
          )}
        </button>

        {/* Info */}
        <div className="flex flex-col justify-between min-w-0 flex-1">
          <div>
            <div
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2"
              style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}
            >
              <Star className="w-2.5 h-2.5" /> Top Pick
            </div>
            <h3 className="text-white font-bold text-sm sm:text-base leading-tight truncate">{track.title}</h3>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {track.created_by?.split('@')[0]}
            </p>
            {track.style && (
              <p className="text-[11px] mt-1 truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {track.style}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Play className="w-3 h-3" /> {fmt(track.plays)}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Heart className="w-3 h-3" /> {fmt(likesCount)}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <MessageCircle className="w-3 h-3" /> {fmt(commentsCount)}
            </span>
          </div>
        </div>
      </div>

      {/* Gradient accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: 'linear-gradient(90deg,#06b6d4,#8b5cf6,#ec4899)' }}
      />
    </motion.div>
  );
}

// ─── Mini version card (model version rows) ──────────────────────────────────
function VersionCard({ version, tracks, onPlay, currentTrack, isPlaying, likesMap, commentsMap, userLikes, onLike, user }) {
  return (
    <div className="mb-8">
      <SectionHeader
        icon={Layers}
        iconColor="#8b5cf6"
        title={`Best of v${version}`}
      />
      <HScrollRow>
        {tracks.map((track, i) => (
          <TrackCard
            key={track.id}
            track={track}
            index={i}
            isCurrentlyPlaying={currentTrack?.id === track.id && isPlaying}
            onPlay={() => onPlay(track, tracks)}
            likesCount={likesMap[track.id] || 0}
            commentsCount={commentsMap[track.id] || 0}
            isLiked={userLikes.has(track.id)}
            onLike={() => onLike(track)}
            showBadge={!!track.model_version}
          />
        ))}
      </HScrollRow>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ForYouPage() {
  const [user, setUser] = useState(null);
  const [aiPicks, setAiPicks] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeGenre, setActiveGenre] = useState(null);
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then(ok => ok ? base44.auth.me().then(setUser) : null);
  }, []);

  // ── Data fetches ────────────────────────────────────────────────────────
  const { data: userTracks = [] } = useQuery({
    queryKey: ['myTracks', user?.email],
    queryFn: () => base44.entities.Track.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: allTracks = [], isLoading } = useQuery({
    queryKey: ['allPublicTracks'],
    queryFn: () => base44.entities.Track.filter({ is_public: true, status: 'ready' }, '-plays', 200),
    refetchInterval: 60000,
  });

  const { data: likes = [] } = useQuery({
    queryKey: ['trackLikes'],
    queryFn: () => base44.entities.TrackLike.list('-created_date', 2000),
    refetchInterval: 30000,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['feedComments'],
    queryFn: () => base44.entities.TrackComment.list('-created_date', 2000),
    refetchInterval: 30000,
  });

  // ── Derived maps ────────────────────────────────────────────────────────
  const likesMap = useMemo(() => {
    const m = {};
    likes.forEach(l => { m[l.track_id] = (m[l.track_id] || 0) + 1; });
    return m;
  }, [likes]);

  const commentsMap = useMemo(() => {
    const m = {};
    comments.forEach(c => { m[c.track_id] = (m[c.track_id] || 0) + 1; });
    return m;
  }, [comments]);

  const userLikes = useMemo(
    () => new Set(likes.filter(l => l.user_email === user?.email).map(l => l.track_id)),
    [likes, user?.email]
  );

  // ── Sections ────────────────────────────────────────────────────────────
  const trending    = useMemo(() => [...allTracks].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 12), [allTracks]);
  const recent      = useMemo(() => allTracks.slice(0, 12), [allTracks]);
  const studioTracks = useMemo(() => allTracks.filter(t => !!t.model_version).slice(0, 12), [allTracks]);
  const mostLiked   = useMemo(() => [...allTracks].sort((a, b) => (likesMap[b.id] || 0) - (likesMap[a.id] || 0)).slice(0, 12), [allTracks, likesMap]);

  const filteredByGenre = useMemo(() => {
    if (!activeGenre) return allTracks.slice(0, 12);
    return allTracks.filter(t =>
      t.style?.toLowerCase().includes(activeGenre.id) ||
      t.tags?.toLowerCase().includes(activeGenre.id)
    ).slice(0, 12);
  }, [activeGenre, allTracks]);

  // version groups
  const versionGroups = useMemo(() => {
    const groups = {};
    allTracks.forEach(t => {
      const v = t.model_version;
      if (v) {
        if (!groups[v]) groups[v] = [];
        groups[v].push(t);
      }
    });
    return Object.entries(groups)
      .filter(([, arr]) => arr.length >= 3)
      .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))
      .slice(0, 3);
  }, [allTracks]);

  const featuredTrack = trending[0] || null;

  // ── AI Picks ────────────────────────────────────────────────────────────
  const generateAiPicks = async () => {
    setIsAnalyzing(true);
    haptics.light();
    try {
      const userStyles = [...new Set(userTracks.map(t => t.style).filter(Boolean))];
      const pool = trending.slice(0, 40);
      if (!userStyles.length) { setAiPicks(pool.slice(0, 10)); return; }
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `User creates music in styles: ${userStyles.join(', ')}. From these track IDs pick the 10 best matching ones: ${pool.map(t => t.id).join(',')}`,
        response_json_schema: {
          type: 'object',
          properties: { recommended_ids: { type: 'array', items: { type: 'string' } } },
        },
      });
      const picked = pool.filter(t => res.recommended_ids?.includes(t.id));
      setAiPicks(picked.length ? picked : pool.slice(0, 10));
      toast.success('AI picks refreshed!');
    } catch {
      setAiPicks(trending.slice(0, 10));
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (allTracks.length > 0 && aiPicks.length === 0) generateAiPicks();
  }, [allTracks.length, user?.email]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handlePlay = async (track, queue) => {
    haptics.medium();
    playTrack(track, queue);
    await Promise.allSettled([
      base44.entities.Track.update(track.id, { plays: (track.plays || 0) + 1 }),
      base44.entities.TrackPlay.create({
        track_id: track.id,
        user_email: user?.email || '',
        played_at: new Date().toISOString(),
        source: 'for_you',
      }).catch(() => {}),
    ]);
    queryClient.invalidateQueries({ queryKey: ['allPublicTracks'] });
  };

  const handleLike = async (track) => {
    if (!user?.email) { toast.error('Sign in to like tracks'); return; }
    haptics.light();
    const existing = likes.find(l => l.track_id === track.id && l.user_email === user.email);
    if (existing) await base44.entities.TrackLike.delete(existing.id);
    else await base44.entities.TrackLike.create({ track_id: track.id, user_email: user.email, type: 'like' });
    queryClient.invalidateQueries({ queryKey: ['trackLikes'] });
  };

  // ── Shared track card props factory ─────────────────────────────────────
  const cardProps = (track, index, queue, badge = false) => ({
    track,
    index,
    isCurrentlyPlaying: currentTrack?.id === track.id && isPlaying,
    onPlay: () => handlePlay(track, queue),
    likesCount: likesMap[track.id] || 0,
    commentsCount: commentsMap[track.id] || 0,
    isLiked: userLikes.has(track.id),
    onLike: () => handleLike(track),
    showBadge: badge,
  });

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen pb-36 relative"
      style={{ background: '#09090f' }}
    >
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div
          className="absolute top-[-10%] right-[-10%] w-72 h-72 rounded-full blur-[120px] opacity-20"
          style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)' }}
        />
        <div
          className="absolute bottom-[20%] left-[-10%] w-64 h-64 rounded-full blur-[100px] opacity-15"
          style={{ background: 'radial-gradient(circle,#06b6d4,transparent)' }}
        />
      </div>

      <div className="relative" style={{ zIndex: 1 }}>
        {/* ── Top header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-6 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">For You</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Personalised picks · updated daily
            </p>
          </div>
          <button
            onClick={generateAiPicks}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
            style={{
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.3)',
              color: '#a78bfa',
            }}
          >
            {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2
              className="w-8 h-8 animate-spin"
              style={{ color: '#8b5cf6' }}
            />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading your feed…</p>
          </div>
        ) : (
          <>
            {/* ── Featured hero ─────────────────────────────────────── */}
            <HeroCard
              track={featuredTrack}
              isPlaying={currentTrack?.id === featuredTrack?.id && isPlaying}
              onPlay={() => featuredTrack && handlePlay(featuredTrack, trending)}
              likesCount={featuredTrack ? (likesMap[featuredTrack.id] || 0) : 0}
              commentsCount={featuredTrack ? (commentsMap[featuredTrack.id] || 0) : 0}
            />

            {/* ── Genre / Best Of row ───────────────────────────────── */}
            <div className="mb-8">
              <SectionHeader
                icon={Radio}
                iconColor="#ec4899"
                title="Best Of"
                onSeeAll={() => navigate(createPageUrl('Discover'))}
              />
              <HScrollRow>
                {GENRES.map((g, i) => (
                  <GenreCard
                    key={g.id}
                    genre={g}
                    tracks={allTracks}
                    index={i}
                    onGenreClick={genre => setActiveGenre(prev => prev?.id === genre.id ? null : genre)}
                  />
                ))}
              </HScrollRow>
            </div>

            {/* ── Genre filter result ───────────────────────────────── */}
            <AnimatePresence>
              {activeGenre && (
                <motion.div
                  key={activeGenre.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-8 overflow-hidden"
                >
                  <SectionHeader
                    icon={Music2}
                    iconColor="#06b6d4"
                    title={`Best of ${activeGenre.label}`}
                    onSeeAll={() => setActiveGenre(null)}
                  />
                  {filteredByGenre.length === 0 ? (
                    <p className="px-4 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      No tracks yet for this genre.
                    </p>
                  ) : (
                    <HScrollRow>
                      {filteredByGenre.map((t, i) => (
                        <TrackCard key={t.id} {...cardProps(t, i, filteredByGenre)} />
                      ))}
                    </HScrollRow>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── AI Picks ──────────────────────────────────────────── */}
            {aiPicks.length > 0 && (
              <div className="mb-8">
                <SectionHeader
                  icon={Zap}
                  iconColor="#f59e0b"
                  title="AI Picks For You"
                  onSeeAll={() => navigate(createPageUrl('Discover'))}
                />
                <HScrollRow>
                  {aiPicks.map((t, i) => (
                    <TrackCard key={t.id} {...cardProps(t, i, aiPicks)} />
                  ))}
                </HScrollRow>
              </div>
            )}

            {/* ── Made with Studio ──────────────────────────────────── */}
            {studioTracks.length > 0 && (
              <div className="mb-8">
                <SectionHeader
                  icon={Sparkles}
                  iconColor="#22c55e"
                  title="Made with Studio"
                  onSeeAll={() => navigate(createPageUrl('Discover'))}
                />
                <HScrollRow>
                  {studioTracks.map((t, i) => (
                    <TrackCard key={t.id} {...cardProps(t, i, studioTracks, true)} />
                  ))}
                </HScrollRow>
              </div>
            )}

            {/* ── Trending Now ──────────────────────────────────────── */}
            <div className="mb-8">
              <SectionHeader
                icon={TrendingUp}
                iconColor="#f43f5e"
                title="Trending Now"
                onSeeAll={() => navigate(createPageUrl('Discover'))}
              />
              <HScrollRow>
                {trending.map((t, i) => (
                  <TrackCard key={t.id} {...cardProps(t, i, trending)} />
                ))}
              </HScrollRow>
            </div>

            {/* ── Most Loved ────────────────────────────────────────── */}
            {mostLiked.some(t => (likesMap[t.id] || 0) > 0) && (
              <div className="mb-8">
                <SectionHeader
                  icon={Heart}
                  iconColor="#f43f5e"
                  title="Most Loved"
                  onSeeAll={() => navigate(createPageUrl('Discover'))}
                />
                <HScrollRow>
                  {mostLiked.map((t, i) => (
                    <TrackCard key={t.id} {...cardProps(t, i, mostLiked)} />
                  ))}
                </HScrollRow>
              </div>
            )}

            {/* ── Version rows ──────────────────────────────────────── */}
            {versionGroups.map(([version, vTracks]) => (
              <VersionCard
                key={version}
                version={version}
                tracks={vTracks}
                onPlay={handlePlay}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                likesMap={likesMap}
                commentsMap={commentsMap}
                userLikes={userLikes}
                onLike={handleLike}
                user={user}
              />
            ))}

            {/* ── Recently Added ────────────────────────────────────── */}
            <div className="mb-8">
              <SectionHeader
                icon={Clock}
                iconColor="#06b6d4"
                title="Recently Added"
                onSeeAll={() => navigate(createPageUrl('Discover'))}
              />
              <HScrollRow>
                {recent.map((t, i) => (
                  <TrackCard key={t.id} {...cardProps(t, i, recent)} />
                ))}
              </HScrollRow>
            </div>

            {/* ── Empty state ───────────────────────────────────────── */}
            {allTracks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                  <Music2 className="w-8 h-8" style={{ color: '#8b5cf6' }} />
                </div>
                <div>
                  <p className="text-white font-semibold">No tracks yet</p>
                  <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Be the first to create and share music
                  </p>
                </div>
                <button
                  onClick={() => navigate(createPageUrl('Create'))}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)' }}
                >
                  <Sparkles className="w-4 h-4" /> Start Creating
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
