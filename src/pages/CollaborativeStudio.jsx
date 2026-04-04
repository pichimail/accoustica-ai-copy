import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import {
  Music, MessageSquare, Sparkles, Loader2, Search,
  Send, Play, Pause, Users, History, Save, ChevronDown, X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const STUDIO_TABS = [
  { id: 'tracks', label: 'My Tracks', icon: Music },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'ai', label: 'AI Tools', icon: Sparkles },
];

export default function CollaborativeStudio() {
  const [user, setUser] = useState(null);
  const [studioTab, setStudioTab] = useState('tracks');
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [chatMsg, setChatMsg] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const queryClient = useQueryClient();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ['studioTracks', user?.email],
    queryFn: () => base44.entities.Track.filter({ created_by: user.email, status: 'ready' }, '-created_date', 30),
    enabled: !!user?.email,
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['studioChat', selectedTrack?.id],
    queryFn: () => base44.entities.TrackComment.filter({ track_id: selectedTrack.id }, '-created_date', 50),
    enabled: !!selectedTrack?.id && studioTab === 'chat',
    refetchInterval: 3000,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['trackVersions', selectedTrack?.id],
    queryFn: () => base44.entities.TrackVersion.filter({ parent_track_id: selectedTrack.id }, '-created_date'),
    enabled: !!selectedTrack?.id,
  });

  const sendChat = useMutation({
    mutationFn: (msg) => base44.entities.TrackComment.create({
      track_id: selectedTrack.id,
      user_email: user.email,
      user_name: user.full_name,
      comment_text: msg,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studioChat', selectedTrack?.id] });
      setChatMsg('');
    },
  });

  const saveSnapshot = useMutation({
    mutationFn: () => base44.entities.TrackVersion.create({
      track_id: selectedTrack.id,
      parent_track_id: selectedTrack.id,
      changes_description: `Snapshot at ${new Date().toLocaleTimeString()}`,
      edit_type: 'other',
      edited_by: user.email,
      version_number: versions.length + 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackVersions', selectedTrack?.id] });
      haptics.success();
      toast.success('Snapshot saved!');
    },
  });

  const handleAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    haptics.light();
    try {
      const ctx = selectedTrack
        ? `Track: "${selectedTrack.title}", Style: ${selectedTrack.style}, Prompt: ${selectedTrack.prompt}`
        : 'No track selected';
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Music collaboration assistant. Context: ${ctx}\n\nUser: ${aiPrompt}\n\nProvide helpful, specific music advice.`,
      });
      setAiResponse(res);
      haptics.success();
    } catch (e) {
      toast.error('AI unavailable');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-32 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 pt-2 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-white">Studio</h1>
            {selectedTrack && (
              <p className="text-xs text-violet-400 mt-0.5 truncate max-w-[200px]">{selectedTrack.title}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedTrack && (
              <button
                onClick={() => saveSnapshot.mutate()}
                disabled={saveSnapshot.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 text-xs font-medium"
              >
                {saveSnapshot.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Snapshot
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {STUDIO_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setStudioTab(id); haptics.selection(); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                studioTab === id ? 'bg-white/10 text-white' : 'text-white/40'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4">
        {/* TRACKS TAB */}
        {studioTab === 'tracks' && (
          <div className="space-y-2">
            {tracksLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-16">
                <Music className="h-12 w-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm mb-4">No ready tracks yet</p>
                <Link to={createPageUrl('Create')}>
                  <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-sm font-semibold">
                    Create First Track
                  </button>
                </Link>
              </div>
            ) : (
              tracks.map((track, i) => (
                <motion.button
                  key={track.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => { setSelectedTrack(track); haptics.light(); }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    selectedTrack?.id === track.id
                      ? 'bg-violet-500/15 border-violet-500/40'
                      : 'bg-white/5 border-white/8'
                  )}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                    {track.cover_image_url ? (
                      <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-5 w-5 text-white/20" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', selectedTrack?.id === track.id ? 'text-violet-300' : 'text-white')}>
                      {track.title}
                    </p>
                    <p className="text-xs text-white/40 truncate">{track.style}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {versions.filter(v => v.parent_track_id === track.id).length > 0 && (
                      <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded">
                        {versions.filter(v => v.parent_track_id === track.id).length}v
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.medium();
                        playTrack(track, tracks);
                      }}
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        currentTrack?.id === track.id && isPlaying ? 'bg-violet-500 text-white' : 'bg-white/10 text-white/60'
                      )}
                    >
                      {currentTrack?.id === track.id && isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                    </button>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {studioTab === 'chat' && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
            {!selectedTrack ? (
              <div className="text-center py-12">
                <MessageSquare className="h-10 w-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Select a track first</p>
                <button onClick={() => setStudioTab('tracks')} className="mt-3 text-violet-400 text-sm underline underline-offset-2">
                  Go to Tracks
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-2 pb-4">
                  {[...chatMessages].reverse().map((msg) => (
                    <div key={msg.id} className={cn(
                      'max-w-[80%] p-3 rounded-xl text-sm',
                      msg.user_email === user?.email
                        ? 'ml-auto bg-violet-600/40 border border-violet-500/30 text-violet-100'
                        : 'bg-white/5 border border-white/8 text-white'
                    )}>
                      {msg.user_email !== user?.email && (
                        <p className="text-[10px] text-white/40 mb-1">{msg.user_name}</p>
                      )}
                      <p>{msg.comment_text}</p>
                    </div>
                  ))}
                  {chatMessages.length === 0 && (
                    <p className="text-center text-white/25 text-sm py-8">No messages yet. Start the conversation!</p>
                  )}
                </div>
                <div className="flex gap-2 pt-2 border-t border-white/8">
                  <input
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && chatMsg.trim() && sendChat.mutate(chatMsg)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none"
                  />
                  <button
                    onClick={() => chatMsg.trim() && sendChat.mutate(chatMsg)}
                    disabled={!chatMsg.trim() || sendChat.isPending}
                    className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* AI TOOLS TAB */}
        {studioTab === 'ai' && (
          <div className="space-y-4">
            {selectedTrack && (
              <div className="bg-white/5 border border-white/8 rounded-xl p-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                  {selectedTrack.cover_image_url ? <img src={selectedTrack.cover_image_url} alt="" className="w-full h-full object-cover" /> : <Music className="h-4 w-4 text-white/20 m-auto" />}
                </div>
                <p className="text-sm text-white truncate flex-1">{selectedTrack.title}</p>
                <button onClick={() => setSelectedTrack(null)} className="text-white/30">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Ask AI about your music</label>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. How can I improve the mixing of this track? What BPM would fit this style?"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/25 focus:outline-none resize-none"
              />
              <button
                onClick={handleAI}
                disabled={!aiPrompt.trim() || isAiLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isAiLoading ? 'Thinking…' : 'Ask AI'}
              </button>
            </div>

            {aiResponse && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-xs font-semibold text-violet-400">AI Response</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
              </motion.div>
            )}

            {/* Quick prompts */}
            <div className="space-y-2">
              <p className="text-xs text-white/30 uppercase tracking-wider font-semibold">Quick Prompts</p>
              {[
                'Suggest ways to improve my track',
                'What genres pair well with this style?',
                'Give me lyric ideas for this mood',
                'How should I master this type of music?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setAiPrompt(q); haptics.light(); }}
                  className="w-full text-left px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}