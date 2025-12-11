import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Video, Search, Play, Download, Share2, Clock, Film, Sparkles, Eye } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import MusicVideoGenerator from '@/components/video/MusicVideoGenerator';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';

export default function VideoStudioPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const { playTrack } = useAudioPlayer();
  const queryClient = useQueryClient();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-created_date'),
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['videos'],
    queryFn: () => base44.entities.VideoGeneration.list('-created_date'),
    refetchInterval: (data) => {
      const hasPending = data?.some(v => v.status === 'pending' || v.status === 'processing');
      return hasPending ? 5000 : false;
    },
  });

  const filteredTracks = tracks.filter(track => 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
    track.status === 'ready'
  );

  const readyVideos = videos.filter(v => v.status === 'ready');
  const processingVideos = videos.filter(v => v.status === 'processing' || v.status === 'pending');

  const handleDownloadVideo = (video) => {
    haptics.medium();
    window.open(video.video_url, '_blank');
  };

  const handleShareVideo = (video) => {
    haptics.light();
    navigator.clipboard.writeText(video.video_url);
    toast.success('Video link copied to clipboard!');
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
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Video Generation Studio</h1>
              <p className="text-slate-400 text-sm">Create stunning music videos with AI</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Film className="h-5 w-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{readyVideos.length}</p>
                  <p className="text-xs text-slate-400">Generated Videos</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{processingVideos.length}</p>
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

        {/* Generated Videos Section */}
        {readyVideos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Film className="h-5 w-5 text-pink-400" />
              Your Music Videos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {readyVideos.map((video, index) => {
                const track = tracks.find(t => t.id === video.track_id);
                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden hover:border-pink-500/50 transition-all"
                  >
                    <div className="aspect-video relative overflow-hidden bg-slate-900">
                      <video
                        src={video.video_url}
                        className="w-full h-full object-cover"
                        poster={track?.cover_image_url}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                      <button
                        onClick={() => window.open(video.video_url, '_blank')}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <Play className="h-6 w-6 text-slate-900 ml-0.5" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white truncate">{track?.title || 'Untitled'}</h3>
                      <p className="text-xs text-slate-400 mt-1">{new Date(video.created_date).toLocaleDateString()}</p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadVideo(video)}
                          className="flex-1 border-slate-700 text-slate-300 hover:text-white"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShareVideo(video)}
                          className="flex-1 border-slate-700 text-slate-300 hover:text-white"
                        >
                          <Share2 className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Processing Videos */}
        {processingVideos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-400 animate-pulse" />
              Processing Videos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processingVideos.map((video) => {
                const track = tracks.find(t => t.id === video.track_id);
                return (
                  <div
                    key={video.id}
                    className="bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden p-4"
                  >
                    <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center mb-3">
                      <div className="text-center">
                        <div className="h-12 w-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Generating video...</p>
                      </div>
                    </div>
                    <h3 className="font-semibold text-white truncate">{track?.title || 'Untitled'}</h3>
                    <Badge className="mt-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      {video.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Create New Video Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              Create New Video
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
              <div className="h-12 w-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="text-center py-20 bg-slate-800/20 rounded-xl border border-slate-700/50">
              <Video className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No tracks available</p>
              <p className="text-sm text-slate-500">Create some tracks first to generate videos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTracks.map((track, index) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden hover:border-pink-500/50 transition-all"
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white truncate">{track.title}</h3>
                    <p className="text-sm text-slate-400 truncate">{track.style || 'Unknown Style'}</p>
                    <Button
                      onClick={() => {
                        haptics.medium();
                        setSelectedTrack(track);
                        setShowGenerator(true);
                      }}
                      className="w-full mt-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Generate Video
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Video Generator Modal */}
      {selectedTrack && showGenerator && (
        <MusicVideoGenerator
          open={showGenerator}
          onClose={() => {
            setShowGenerator(false);
            setSelectedTrack(null);
          }}
          track={selectedTrack}
          onSuccess={() => {
            queryClient.invalidateQueries(['videos']);
            setShowGenerator(false);
            setSelectedTrack(null);
          }}
        />
      )}
    </div>
  );
}