import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Globe, Loader2, Send, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getPublicTrackUrl, getSeoDescription, getTrackPublicSlug } from '@/lib/trackSharing';

export default function ShareTrackDialog({ track, open, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const publicUrl = useMemo(() => track ? getPublicTrackUrl(track) : '', [track]);

  const { data: shares = [] } = useQuery({
    queryKey: ['trackShares', track?.id],
    queryFn: async () => {
      if (!track?.id) return [];
      return base44.entities.TrackShare.filter({ track_id: track.id }, '-created_date', 50);
    },
    enabled: !!track?.id && open,
  });

  if (!track) return null;

  const ensurePublic = async () => {
    const slug = getTrackPublicSlug(track);
    const seoTitle = track.seo_title || `${track.title} by ${track.created_by?.split('@')[0] || 'Accoustica'}`;
    const seoDescription = track.seo_description || getSeoDescription(track);
    await base44.entities.Track.update(track.id, {
      is_public: true,
      public_slug: slug,
      seo_title: seoTitle,
      seo_description: seoDescription,
    });
    return slug;
  };

  const handleCopyPublicLink = async () => {
    setSaving(true);
    try {
      await ensurePublic();
      await navigator.clipboard.writeText(publicUrl);
      await base44.entities.TrackShare.create({
        track_id: track.id,
        public_url: publicUrl,
        status: 'active',
      });
      await base44.entities.Track.update(track.id, {
        share_count: (track.share_count || 0) + 1,
      });
      toast.success('Public player link copied');
      queryClient.invalidateQueries({ queryKey: ['myTracks'] });
      queryClient.invalidateQueries({ queryKey: ['trackShares', track.id] });
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'Could not create public link');
    } finally {
      setSaving(false);
    }
  };

  const handleNativeShare = async () => {
    setSaving(true);
    try {
      await ensurePublic();
      if (navigator.share) {
        await navigator.share({
          title: track.seo_title || track.title,
          text: track.seo_description || getSeoDescription(track),
          url: publicUrl,
        });
      } else {
        await navigator.clipboard.writeText(publicUrl);
        toast.success('Public player link copied');
      }
      await base44.entities.Track.update(track.id, {
        share_count: (track.share_count || 0) + 1,
      });
      queryClient.invalidateQueries({ queryKey: ['myTracks'] });
      onSuccess?.();
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error(error.message || 'Could not share track');
    } finally {
      setSaving(false);
    }
  };

  const handlePrivateShare = async () => {
    if (!email.trim()) {
      toast.error('Enter an email address');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.TrackShare.create({
        track_id: track.id,
        shared_with_email: email.trim(),
        permission: 'view',
        message: message.trim(),
        public_url: publicUrl,
        status: 'pending',
      });
      setEmail('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['trackShares', track.id] });
      toast.success('Private share created');
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || 'Could not share privately');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveShare = async (shareId) => {
    await base44.entities.TrackShare.delete(shareId);
    queryClient.invalidateQueries({ queryKey: ['trackShares', track.id] });
    toast.success('Share removed');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl border-white/10 bg-[#09090f] text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-extrabold">Share Track</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="h-14 w-14 overflow-hidden border flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
              {track.cover_image_url ? <img src={track.cover_image_url} alt="" className="h-full w-full object-cover" /> : <Globe className="h-5 w-5 m-4 text-white/25" />}
            </div>
            <div className="min-w-0">
              <p className="font-bold truncate">{track.title}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{publicUrl}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyPublicLink}
              disabled={saving}
              className="flex items-center justify-center gap-2 border px-4 py-3 text-sm font-bold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
              style={{ background: '#e11d48', borderColor: '#e11d48' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Copy Public Link
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={saving}
              className="flex items-center justify-center gap-2 border px-4 py-3 text-sm font-bold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
              style={{ background: 'rgba(255,255,255,0.045)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>Private Invite</p>
            <div className="grid sm:grid-cols-[1fr_auto] gap-2">
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="user@example.com"
                aria-label="Invite email"
                className="px-3 py-2.5 text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
              <button
                type="button"
                onClick={handlePrivateShare}
                disabled={saving}
                className="px-4 py-2.5 border text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.055)' }}
              >
                <Send className="h-4 w-4" />
                Invite
              </button>
            </div>
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="Optional message"
              aria-label="Share message"
              rows={3}
              className="mt-2 w-full px-3 py-2.5 text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 resize-none focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>

          {shares.length > 0 && (
            <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>Share History</p>
              <div className="divide-y divide-white/5 border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                {shares.map(share => (
                  <div key={share.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{share.shared_with_email || 'Public link'}</p>
                      <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>{share.status}</p>
                    </div>
                    <button type="button" onClick={() => handleRemoveShare(share.id)} aria-label="Remove share" className="p-2 text-red-400 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
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
