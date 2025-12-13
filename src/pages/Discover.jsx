import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TrackCard from '@/components/tracks/TrackCard';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ViewToggle from '@/components/ui/ViewToggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Globe, TrendingUp, Clock, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const genres = ['All', 'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'Ambient', 'Lo-Fi'];

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [sortBy, setSortBy] = useState('-created_date');
  const [playingTrack, setPlayingTrack] = useState(null);
  const [viewMode, setViewMode] = useState('list');

  const { data: publicTracks = [], isLoading } = useQuery({
    queryKey: ['publicTracks', sortBy],
    queryFn: async () => {
      const tracks = await base44.entities.Track.filter(
        { is_public: true, status: 'ready' },
        sortBy,
        50
      );
      return tracks;
    },
  });

  const filteredTracks = publicTracks.filter(track => {
    const matchesSearch = track.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          track.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          track.style?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = selectedGenre === 'All' || 
                         track.style?.toLowerCase().includes(selectedGenre.toLowerCase());
    
    return matchesSearch && matchesGenre;
  });

  const handlePlay = (track) => {
    setPlayingTrack(track);
    // Increment play count
    base44.entities.Track.update(track.id, {
      plays: (track.plays || 0) + 1,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 pb-32">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-violet-500/20 px-4 py-2 rounded-full mb-6">
            <Globe className="h-4 w-4 text-violet-400" />
            <span className="text-violet-300 text-sm font-medium">Public Library</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">Amazing Music</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Explore AI-generated tracks created by our community
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row gap-4 mb-8"
        >
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tracks, styles, prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="-created_date" className="text-slate-300 focus:text-white focus:bg-slate-700">
                <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> Latest</span>
              </SelectItem>
              <SelectItem value="-plays" className="text-slate-300 focus:text-white focus:bg-slate-700">
                <span className="flex items-center gap-2"><TrendingUp className="h-3 w-3" /> Most Played</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Genre Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-8"
        >
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedGenre === genre
                  ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              {genre}
            </button>
          ))}
        </motion.div>

        {/* Tracks Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          </div>
        ) : filteredTracks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Sparkles className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No public tracks yet</h3>
            <p className="text-slate-400">
              Be the first to share your creations with the community
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={viewMode === 'list' ? 'space-y-3' : 'grid md:grid-cols-2 lg:grid-cols-3 gap-4'}
          >
            <AnimatePresence>
              {filteredTracks.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TrackCard
                    track={track}
                    onPlay={handlePlay}
                    isPlaying={playingTrack?.id === track.id}
                    showActions={false}
                    showVisibility={false}
                    viewMode={viewMode}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Bottom Player */}
      <AnimatePresence>
        {playingTrack && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800"
          >
            <div className="max-w-4xl mx-auto">
              <AudioPlayer
                src={playingTrack.audio_url || playingTrack.stream_audio_url}
                title={playingTrack.title}
                artist={playingTrack.style}
                coverImage={playingTrack.cover_image_url}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}