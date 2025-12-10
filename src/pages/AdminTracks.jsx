import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Music, Search, ArrowLeft, Trash2, Eye, EyeOff,
  Play, Pause, Loader2, ExternalLink
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function AdminTracksPage() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentTrack, isPlaying: globalIsPlaying, playTrack } = useAudioPlayer();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      if (userData.role !== 'admin') {
        navigate(createPageUrl('Home'));
        return;
      }
      setUser(userData);
    };
    fetchUser();
  }, [navigate]);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['adminTracks'],
    queryFn: () => base44.entities.Track.list('-created_date', 200),
    enabled: !!user,
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id) => base44.entities.Track.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTracks'] });
      toast.success('Track deleted');
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, isPublic }) => {
      // Admin can toggle visibility without user consent
      await base44.asServiceRole.entities.Track.update(id, { is_public: !isPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTracks'] });
      toast.success('Visibility updated');
    },
  });

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          track.created_by?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          track.style?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || track.status === statusFilter;
    const matchesVisibility = visibilityFilter === 'all' || 
                              (visibilityFilter === 'public' && track.is_public) ||
                              (visibilityFilter === 'private' && !track.is_public);
    return matchesSearch && matchesStatus && matchesVisibility;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const statusColors = {
    queued: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    generating: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ready: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to={createPageUrl('AdminDashboard')}>
            <Button variant="ghost" className="text-slate-400 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Music className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">All Tracks</h1>
              <p className="text-slate-400">{tracks.length} total tracks</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tracks, users, styles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40 bg-slate-800/50 border-slate-700 text-white">
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
            <SelectTrigger className="w-full md:w-40 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-slate-300 focus:text-white focus:bg-slate-700">All</SelectItem>
              <SelectItem value="public" className="text-slate-300 focus:text-white focus:bg-slate-700">Public</SelectItem>
              <SelectItem value="private" className="text-slate-300 focus:text-white focus:bg-slate-700">Private</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Tracks Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Track</TableHead>
                    <TableHead className="text-slate-400">User</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Visibility</TableHead>
                    <TableHead className="text-slate-400">Duration</TableHead>
                    <TableHead className="text-slate-400">Plays</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTracks.map((track) => (
                    <TableRow key={track.id} className="border-slate-700">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div 
                            className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 cursor-pointer group"
                            onClick={() => {
                              if (track.status === 'ready') {
                                playTrack(track);
                              }
                            }}
                          >
                            <img
                              src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                            {track.status === 'ready' && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                {currentTrack?.id === track.id && globalIsPlaying ? (
                                  <Pause className="h-5 w-5 text-white" />
                                ) : (
                                  <Play className="h-5 w-5 text-white ml-0.5" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate max-w-[200px]">{track.title}</p>
                            <p className="text-sm text-slate-400 truncate max-w-[200px]">{track.style || 'No style'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-300">{track.created_by}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[track.status]}>
                          {track.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleVisibilityMutation.mutate({ id: track.id, isPublic: track.is_public })}
                          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                        >
                          {track.is_public ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <Eye className="h-4 w-4" /> Public
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-400">
                              <EyeOff className="h-4 w-4" /> Private
                            </span>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-300">{formatDuration(track.duration)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-300">{track.plays || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-400 text-sm">{formatDate(track.created_date)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link to={createPageUrl('TrackView') + `?id=${track.id}`}>
                            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Delete this track?')) {
                                deleteTrackMutation.mutate(track.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}