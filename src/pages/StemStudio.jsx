import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Disc, Search, Play, Clock, Music, Sparkles, GitBranch, Volume2, Wand2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import StemSeparationDialog from '@/components/audio/StemSeparationDialog';
import StemMixer from '@/components/audio/StemMixer';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';

export default function StemStudioPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [showSeparationDialog, setShowSeparationDialog] = useState(false);
  const [showMixer, setShowMixer] = useState(false);
  const [selectedStemSeparation, setSelectedStemSeparation] = useState(null);
  const { playTrack } = useAudioPlayer();
  const queryClient = useQueryClient();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-created_date'),
  });

  const { data: stemSeparations = [] } = useQuery({
    queryKey: ['stem-separations'],
    queryFn: () => base44.entities.StemSeparation.list('-created_date'),
    refetchInterval: (data) => {
      const hasPending = Array.isArray(data) && data.some(s => s.status === 'pending' || s.status === 'processing');
      return hasPending ? 5000 : false;
    },
  });

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    track.status === 'ready'
  );

  const readySeparations = stemSeparations.filter(s => s.status === 'ready');
  const processingSeparations = stemSeparations.filter(s => s.status === 'processing' || s.status === 'pending');

  const getTrackSeparations = (trackId) => {
    return stemSeparations.filter(s => s.track_id === trackId && s.status === 'ready');
  };

  const handleOpenMixer = (separation) => {
    haptics.medium();
    setSelectedStemSeparation(separation);
    setShowMixer(true);
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Disc className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Stem Separation & Remix Studio</h1>
              <p className="text-slate-400 text-sm">Advanced stem isolation and AI-powered remixing</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <GitBranch className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{readySeparations.length}</p>
                  <p className="text-xs text-slate-400">Separated Tracks</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{processingSeparations.length}</p>
                  <p className="text-xs text-slate-400">Processing</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{tracks.filter(t => t.status === 'ready').length}</p>
                  <p className="text-xs text-slate-400">Tracks Available</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Separated Stems Section */}
        {readySeparations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-cyan-400" />
              Your Separated Stems
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {readySeparations.map((separation, index) => {
                const track = tracks.find(t => t.id === separation.track_id);
                const stemCount = [
                  separation.vocal_url,
                  separation.instrumental_url,
                  separation.drums_url,
                  separation.bass_url,
                  separation.guitar_url,
                  separation.keyboard_url,
                ].filter(Boolean).length;

                return (
                  <motion.div
                    key={separation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden hover:border-cyan-500/50 transition-all"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="h-12 w-12 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                          <Disc className="h-6 w-6 text-cyan-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-white truncate">{track?.title || 'Unknown Track'}</h3>
                          <p className="text-xs text-slate-400">{stemCount} stems available</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {separation.vocal_url && <Badge className="text-xs bg-pink-500/20 text-pink-300">Vocals</Badge>}
                        {separation.instrumental_url && <Badge className="text-xs bg-blue-500/20 text-blue-300">Instrumental</Badge>}
                        {separation.drums_url && <Badge className="text-xs bg-red-500/20 text-red-300">Drums</Badge>}
                        {separation.bass_url && <Badge className="text-xs bg-purple-500/20 text-purple-300">Bass</Badge>}
                        {separation.guitar_url && <Badge className="text-xs bg-amber-500/20 text-amber-300">Guitar</Badge>}
                        {separation.keyboard_url && <Badge className="text-xs bg-green-500/20 text-green-300">Keys</Badge>}
                      </div>

                      <Button
                        onClick={() => handleOpenMixer(separation)}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                        Open Mixer
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Processing Separations */}
        {processingSeparations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400 animate-pulse" />
              Processing Separations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processingSeparations.map((separation) => {
                const track = tracks.find(t => t.id === separation.track_id);
                return (
                  <div
                    key={separation.id}
                    className="bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                      <div>
                        <h3 className="font-semibold text-white truncate">{track?.title || 'Unknown Track'}</h3>
                        <p className="text-xs text-slate-400">Separating stems...</p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      {separation.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Separate New Track Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              Separate New Track
            </h2>
            <div className="relative flex-1 max-w-md ml-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracks..."
                className="pl-10 bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-12 w-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/20 rounded-xl border border-slate-700/50">
              <Disc className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No tracks available</p>
              <p className="text-sm text-slate-500">Create some tracks first to separate stems</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTracks.map((track, index) => {
                const trackSeparations = getTrackSeparations(track.id);
                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden hover:border-cyan-500/50 transition-all"
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                      <button
                        onClick={() => playTrack(track)}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <Play className="h-6 w-6 text-slate-900 ml-0.5" />
                      </button>
                      {trackSeparations.length > 0 && (
                        <Badge className="absolute top-2 right-2 bg-green-500/90 text-white border-0">
                          <GitBranch className="h-3 w-3 mr-1" />
                          {trackSeparations.length}
                        </Badge>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white truncate">{track.title}</h3>
                      <p className="text-sm text-slate-400 truncate">{track.style || 'Unknown Style'}</p>
                      <Button
                        onClick={() => {
                          haptics.medium();
                          setSelectedTrack(track);
                          setShowSeparationDialog(true);
                        }}
                        className="w-full mt-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                      >
                        <Disc className="h-4 w-4 mr-2" />
                        Separate Stems
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Stem Separation Dialog */}
      {selectedTrack && showSeparationDialog && (
        <StemSeparationDialog
          open={showSeparationDialog}
          onClose={() => {
            setShowSeparationDialog(false);
            setSelectedTrack(null);
          }}
          track={selectedTrack}
          onSuccess={() => {
            queryClient.invalidateQueries(['stem-separations']);
            setShowSeparationDialog(false);
            setSelectedTrack(null);
          }}
        />
      )}

      {/* Stem Mixer */}
      {selectedStemSeparation && showMixer && (
        <StemMixer
          open={showMixer}
          onClose={() => {
            setShowMixer(false);
            setSelectedStemSeparation(null);
          }}
          stemSeparation={selectedStemSeparation}
        />
      )}
    </div>
  );
}