// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import TrackEditDialog from '@/components/tracks/TrackEditDialog';
import ShareTrackDialog from '@/components/collaboration/ShareTrackDialog';
import EnhancedMasteringDialog from '@/components/mastering/EnhancedMasteringDialog';
import StemSeparationDialog from '@/components/audio/StemSeparationDialog';
import MusicVideoGenerator from '@/components/video/MusicVideoGenerator';
import BottomSheet from '@/components/mobile/BottomSheet';
import {
  Search, Music, Plus, Heart, Globe, Lock, Loader2,
  Play, Pause, Trash2, Edit3, Share2, Wand2, Mic2, Video, MoreVertical
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const FILTERS = ['All', 'Ready', 'Favorites', 'Public', 'Instrumental'];

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
      filter === 'Instrumental' ? t.is_instrumental : true;
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
    <div className="min-h-screen pb-36" style={{ background: '#0a0a0f' }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Library</h1>
          <Link to={createPageUrl('Create')}>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center text-black font-bold"
              style={{ background: '#22c55e', boxShadow: '0 0 12px rgba(34,197,94,0.4)' }}
            >
              <Plus className="h-5 w-5" />
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          {[
            { label: 'Tracks', value: stats.total },
            { label: 'Ready', value: stats.ready },
            { label: 'Favorites', value: stats.favorites },
          ].map(s => (
            <div key={s.label} className="flex-1 rounded-2xl py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-[11px] text-white/40 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your tracks..."
            className="w-full rounded-2xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); haptics.selection(); }}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={filter === f
                ? { background: '#22c55e', color: '#000', boxShadow: '0 0 10px rgba(34,197,94,0.3)' }
                : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Track List */}
      <div className="px-0 sm:px-4 pt-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#22c55e' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Music className="h-12 w-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">
              {search ? 'No matching tracks' : 'No tracks yet — create one!'}
            </p>
          </div>
        ) : (
          <div className="space-y-0 sm:space-y-2">
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

      {/* Bottom Sheet */}
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

      <TrackEditDialog track={editTrack} open={!!editTrack} onClose={() => setEditTrack(null)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['myTracks'] })} />
      <ShareTrackDialog track={shareTrack} open={!!shareTrack} onClose={() => setShareTrack(null)} />
      <EnhancedMasteringDialog track={masterTrack} open={!!masterTrack} onClose={() => setMasterTrack(null)} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['myTracks'] })} />
      <StemSeparationDialog track={stemTrack} open={!!stemTrack} onClose={() => setStemTrack(null)} />
      <MusicVideoGenerator track={videoTrack} open={!!videoTrack} onClose={() => setVideoTrack(null)} />
    </div>
  );
}

function LibraryTrackRow({ track, index, isCurrentlyPlaying, onPlay, onFavorite, onMore }) {
  const statusColors = { ready: '#22c55e', generating: '#c084fc', queued: '#facc15', failed: '#f87171' };
  const isReady = track.status === 'ready';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 rounded-none sm:rounded-2xl px-4 sm:px-3 py-3"
      style={{
        background: isCurrentlyPlaying ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.025)',
        borderTop: '0',
        borderLeft: '0',
        borderRight: '0',
        borderBottom: isCurrentlyPlaying ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Art */}
      <button onClick={isReady ? onPlay : undefined} className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {track.cover_image_url ? (
            <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="h-5 w-5 text-white/20" />
            </div>
          )}
        </div>
        {/* Play overlay */}
        {isReady && (
          <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
            {isCurrentlyPlaying
              ? <Pause className="h-5 w-5 text-white fill-white" />
              : <Play className="h-5 w-5 text-white fill-white" />
            }
          </div>
        )}
        {/* Playing indicator */}
        {isCurrentlyPlaying && (
          <div className="absolute bottom-1 right-1 flex items-end gap-[2px]">
            {[0.6, 1, 0.4].map((h, i) => (
              <span key={i} className="w-[2px] rounded-full"
                style={{ height: `${h * 8}px`, background: '#22c55e', animation: `beat-bar ${0.5 + i * 0.15}s ease-in-out infinite alternate` }}
              />
            ))}
          </div>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link to={`/TrackInfo?id=${track.id}`}>
          <p className={cn('text-sm font-semibold truncate hover:underline', isCurrentlyPlaying ? 'text-green-400' : 'text-white')}>
            {track.title}
          </p>
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-white/45 truncate">{track.style || 'AI Generated'}</span>
          {!isReady && (
            <span className="text-[10px] font-medium" style={{ color: statusColors[track.status] }}>{track.status}</span>
          )}
          {track.is_instrumental && (
            <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 rounded-full">Inst.</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {(track.status === 'generating' || track.status === 'queued') && (
          <Loader2 className="h-4 w-4 animate-spin mr-1" style={{ color: '#c084fc' }} />
        )}
        <button onClick={onFavorite} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <Heart className={cn('h-4 w-4', track.is_favorite ? 'fill-current' : '')} style={{ color: track.is_favorite ? '#f472b6' : 'rgba(255,255,255,0.3)' }} />
        </button>
        <button onClick={onMore} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
          <MoreVertical className="h-4 w-4 text-white/30" />
        </button>
      </div>
    </motion.div>
  );
}

function TrackActionsSheet({ track, onClose, onEdit, onShare, onMaster, onStems, onVideo, onTogglePublic, onDelete }) {
  if (!track) {
    return <BottomSheet open={false} onClose={onClose} title={null} />;
  }

  const actions = [
    { icon: Edit3,  label: 'Edit',   fn: () => onEdit(track) },
    { icon: Share2, label: 'Share',  fn: () => onShare(track) },
    { icon: Wand2,  label: 'Master', fn: () => onMaster(track) },
    { icon: Mic2,   label: 'Stems',  fn: () => onStems(track) },
    { icon: Video,  label: 'Video',  fn: () => onVideo(track) },
    { icon: track.is_public ? Lock : Globe, label: track.is_public ? 'Make Private' : 'Make Public', fn: () => onTogglePublic(track) },
  ];

  return (
    <BottomSheet open={!!track} onClose={onClose} title={null} snapPoints={[0.62]}>
        {track && (
        <div>
          {/* Track preview */}
          <div className="flex items-center gap-3 py-2 mb-3 border-b border-white/8">
            <div className="w-11 h-11 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {track.cover_image_url ? (
                <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music className="h-5 w-5 text-white/20 m-auto mt-3" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{track.title}</p>
              <p className="text-xs text-white/40">{track.style || 'AI Generated'}</p>
            </div>
          </div>

          {/* Action grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {actions.map(({ icon: Icon, label, fn }) => (
              <button
                key={label}
                onClick={() => { haptics.light(); fn(); }}
                className="flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Icon className="h-5 w-5 text-white/70" />
                <span className="text-xs text-white/60 font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Delete */}
          <button
            onClick={() => onDelete(track)}
            className="w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 mb-2"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
          >
            <Trash2 className="h-4 w-4" />
            Delete Track
          </button>
          <button onClick={onClose} className="w-full py-3 text-white/40 text-sm">Cancel</button>
        </div>
        )}
    </BottomSheet>
  );
}
