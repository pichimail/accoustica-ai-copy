import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AudioPlayer from '@/components/audio/AudioPlayer';
import CommentsPanel from '@/components/collaboration/CommentsPanel';
import AICollaborationPanel from '@/components/studio/AICollaborationPanel';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { 
  Users, MessageSquare, History, Save, Download, 
  Play, Pause, Video, Sparkles, Volume2, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CollaborativeStudio() {
  const [searchParams] = useSearchParams();
  const trackId = searchParams.get('id');
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState([]);
  const queryClient = useQueryClient();
  const audioRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  // Fetch track data with auto-refresh
  const { data: track } = useQuery({
    queryKey: ['track', trackId],
    queryFn: async () => {
      const tracks = await base44.entities.Track.filter({ id: trackId });
      return tracks[0];
    },
    enabled: !!trackId,
    refetchInterval: 3000, // Refresh every 3 seconds for pseudo-real-time
  });

  // Fetch collaborators
  const { data: shares = [] } = useQuery({
    queryKey: ['trackShares', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      return await base44.entities.TrackShare.filter({ track_id: trackId, status: 'accepted' });
    },
    enabled: !!trackId,
    refetchInterval: 5000,
  });

  // Fetch chat messages
  const { data: chatMessages = [] } = useQuery({
    queryKey: ['studioChat', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      return await base44.entities.TrackComment.filter({ track_id: trackId }, '-created_date', 50);
    },
    enabled: !!trackId && showChat,
    refetchInterval: 2000,
  });

  // Fetch version history
  const { data: versions = [] } = useQuery({
    queryKey: ['trackVersions', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      return await base44.entities.TrackVersion.filter({ parent_track_id: trackId }, '-created_date');
    },
    enabled: !!trackId && showVersions,
  });

  const sendChatMutation = useMutation({
    mutationFn: async (message) => {
      return await base44.entities.TrackComment.create({
        track_id: trackId,
        user_email: user.email,
        user_name: user.full_name,
        comment_text: message,
        timestamp_seconds: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studioChat', trackId] });
      setChatMessage('');
    },
  });

  const createSnapshotMutation = useMutation({
    mutationFn: async (description) => {
      return await base44.entities.TrackVersion.create({
        track_id: trackId,
        parent_track_id: trackId,
        changes_description: description,
        edit_type: 'other',
        edited_by: user.email,
        version_number: versions.length + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackVersions', trackId] });
      toast.success('Snapshot saved');
    },
  });

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    sendChatMutation.mutate(chatMessage);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!track) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  const canEdit = track.created_by === user?.email || 
                  shares.some(s => s.shared_with_email === user?.email && s.permission === 'edit');

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-violet-400" />
              {track.title}
            </h1>
            <p className="text-slate-400 text-sm mt-1">{track.style}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Active Collaborators */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <div className="flex -space-x-2">
                <Avatar className="h-8 w-8 border-2 border-slate-900">
                  <div className="w-full h-full bg-violet-500 flex items-center justify-center text-white text-xs">
                    {track.created_by?.charAt(0).toUpperCase()}
                  </div>
                </Avatar>
                {shares.slice(0, 3).map((share, idx) => (
                  <Avatar key={idx} className="h-8 w-8 border-2 border-slate-900">
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xs">
                      {share.shared_with_email?.charAt(0).toUpperCase()}
                    </div>
                  </Avatar>
                ))}
              </div>
              <span className="text-sm text-slate-400">{shares.length + 1} online</span>
            </div>

            <Button
              onClick={() => createSnapshotMutation.mutate('Manual snapshot')}
              disabled={!canEdit}
              variant="outline"
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Snapshot
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Versions */}
        <div className="w-64 bg-slate-800/30 border-r border-slate-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="h-4 w-4" />
              Versions ({versions.length})
            </h3>
          </div>
          
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-2">
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                    Current
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{track.title}</p>
              </div>
              
              {versions.map((version, idx) => (
                <div key={version.id} className="bg-slate-800/50 rounded-lg p-3 hover:bg-slate-700/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-white">v{version.version_number || versions.length - idx}</span>
                    <Badge variant="outline" className="text-xs bg-slate-700 text-slate-300 border-slate-600">
                      {version.edit_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-1">{version.changes_description}</p>
                  <p className="text-xs text-slate-500">{formatDate(version.created_date)}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center - Audio Player & Waveform */}
        <div className="flex-1 flex flex-col p-6">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-3xl">
              {track.status === 'ready' ? (
                <div className="w-full space-y-6">
                  {/* Album Art */}
                  <div className="w-full aspect-square max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl">
                    <img 
                      src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'} 
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Audio Player */}
                  <AudioPlayer
                    src={track.audio_url || track.stream_audio_url}
                    title={track.title}
                    artist={track.style}
                    coverImage={track.cover_image_url}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 text-violet-400 animate-spin mx-auto mb-4" />
                  <p className="text-white">Track is {track.status}...</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Tools & Comments */}
          <div className="mt-6 space-y-4">
            <AICollaborationPanel track={track} />
            <CommentsPanel track={track} currentTime={currentTime} user={user} />
          </div>
        </div>

        {/* Right Sidebar - Chat */}
        <div className="w-80 bg-slate-800/30 border-l border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Studio Chat
            </h3>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/50 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-white">{msg.user_name}</span>
                    <span className="text-xs text-slate-500">{formatDate(msg.created_date)}</span>
                  </div>
                  <p className="text-sm text-slate-300">{msg.comment_text}</p>
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <Input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type a message..."
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Button
                onClick={handleSendChat}
                disabled={!chatMessage.trim() || sendChatMutation.isPending}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}