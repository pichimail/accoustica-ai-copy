import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import TrackCard from '@/components/tracks/TrackCard';
import TrackEditDialog from '@/components/tracks/TrackEditDialog';
import ShareTrackDialog from '@/components/collaboration/ShareTrackDialog';
import VersionHistory from '@/components/collaboration/VersionHistory';
import MusicVideoGenerator from '@/components/video/MusicVideoGenerator';
import MasteringDialog from '@/components/audio/MasteringDialog';
import StemSeparationDialog from '@/components/audio/StemSeparationDialog';
import PersonaCreator from '@/components/audio/PersonaCreator';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Music, Filter, Plus, Library as LibraryIcon, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function LibraryPage() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-created_date');
  const [playingTrack, setPlayingTrack] = useState(null);
  const [editingTrack, setEditingTrack] = useState(null);
  const [sharingTrack, setSharingTrack] = useState(null);
  const [versionHistoryTrack, setVersionHistoryTrack] = useState(null);
  const [videoGeneratingTrack, setVideoGeneratingTrack] = useState(null);
  const [masteringTrack, setMasteringTrack] = useState(null);
  const [stemSeparationTrack, setStemSeparationTrack] = useState(null);
  const [personaCreationTrack, setPersonaCreationTrack] = useState(null);
  const [genreFilter, setGenreFilter] = useState('all');
  const [instrumentalFilter, setInstrumentalFilter] = useState('all');
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const { data: tracks = [], isLoading, refetch } = useQuery({
    queryKey: ['myTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Track.filter(
        { created_by: user.email },
        sortBy,
        100
      );
    },
    enabled: !!user?.email,
    refetchInterval: (data) => {
      const hasGenerating = Array.isArray(data) && data.some(t => t.status === 'generating' || t.status === 'queued');
      return hasGenerating ? 5000 : false;
    },
  });

  const uniqueGenres = [...new Set(tracks.map(t => t.style).filter(Boolean))];

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          track.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          track.style?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || track.status === statusFilter;
    const matchesVisibility = visibilityFilter === 'all' || 
                              (visibilityFilter === 'public' && track.is_public) ||
                              (visibilityFilter === 'private' && !track.is_public) ||
                              (visibilityFilter === 'favorites' && track.is_favorite);
    
    const matchesGenre = genreFilter === 'all' || track.style === genreFilter;
    const matchesInstrumental = instrumentalFilter === 'all' ||
                               (instrumentalFilter === 'instrumental' && track.is_instrumental) ||
                               (instrumentalFilter === 'vocals' && !track.is_instrumental);
    
    return matchesSearch && matchesStatus && matchesVisibility && matchesGenre && matchesInstrumental;
  });

  const handlePlay = (track) => {
    setPlayingTrack(track);
  };

  const handleToggleVisibility = async (track) => {
    await base44.entities.Track.update(track.id, {
      is_public: !track.is_public,
    });
    queryClient.invalidateQueries({ queryKey: ['myTracks'] });
    toast.success(track.is_public ? 'Track is now private' : 'Track is now public');
  };

  const handleDelete = async (track) => {
    await base44.entities.Track.delete(track.id);
    queryClient.invalidateQueries({ queryKey: ['myTracks'] });
    if (playingTrack?.id === track.id) {
      setPlayingTrack(null);
    }
    toast.success('Track deleted');
  };

  const handleToggleFavorite = async (track) => {
    try {
      await base44.entities.Track.update(track.id, {
        is_favorite: !track.is_favorite,
      });
      queryClient.invalidateQueries({ queryKey: ['myTracks'] });
      toast.success(track.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      toast.error('Failed to update favorite status');
    }
  };

  const handleEdit = (track) => {
    setEditingTrack(track);
  };

  const handleShare = (track) => {
    setSharingTrack(track);
  };

  const handleViewVersions = (track) => {
    setVersionHistoryTrack(track);
  };

  const handleGenerateVideo = (track) => {
    setVideoGeneratingTrack(track);
  };

  const handleMaster = (track) => {
    setMasteringTrack(track);
  };

  const handleSeparateStems = (track) => {
    setStemSeparationTrack(track);
  };

  const handleCreatePersona = (track) => {
    setPersonaCreationTrack(track);
  };

  const stats = {
    total: tracks.length,
    ready: tracks.filter(t => t.status === 'ready').length,
    public: tracks.filter(t => t.is_public).length,
    favorites: tracks.filter(t => t.is_favorite).length,
    generating: tracks.filter(t => t.status === 'generating' || t.status === 'queued').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 pb-32">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <LibraryIcon className="h-8 w-8 text-violet-400" />
              My Library
            </h1>
            <p className="text-slate-400 mt-1">
              {stats.total} tracks • {stats.ready} ready • {stats.public} public
            </p>
          </div>
          <Link to={createPageUrl('Create')}>
            <Button className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </Link>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Total Tracks</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Ready to Play</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.ready}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Favorites</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.favorites}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-sm">Generating</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{stats.generating}</p>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-6"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40 bg-slate-800/50 border-slate-700 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="-created_date" className="text-slate-300 focus:text-white focus:bg-slate-700">Newest First</SelectItem>
                <SelectItem value="created_date" className="text-slate-300 focus:text-white focus:bg-slate-700">Oldest First</SelectItem>
                <SelectItem value="title" className="text-slate-300 focus:text-white focus:bg-slate-700">Title A-Z</SelectItem>
                <SelectItem value="-duration" className="text-slate-300 focus:text-white focus:bg-slate-700">Longest</SelectItem>
                <SelectItem value="duration" className="text-slate-300 focus:text-white focus:bg-slate-700">Shortest</SelectItem>
                <SelectItem value="-plays" className="text-slate-300 focus:text-white focus:bg-slate-700">Most Played</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-white text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300 focus:text-white focus:bg-slate-700">All Status</SelectItem>
                <SelectItem value="ready" className="text-slate-300 focus:text-white focus:bg-slate-700">Ready</SelectItem>
                <SelectItem value="generating" className="text-slate-300 focus:text-white focus:bg-slate-700">Generating</SelectItem>
                <SelectItem value="queued" className="text-slate-300 focus:text-white focus:bg-slate-700">Queued</SelectItem>
                <SelectItem value="failed" className="text-slate-300 focus:text-white focus:bg-slate-700">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-white text-sm">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300 focus:text-white focus:bg-slate-700">All</SelectItem>
                <SelectItem value="public" className="text-slate-300 focus:text-white focus:bg-slate-700">Public</SelectItem>
                <SelectItem value="private" className="text-slate-300 focus:text-white focus:bg-slate-700">Private</SelectItem>
                <SelectItem value="favorites" className="text-slate-300 focus:text-white focus:bg-slate-700">Favorites</SelectItem>
              </SelectContent>
            </Select>

            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-white text-sm">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300 focus:text-white focus:bg-slate-700">All Genres</SelectItem>
                {uniqueGenres.map(genre => (
                  <SelectItem key={genre} value={genre} className="text-slate-300 focus:text-white focus:bg-slate-700">
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={instrumentalFilter} onValueChange={setInstrumentalFilter}>
              <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-white text-sm">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300 focus:text-white focus:bg-slate-700">All Types</SelectItem>
                <SelectItem value="vocals" className="text-slate-300 focus:text-white focus:bg-slate-700">With Vocals</SelectItem>
                <SelectItem value="instrumental" className="text-slate-300 focus:text-white focus:bg-slate-700">Instrumental</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            <Music className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No tracks found</h3>
            <p className="text-slate-400 mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Start creating your first track'}
            </p>
            <Link to={createPageUrl('Create')}>
              <Button className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600">
                <Plus className="h-4 w-4 mr-2" />
                Create Track
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-2 gap-4"
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
                    onDelete={handleDelete}
                    onToggleVisibility={handleToggleVisibility}
                    onToggleFavorite={handleToggleFavorite}
                    onEdit={handleEdit}
                    onShare={handleShare}
                    onViewVersions={handleViewVersions}
                    onGenerateVideo={handleGenerateVideo}
                    onMaster={handleMaster}
                    onSeparateStems={handleSeparateStems}
                    onCreatePersona={handleCreatePersona}
                    isPlaying={playingTrack?.id === track.id}
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

      {/* Edit Dialog */}
      <TrackEditDialog
        track={editingTrack}
        open={!!editingTrack}
        onClose={() => setEditingTrack(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['myTracks'] })}
      />

      {/* Share Dialog */}
      <ShareTrackDialog
        track={sharingTrack}
        open={!!sharingTrack}
        onClose={() => setSharingTrack(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['myTracks'] })}
      />

      {/* Version History */}
      <VersionHistory
        track={versionHistoryTrack}
        open={!!versionHistoryTrack}
        onClose={() => setVersionHistoryTrack(null)}
        onPlay={handlePlay}
      />

      {/* Music Video Generator */}
      <MusicVideoGenerator
        track={videoGeneratingTrack}
        open={!!videoGeneratingTrack}
        onClose={() => setVideoGeneratingTrack(null)}
      />

      {/* Mastering Dialog */}
      <MasteringDialog
        track={masteringTrack}
        open={!!masteringTrack}
        onClose={() => setMasteringTrack(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['myTracks'] })}
      />

      {/* Stem Separation Dialog */}
      <StemSeparationDialog
        track={stemSeparationTrack}
        open={!!stemSeparationTrack}
        onClose={() => setStemSeparationTrack(null)}
      />

      {/* Persona Creator */}
      <PersonaCreator
        track={personaCreationTrack}
        open={!!personaCreationTrack}
        onClose={() => setPersonaCreationTrack(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['myTracks'] })}
      />
      </div>
      );
      }