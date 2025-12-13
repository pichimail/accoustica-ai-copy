import React, { useState } from 'react';
import ViewToggle from '@/components/ui/ViewToggle';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Volume2, Search, Filter, Play, Clock, TrendingUp, Sparkles, History } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import AdvancedMasteringStudio from '@/components/mastering/AdvancedMasteringStudio';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';

export default function MasteringStudioPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const { playTrack } = useAudioPlayer();
  const queryClient = useQueryClient();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-created_date'),
  });

  const { data: masteredTracks = [] } = useQuery({
    queryKey: ['mastered-tracks'],
    queryFn: async () => {
      // Fetch tracks that have been mastered (you can add a field to track entity if needed)
      const allTracks = await base44.entities.Track.list('-created_date');
      return allTracks.filter(t => t.tags?.includes('mastered'));
    },
  });

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'mastered' && track.tags?.includes('mastered')) ||
      (filterStatus === 'unmastered' && !track.tags?.includes('mastered'));
    return matchesSearch && matchesFilter && track.status === 'ready';
  });

  const handleMasteringComplete = () => {
    toast.success('Track mastered successfully!');
    queryClient.invalidateQueries(['tracks']);
    queryClient.invalidateQueries(['mastered-tracks']);
    setSelectedTrack(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Volume2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">AI Mastering Studio</h1>
              <p className="text-slate-400 text-sm">Professional AI-powered audio mastering</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{tracks.filter(t => t.status === 'ready').length}</p>
                  <p className="text-xs text-slate-400">Ready to Master</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{masteredTracks.length}</p>
                  <p className="text-xs text-slate-400">Mastered Tracks</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <History className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">∞</p>
                  <p className="text-xs text-slate-400">Unlimited Sessions</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracks to master..."
                className="pl-10 bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'unmastered', 'mastered'].map((filter) => (
                <Button
                  key={filter}
                  variant={filterStatus === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    haptics.selection();
                    setFilterStatus(filter);
                  }}
                  className={cn(
                    filterStatus === filter
                      ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
                      : 'border-slate-700 text-slate-400 hover:text-white'
                  )}
                >
                  <Filter className="h-3 w-3 mr-1" />
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tracks Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTracks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <Volume2 className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">No tracks found</p>
            <p className="text-sm text-slate-500">Create some tracks first to master them</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTracks.map((track, index) => (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden hover:border-violet-500/50 transition-all cursor-pointer"
                onClick={() => {
                  haptics.medium();
                  setSelectedTrack(track);
                }}
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playTrack(track);
                    }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Play className="h-6 w-6 text-slate-900 ml-0.5" />
                  </button>
                  {track.tags?.includes('mastered') && (
                    <Badge className="absolute top-2 right-2 bg-green-500/90 text-white border-0">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Mastered
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white truncate">{track.title}</h3>
                  <p className="text-sm text-slate-400 truncate">{track.style || 'Unknown Style'}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Mastering Studio Modal */}
      {selectedTrack && (
        <AdvancedMasteringStudio
          open={!!selectedTrack}
          onClose={() => setSelectedTrack(null)}
          track={selectedTrack}
          onSuccess={handleMasteringComplete}
        />
      )}
    </div>
  );
}