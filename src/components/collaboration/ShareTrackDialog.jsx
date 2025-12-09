import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export default function ShareTrackDialog({ track, open, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: shares = [] } = useQuery({
    queryKey: ['trackShares', track?.id],
    queryFn: async () => {
      if (!track?.id) return [];
      return await base44.entities.TrackShare.filter({ track_id: track.id });
    },
    enabled: !!track?.id && open,
  });

  const handleShare = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.TrackShare.create({
        track_id: track.id,
        shared_with_email: email,
        permission,
        message,
        status: 'pending',
      });

      toast.success(`Track shared with ${email}`);
      setEmail('');
      setMessage('');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to share track: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId) => {
    try {
      await base44.entities.TrackShare.delete(shareId);
      toast.success('Share removed');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to remove share');
    }
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Share Track: {track.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300">Permission</Label>
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="view" className="text-slate-300 focus:text-white focus:bg-slate-700">
                  View Only
                </SelectItem>
                <SelectItem value="edit" className="text-slate-300 focus:text-white focus:bg-slate-700">
                  Can Edit
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Message (Optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message..."
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <Button onClick={handleShare} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Share Track
          </Button>

          {shares.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Shared With</h3>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                    <div>
                      <p className="text-white text-sm">{share.shared_with_email}</p>
                      <p className="text-slate-400 text-xs">
                        {share.permission} • {share.status}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveShare(share.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}