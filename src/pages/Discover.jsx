import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { Search, Globe, TrendingUp, Clock, Sparkles, Loader2, Play, Pause, Heart } from 'lucide-react';
import { cn } from "@/lib/utils";
import OledBackground from '@/components/audio/OledBackground';

const GENRES = ['All', 'Pop', 'Rock', 'Hip-Hop', 'Electronic', 'Jazz', 'Classical', 'Ambient', 'Lo-Fi', 'R&B'];

export default function DiscoverPage() {
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All');
  const [sort, setSort] = useState('-created_date');
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['publicTracks', sort],
    queryFn: () => base44.entities.Track.filter({ is_public: true, status: 'ready' }, sort, 50),
  });

  const filtered = tracks.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title?.toLowerCase().includes(q) || t.style?.toLowerCase().includes(q);
    const matchGenre = genre === 'All' || t.style?.toLowerCase().includes(genre.toLowerCase());
    return matchSearch && matchGenre;
  });

  const handlePlay = (track) => {
    haptics.medium();
    base44.entities.Track.update(track.id, { plays: (track.plays || 0) + 1 });
    playTrack(track, filtered);
  };

  return (
    <div className="min-h-screen bg-black pb-32 relative">
      <OledBackground intensity={0.6} />
      {/* Header */}
      <div className="relative z-10 sticky top-0 bg-black/70 backdrop-blur-2xl border-b border-white/[0.06] px-4 pt-2 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-white">Discover</h1>
          <div className="flex gap-1.5">
            {[
              { value: '-created_date', icon: Clock },
              { value: '-plays', icon: TrendingUp },
            ].map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => { setSort(value); haptics.light(); }}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  sort === value ? 'bg-violet-500/30 text-violet-400' : 'bg-white/5 text-white/40'
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search public tracks..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Genre chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {GENRES.map(g => (
            <button
              key={g}
              onClick={() => { setGenre(g); haptics.selection(); }}
              className={cn(
                'flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                genre === g
                  ? 'bg-violet-500/30 border border-violet-500/50 text-violet-300'
                  : 'bg-white/5 border border-white/10 text-white/50'
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Tracks */}
      <div className="relative z-10 px-4 pt-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="h-12 w-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No public tracks yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((track, i) => (
              <DiscoverTrackRow
                key={track.id}
                track={track}
                index={i}
                isCurrentlyPlaying={currentTrack?.id === track.id && isPlaying}
                onPlay={() => handlePlay(track)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoverTrackRow({ track, index, isCurrentlyPlaying, onPlay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl p-3"
    >
      <button onClick={onPlay} className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10">
          {track.cover_image_url ? (
            <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-pink-500/20">
              <Sparkles className="h-5 w-5 text-white/30" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
          {isCurrentlyPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
        </div>
        {isCurrentlyPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-pink-500 rounded-b-lg" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', isCurrentlyPlaying ? 'text-violet-400' : 'text-white')}>
          {track.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-white/40 truncate">{track.style || 'Unknown'}</span>
          {track.plays > 0 && (
            <span className="text-[10px] text-white/25">{track.plays} plays</span>
          )}
        </div>
      </div>

      <button
        onClick={onPlay}
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
          isCurrentlyPlaying ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/60'
        )}
      >
        {isCurrentlyPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
    </motion.div>
  );
}