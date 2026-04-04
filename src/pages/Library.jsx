import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import TrackEditDialog from '@/components/tracks/TrackEditDialog';
import ShareTrackDialog from '@/components/collaboration/ShareTrackDialog';
import EnhancedMasteringDialog from '@/components/mastering/EnhancedMasteringDialog';
import StemSeparationDialog from '@/components/audio/StemSeparationDialog';
import MusicVideoGenerator from '@/components/video/MusicVideoGenerator';
import {
  Search, Music, Plus, Heart, Globe, Lock, Loader2,
  Play, Pause, Trash2, Edit3, Share2, Wand2, Mic2, Video, MoreVertical, X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const FILTERS = ['All', 'Ready', 'Favorites', 'Public', 'Instrumental'];
const SORT_OPTIONS = [
  { value: '-created_date', label: 'Newest' },
  { value: 'created_date', label: 'Oldest' },
  { value: 'title', label: 'A–Z' },
  { value: '-plays', label: 'Most Played' },
];

export default function LibraryPage() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('-created_date');
  const [editTrack, setEditTrack] = useState(null);
  const [shareTrack, setShareTrack] = useState(null);
  const [masterTrack, setMasterTrack] = useState(null);
  const [stemTrack, setStemTrack] = useState(null);
  const [videoTrack, setVideoTrack] = useState(null);
  const [bottomSheetTrack, setBottomSheetTrack] = useState(null);
  const queryClient = useQueryClient();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['myTracks', user?.email, sort],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Track.filter({ created_by: user.email }, sort, 100);
    },
    enabled: !!user?.email,
    refetchInterval: (data) => {
      const hasActive = Array.isArray(data) && data.some(t => t.status === 'generating' || t.status === 'queued');
      return hasActive ? 2000 : false;
    },
  });

  const filtered = tracks.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title?.toLowerCase().includes(q) || t.style?.toLowerCase().includes(q);
    const matchFilter =
      filter === 'All' ? true :
      filter === 'Ready' ? t.status === 'ready' :
      filter === 'Favorites' ? t.is_favorite :
      filter === 'Public' ? t.is_public :
      filter === 'Instrumental' ? t.is_instrumental :
      true;
    return matchSearch && matchFilter;
  });

  const stats = {
    total: tracks.length,
    ready: tracks.filter(t => t.status === 'ready').length,
    favorites: tracks.filter(t => t.is_favorite).length,
  };

  const handleDelete = async (track) => {
    haptics.heavy();
    await base44.entities.Track.delete(track.id);
    queryClient.invalidateQueries({ queryKey: ['myTracks'] });
    toast.success('Deleted');
    setBottomSheetTrack(null);
  };

  const handleToggleFavorite = async (track) => {
    haptics.light();
    await base44.entities.Track.update(track.id, { is_favorite: !track.is_favorite });
    queryClient.invalidateQueries({ queryKey: ['myTracks'] });
  };

  const handleTogglePublic = async (track) => {
    haptics.light();
    await base44.entities.Track.update(track.id, { is_public: !track.is_public });
    queryClient.invalidateQueries({ queryKey: ['myTracks'] });
    toast.success(track.is_public ? 'Track set to private' : 'Track is now public');
    setBottomSheetTrack(null);
  };

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 pt-2 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">Library</h1>
          <Link to={createPageUrl('Create')}>
            <button className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
              <Plus className="h-5 w-5" />
            </button>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3 mb-3">
          {[
            { label: 'Tracks', value: stats.total },
            { label: 'Ready', value: stats.ready },
            { label: 'Favorites', value: stats.favorites },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-white/5 rounded-xl py-2 text-center">
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] text-white/40">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracks..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); haptics.selection(); }}
              className={cn(
                'flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                filter === f
                  ? 'bg-violet-500/30 border border-violet-500/50 text-violet-300'
                  : 'bg-white/5 border border-white/10 text-white/50'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Track List */}
      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Music className="h-12 w-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">
              {search ? 'No matching tracks' : 'No tracks yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filtered.map((track, i) => (
                <LibraryTrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  isCurrentlyPlaying={currentTrack?.id === track.id && isPlaying}
                  onPlay={() => {
                    haptics.medium();
                    const playable = filtered.filter(t => t.status === 'ready');
                    playTrack(track, playable);
                  }}
                  onFavorite={() => handleToggleFavorite(track)}
                  onMore={() => { haptics.light(); setBottomSheetTrack(track); }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Bottom Sheet Track Actions */}
      <TrackActionsSheet
        track={bottomSheetTrack}
        onClose={() => setBottomSheetTrack(null)}
        onEdit={(t) => { setEditTrack(t); setBottomSheetTrack(null); }}
        onShare={(t) => { setShareTrack(t); setBottomSheetTrack(null); }}
        onMaster={(t) => { setMasterTrack(t); setBottomSheetTrack(null); }}
        onStems={(t) => { setStemTrack(t); setBottomSheetTrack(null); }}
        onVideo={(t) => { setVideoTrack(t); setBottomSheetTrack(null); }}
        onTogglePublic={handleTogglePublic}
        onDelete={handleDelete}
      />

      {/* Dialogs */}
      <TrackEditDialog
        track={editTrack}
        open={!!editTrack}
        onClose={() => setEditTrack(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['myTracks'] })}
      />
      <ShareTrackDialog
        track={shareTrack}
        open={!!shareTrack}
        onClose={() => setShareTrack(null)}
      />
      <EnhancedMasteringDialog
        track={masterTrack}
        open={!!masterTrack}
        onClose={() => setMasterTrack(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['myTracks'] })}
      />
      <StemSeparationDialog
        track={stemTrack}
        open={!!stemTrack}
        onClose={() => setStemTrack(null)}
      />
      <MusicVideoGenerator
        track={videoTrack}
        open={!!videoTrack}
        onClose={() => setVideoTrack(null)}
      />
    </div>
  );
}

function LibraryTrackRow({ track, index, isCurrentlyPlaying, onPlay, onFavorite, onMore }) {
  const statusColors = { ready: 'text-emerald-400', generating: 'text-violet-400', queued: 'text-yellow-400', failed: 'text-red-400' };
  const isReady = track.status === 'ready';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl p-3"
    >
      {/* Art */}
      <button onClick={isReady ? onPlay : undefined} className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10">
          {track.cover_image_url ? (
            <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="h-5 w-5 text-white/20" />
            </div>
          )}
        </div>
        {isReady && (
          <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
            {isCurrentlyPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
          </div>
        )}
        {isCurrentlyPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-pink-500 rounded-b-lg" />
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isCurrentlyPlaying ? 'text-violet-400' : 'text-white')}>
          {track.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-white/40 truncate">{track.style || 'Unknown style'}</span>
          {!isReady && (
            <span className={cn('text-[10px]', statusColors[track.status])}>{track.status}</span>
          )}
          {track.is_instrumental && (
            <span className="text-[10px] text-blue-400 bg-blue-400/10 px-1.5 rounded">Inst.</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {(track.status === 'generating' || track.status === 'queued') && (
          <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
        )}
        <button onClick={onFavorite} className="p-2 rounded-lg hover:bg-white/5">
          <Heart className={cn('h-4 w-4', track.is_favorite ? 'text-red-500 fill-red-500' : 'text-white/30')} />
        </button>
        <button onClick={onMore} className="p-2 rounded-lg hover:bg-white/5">
          <MoreVertical className="h-4 w-4 text-white/30" />
        </button>
      </div>
    </motion.div>
  );
}

function TrackActionsSheet({ track, onClose, onEdit, onShare, onMaster, onStems, onVideo, onTogglePublic, onDelete }) {
  if (!track) return null;
  const actions = [
    { icon: Edit3, label: 'Edit', fn: () => onEdit(track) },
    { icon: Share2, label: 'Share', fn: () => onShare(track) },
    { icon: Wand2, label: 'Master', fn: () => onMaster(track) },
    { icon: Mic2, label: 'Stems', fn: () => onStems(track) },
    { icon: Video, label: 'Video', fn: () => onVideo(track) },
    { icon: track.is_public ? Lock : Globe, label: track.is_public ? 'Make Private' : 'Make Public', fn: () => onTogglePublic(track) },
  ];
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[51] bg-zinc-900 rounded-t-3xl border-t border-white/10 safe-bottom"
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2" />
        <div className="px-4 pb-2">
          <div className="flex items-center gap-3 py-3 border-b border-white/8 mb-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
              {track.cover_image_url ? <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" /> : <Music className="h-5 w-5 text-white/20 m-auto" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{track.title}</p>
              <p className="text-xs text-white/40">{track.style}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {actions.map(({ icon: Icon, label, fn }) => (
              <button
                key={label}
                onClick={() => { haptics.light(); fn(); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white/5 border border-white/8 text-white/70 active:bg-white/10"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px]">{label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => onDelete(track)}
            className="w-full py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Track
          </button>
          <button onClick={onClose} className="w-full py-3.5 mt-2 rounded-xl text-white/40 text-sm">Cancel</button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}