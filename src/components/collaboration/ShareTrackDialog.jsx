// @ts-nocheck
import React, { useMemo, useState } from 'react';
import * as trackClient from '@/api/trackClient';
// TODO_EXPORT_REPLACE_WITH_NEON_DB: TrackShare → NeonDB table
import { base44 } from '@/api/exportClient';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Globe, Loader2, Send, Share2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { getPublicTrackUrl, getSeoDescription, getTrackPublicSlug } from '@/lib/trackSharing';

const SOCIALS = [
  {
    label: 'WhatsApp', color: '#25D366',
    fn: (url, title) => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`🎵 "${title}" — made with Accoustica AI`)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener'),
  },
  {
    label: 'Facebook', color: '#1877F2',
    fn: (url) => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener'),
  },
  {
    label: 'Twitter/X', color: '#1D9BF0',
    fn: (url, title) => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎵 "${title}" — made with @AccousticaAI`)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener'),
  },
  {
    label: 'TikTok', color: '#69C9D0',
    fn: () => window.open('https://www.tiktok.com/upload', '_blank', 'noopener'),
  },
  {
    label: 'Instagram', color: '#E1306C',
    fn: (url) => { navigator.clipboard.writeText(url); toast.info('Link copied — paste in Instagram bio or story'); },
  },
  {
    label: 'YouTube', color: '#FF0000',
    fn: () => window.open('https://studio.youtube.com/', '_blank', 'noopener'),
  },
];

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
      // TODO_EXPORT_REPLACE_WITH_NEON_DB: TrackShare entity → NeonDB table
      return base44.entities.TrackShare.filter({ track_id: track.id }, '-created_date', 50);
    },
    enabled: !!track?.id && open,
  });

  if (!track) return null;

  const ensurePublic = async () => {
    const slug = getTrackPublicSlug(track);
    const seoTitle = track.seo_title || `${track.title} by ${track.created_by?.split('@')[0] || 'Accoustica'}`;
    const seoDescription = track.seo_description || getSeoDescription(track);
    await trackClient.updateTrack(track.id, {
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
      // TODO_EXPORT_REPLACE_WITH_NEON_DB: TrackShare entity → NeonDB table
      await base44.entities.TrackShare.create({ track_id: track.id, public_url: publicUrl, status: 'active' });
      await trackClient.updateTrack(track.id, { share_count: (track.share_count || 0) + 1 });
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
        await navigator.share({ title: track.seo_title || track.title, text: track.seo_description || getSeoDescription(track), url: publicUrl });
      } else {
        await navigator.clipboard.writeText(publicUrl);
        toast.success('Public player link copied');
      }
      await trackClient.updateTrack(track.id, { share_count: (track.share_count || 0) + 1 });
      queryClient.invalidateQueries({ queryKey: ['myTracks'] });
      onSuccess?.();
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error(error.message || 'Could not share track');
    } finally {
      setSaving(false);
    }
  };

  const handlePrivateShare = async () => {
    if (!email.trim()) { toast.error('Enter an email address'); return; }
    setSaving(true);
    try {
      // TODO_EXPORT_REPLACE_WITH_NEON_DB: TrackShare → NeonDB
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
    // TODO_EXPORT_REPLACE_WITH_NEON_DB: TrackShare → NeonDB
    await base44.entities.TrackShare.delete(shareId);
    queryClient.invalidateQueries({ queryKey: ['trackShares', track.id] });
    toast.success('Share removed');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Wider on desktop, full bottom-sheet on mobile */}
      <DialogContent className="sm:max-w-lg border-white/10 bg-[#09090f] text-white shadow-2xl p-0 overflow-hidden">

        {/* Drag handle (mobile only) */}
        <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />

        {/* Track preview banner */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="h-14 w-14 rounded-lg overflow-hidden border flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            {track.cover_image_url
              ? <img src={track.cover_image_url} alt="" className="h-full w-full object-cover" />
              : <Globe className="h-5 w-5 m-4 text-white/25" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold truncate text-sm">{track.title}</p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{publicUrl}</p>
          </div>
          {/* Close on desktop (mobile uses swipe) */}
          <button
            onClick={onClose}
            className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 pt-4 pb-6 space-y-5" style={{ maxHeight: 'calc(80vh - 80px)' }}>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyPublicLink}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl disabled:opacity-50 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
              style={{ background: '#e11d48' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Copy Link
            </button>
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={saving}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl disabled:opacity-50 transition-all active:scale-95 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              style={{ background: 'rgba(255,255,255,0.055)' }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>

          {/* Social platforms */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest mb-2.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Share to Social
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SOCIALS.map(({ label, color, fn }) => (
                <button
                  key={label}
                  type="button"
                  onClick={async () => { await ensurePublic(); fn(publicUrl, track.title); }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border border-white/8 hover:border-white/20 hover:bg-white/5 transition-all active:scale-95 focus:outline-none"
                  style={{ color }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Private invite */}
          <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Private Invite
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                aria-label="Invite email"
                className="flex-1 min-w-0 px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-rose-400"
              />
              <button
                type="button"
                onClick={handlePrivateShare}
                disabled={saving}
                className="px-4 py-2.5 border border-white/12 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 flex-shrink-0 hover:bg-white/5 transition-all"
                style={{ background: 'rgba(255,255,255,0.055)' }}
              >
                <Send className="h-4 w-4" />
                Invite
              </button>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Optional message"
              aria-label="Share message"
              rows={2}
              className="mt-2 w-full px-3 py-2.5 text-sm rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder:text-white/25 resize-none focus:outline-none focus:ring-1 focus:ring-rose-400"
            />
          </div>

          {/* Share history */}
          {shares.length > 0 && (
            <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-extrabold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Share History
              </p>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                {shares.map((share, idx) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                    style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : undefined }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm truncate">{share.shared_with_email || 'Public link'}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{share.status}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveShare(share.id)}
                      aria-label="Remove share"
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                    >
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