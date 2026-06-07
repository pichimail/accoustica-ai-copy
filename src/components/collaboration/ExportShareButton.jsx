// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { Share2, Loader2 } from 'lucide-react';
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
      <button
        type="button"
        onClick={handleClick}
        disabled={!ready || busy}
        aria-label="Export and share track"
        className={cn(
          'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-rose-400/50',
          className
        )}
        style={{ background: '#e11d48', color: '#fff' }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!ready || busy}
      aria-label="Export and share track"
      title="Export & Share"
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-full text-white/45 hover:text-white hover:bg-white/8 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed',
        className
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}