// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { Share2, Loader2, Instagram } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';

/**
 * One-click Export & Share button for a finished track.
 * - Pulls the track's audio (and cover image when possible).
 * - Opens the native OS share sheet with the actual files, so the user can post
 *   directly to WhatsApp / Instagram / etc. or save to local storage.
 * - Falls back to downloading the files locally when file-sharing isn't supported.
 */
export default function ExportShareButton({
  track,
  className,
  variant = 'icon', // 'icon' | 'pill'
  label = 'Export',
}) {
  const [busy, setBusy] = useState(false);

  const audioUrl = track?.audio_url || track?.stream_audio_url || '';
  const coverUrl = track?.cover_image_url || '';
  const ready = track?.status ? track.status === 'ready' : !!audioUrl;
  const slug = (track?.title || 'track')
    .replace(/[^a-z0-9\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50) || 'track';

  const fetchAsFile = useCallback(async (url, filename, fallbackType) => {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch-failed');
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || fallbackType });
  }, []);

  const downloadLocally = useCallback((url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleInstagramShare = useCallback(async (e) => {
    e?.stopPropagation?.();
    if (busy) return;
    if (!coverUrl) { toast.error('No cover art available to share to Instagram'); return; }
    haptics.medium();
    setBusy(true);

    const caption = `🎵 "${track?.title || 'My track'}" — made with Accoustica AI`;
    try {
      // Instagram only accepts images/videos, not audio — share the cover art as a file
      let imageFile = null;
      try {
        imageFile = await fetchAsFile(coverUrl, `${slug}.jpg`, 'image/jpeg');
      } catch { /* fetch blocked — fall through to URL approach */ }

      // 1) Best: native share with the cover image file — Instagram appears in the sheet on mobile
      if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        try {
          await navigator.share({ text: caption, files: [imageFile] });
          haptics.success();
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
        }
      }

      // 2) Try opening the Instagram app directly (mobile)
      const igAppUrl = `instagram://app`;
      const igWebUrl = `https://www.instagram.com/`;
      try {
        window.open(igAppUrl, '_blank');
        setTimeout(() => {
          downloadLocally(coverUrl, `${slug}.jpg`);
          toast.success('Cover art saved — paste it into Instagram!');
        }, 1500);
      } catch {
        window.open(igWebUrl, '_blank');
        downloadLocally(coverUrl, `${slug}.jpg`);
        toast.success('Cover art saved — upload it to Instagram!');
      }
      haptics.success();
    } catch (err) {
      haptics.error();
      toast.error('Could not share to Instagram');
    } finally {
      setBusy(false);
    }
  }, [coverUrl, slug, track, busy, fetchAsFile, downloadLocally]);

  const handleClick = useCallback(async (e) => {
    e?.stopPropagation?.();
    if (busy) return;
    if (!audioUrl) { toast.error('This track has no audio to export yet'); return; }
    haptics.medium();
    setBusy(true);

    try {
      // Try to build real files for the native share sheet
      const files = [];
      try {
        files.push(await fetchAsFile(audioUrl, `${slug}.mp3`, 'audio/mpeg'));
        if (coverUrl) {
          try { files.push(await fetchAsFile(coverUrl, `${slug}.jpg`, 'image/jpeg')); } catch { /* cover optional */ }
        }
      } catch { /* file fetch blocked — fall through to URL/local */ }

      const shareData = {
        title: track?.title || 'My track',
        text: `🎵 "${track?.title || 'My track'}" — made with Accoustica AI`,
      };

      // 1) Best: native share with the actual audio + cover files
      if (files.length && navigator.canShare && navigator.canShare({ files })) {
        try {
          await navigator.share({ ...shareData, files });
          haptics.success();
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return; // user cancelled
          // fall through to other options
        }
      }

      // 2) Native share without files (shares text only) — only if no files succeeded
      if (!files.length && navigator.share) {
        try {
          await navigator.share(shareData);
          haptics.success();
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
        }
      }

      // 3) Fallback: download to local storage
      downloadLocally(audioUrl, `${slug}.mp3`);
      if (coverUrl) downloadLocally(coverUrl, `${slug}.jpg`);
      toast.success('Saved to your device');
      haptics.success();
    } catch (err) {
      haptics.error();
      toast.error('Could not export this track');
    } finally {
      setBusy(false);
    }
  }, [audioUrl, coverUrl, slug, track, busy, fetchAsFile, downloadLocally]);

  if (variant === 'pill') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <button
          type="button"
          onClick={handleClick}
          disabled={!ready || busy}
          aria-label="Export and share track"
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-rose-400/50"
          style={{ background: '#e11d48', color: '#fff' }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          {label}
        </button>
        {coverUrl && (
          <button
            type="button"
            onClick={handleInstagramShare}
            disabled={!ready || busy}
            aria-label="Share cover art to Instagram"
            title="Share to Instagram"
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-pink-400/50"
            style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff' }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!ready || busy}
        aria-label="Export and share track"
        title="Export & Share"
        className="w-8 h-8 flex items-center justify-center rounded-full text-white/45 hover:text-white hover:bg-white/8 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
      </button>
      {coverUrl && (
        <button
          type="button"
          onClick={handleInstagramShare}
          disabled={!ready || busy}
          aria-label="Share cover art to Instagram"
          title="Share to Instagram"
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: '#dc2743' }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}