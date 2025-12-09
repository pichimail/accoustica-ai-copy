import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function CommentsPanel({ track, currentTime, user }) {
  const [newComment, setNewComment] = useState('');
  const [addAtTimestamp, setAddAtTimestamp] = useState(false);
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['trackComments', track?.id],
    queryFn: async () => {
      if (!track?.id) return [];
      return await base44.entities.TrackComment.filter({ track_id: track.id }, '-created_date');
    },
    enabled: !!track?.id,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      return await base44.entities.TrackComment.create(commentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackComments', track.id] });
      setNewComment('');
      setAddAtTimestamp(false);
      toast.success('Comment added');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      return await base44.entities.TrackComment.delete(commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trackComments', track.id] });
      toast.success('Comment deleted');
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    addCommentMutation.mutate({
      track_id: track.id,
      user_email: user.email,
      user_name: user.full_name,
      comment_text: newComment,
      timestamp_seconds: addAtTimestamp ? currentTime : null,
    });
  };

  const formatTimestamp = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-violet-400" />
        <h3 className="text-lg font-semibold text-white">Comments</h3>
        <span className="text-sm text-slate-400">({comments.length})</span>
      </div>

      <ScrollArea className="flex-1 mb-4 pr-4">
        <AnimatePresence>
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 bg-slate-800/50 rounded-lg p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="text-sm font-medium text-white">{comment.user_name}</span>
                  {comment.timestamp_seconds !== null && (
                    <span className="ml-2 text-xs text-violet-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(comment.timestamp_seconds)}
                    </span>
                  )}
                </div>
                {comment.user_email === user?.email && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-slate-300 mb-1">{comment.comment_text}</p>
              <span className="text-xs text-slate-500">{formatDate(comment.created_date)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </ScrollArea>

      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="bg-slate-800 border-slate-700 text-white resize-none"
          rows={3}
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={addAtTimestamp}
              onChange={(e) => setAddAtTimestamp(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800"
            />
            Add at {formatTimestamp(currentTime) || '0:00'}
          </label>
          <Button
            onClick={handleAddComment}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}