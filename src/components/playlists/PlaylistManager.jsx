import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'sonner';
import { Plus, Music, Trash2, ListMusic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function PlaylistManager({ track, open, onClose }) {
  const [creating, setCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const queryClient = useQueryClient();

  const { data: playlists = [] } = useQuery({
    queryKey: ['myPlaylists'],
    queryFn: () => base44.entities.Playlist.list('-created_date', 100),
    enabled: open,
  });

  const createPlaylistMutation = useMutation({
    mutationFn: (data) => base44.entities.Playlist.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPlaylists'] });
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      setCreating(false);
      toast.success('Playlist created!');
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId }) => {
      // Get existing tracks
      const existingTracks = await base44.entities.PlaylistTrack.filter({ playlist_id: playlistId });
      const position = existingTracks.length;
      
      // Add track to playlist
      await base44.entities.PlaylistTrack.create({
        playlist_id: playlistId,
        track_id: track.id,
        position,
      });

      // Update track count
      const playlist = playlists.find(p => p.id === playlistId);
      await base44.entities.Playlist.update(playlistId, {
        track_count: (playlist.track_count || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPlaylists'] });
      toast.success('Added to playlist!');
      onClose();
    },
  });

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    createPlaylistMutation.mutate({
      name: newPlaylistName,
      description: newPlaylistDesc,
      cover_image_url: track?.cover_image_url || '',
    });
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-violet-400" />
            Add to Playlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Playlists */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {playlists.length === 0 && !creating ? (
              <p className="text-slate-400 text-center py-8">No playlists yet. Create one below!</p>
            ) : (
              playlists.map((playlist) => (
                <motion.button
                  key={playlist.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => addToPlaylistMutation.mutate({ playlistId: playlist.id })}
                  className="w-full p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-violet-500/50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                      <Music className="h-6 w-6 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">{playlist.name}</h4>
                      <p className="text-sm text-slate-400">{playlist.track_count || 0} tracks</p>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>

          {/* Create New Playlist */}
          <AnimatePresence>
            {creating && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 border-t border-slate-700 pt-4"
              >
                <div>
                  <Label className="text-slate-300">Playlist Name</Label>
                  <Input
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="My Awesome Playlist"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Description (Optional)</Label>
                  <Textarea
                    value={newPlaylistDesc}
                    onChange={(e) => setNewPlaylistDesc(e.target.value)}
                    placeholder="Description..."
                    className="bg-slate-800 border-slate-700 text-white h-20"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreatePlaylist}
                    disabled={createPlaylistMutation.isPending}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                  >
                    Create & Add
                  </Button>
                  <Button
                    onClick={() => setCreating(false)}
                    variant="outline"
                    className="border-slate-700 text-slate-300"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!creating && (
            <Button
              onClick={() => setCreating(true)}
              variant="outline"
              className="w-full border-dashed border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Playlist
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}