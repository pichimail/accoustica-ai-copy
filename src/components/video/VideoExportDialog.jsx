// @ts-nocheck
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Download, Film, Smartphone, Monitor, Share2, Youtube, Instagram, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/exportClient';
import { cn } from '@/lib/utils';

const PLATFORMS = [
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: '#FF0000', aspect: '16:9' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C', aspect: '9:16' },
  { id: 'tiktok', label: 'TikTok', icon: Film, color: '#69C9D0', aspect: '9:16' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2', aspect: '16:9' },
  { id: 'whatsapp', label: 'WhatsApp', icon: Share2, color: '#25D366', aspect: '9:16' },
];

export default function VideoExportDialog({ track, open, onClose }) {
  const [aspect, setAspect] = useState('16:9');
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [progress, setProgress] = useState(0);

  if (!track) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);
    setVideoUrl(null);

    // Simulate progress while generating
    const progressTimer = setInterval(() => {
      setProgress(prev => Math.min(prev + 8, 85));
    }, 800);

    try {
      const response = await base44.functions.invoke('createMusicVideo', {
        trackId: track.id,
        audioUrl: track.audio_url || track.stream_audio_url,
        title: track.title,
        style: track.style || 'AI Generated',
        coverImageUrl: track.cover_image_url || '',
        aspectRatio: aspect,
        addWaveform: true,
        lyrics: track.lyrics || '',
      });

      clearInterval(progressTimer);
      setProgress(100);

      if (response?.data?.video_url) {
        setVideoUrl(response.data.video_url);
        toast.success('Video ready!');
      } else if (response?.data?.taskId) {
        toast.success('Video generating — check Video Studio for download');
        onClose();
      } else {
        toast.error('Video generation started — check Video Studio');
        onClose();
      }
    } catch (err) {
      clearInterval(progressTimer);
      toast.error(err.message || 'Failed to generate video');
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async (platform) => {
    const shareUrl = videoUrl || `${window.location.origin}/PublicTrack?id=${track.id}`;
    const text = `🎵 Listen to "${track.title}" — created with Accoustica AI`;

    const urls = {
      youtube: `https://studio.youtube.com/`,
      instagram: `https://www.instagram.com/`,
      tiktok: `https://www.tiktok.com/upload`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`,
      whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + shareUrl)}`,
    };

    if (platform === 'facebook' || platform === 'whatsapp') {
      window.open(urls[platform], '_blank');
    } else if (videoUrl) {
      // Download video then prompt user to upload
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `${track.title.replace(/[^a-z0-9]/gi, '_')}_${aspect.replace(':', 'x')}.mp4`;
      a.click();
      toast.info(`Download started — upload to ${PLATFORMS.find(p => p.id === platform)?.label}`);
      window.open(urls[platform], '_blank');
    } else {
      if (navigator.share) {
        await navigator.share({ title: track.title, text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied!');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-white/10 bg-[#09090f] text-white shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/08">
          <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
            <Film className="h-5 w-5 text-violet-400" />
            Export as Video
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          {/* Track info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {track.cover_image_url
                ? <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
                : <Film className="h-5 w-5 text-white/20 m-auto mt-3" />}
            </div>
            <div>
              <p className="font-bold text-sm text-white">{track.title}</p>
              <p className="text-xs text-white/40">{track.style || 'AI Generated'}</p>
            </div>
          </div>

          {/* Aspect ratio */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 mb-2">Format</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAspect('16:9')}
                className={cn('flex flex-col items-center gap-2 py-3.5 rounded-2xl border transition-all', aspect === '16:9' ? 'border-violet-500/60 text-violet-300' : 'border-white/10 text-white/50 hover:border-white/20')}
                style={aspect === '16:9' ? { background: 'rgba(139,92,246,0.12)' } : { background: 'rgba(255,255,255,0.04)' }}
              >
                <Monitor className="h-6 w-8" />
                <span className="text-xs font-bold">Landscape 16:9</span>
                <span className="text-[10px] text-white/30">YouTube, Facebook</span>
              </button>
              <button
                onClick={() => setAspect('9:16')}
                className={cn('flex flex-col items-center gap-2 py-3.5 rounded-2xl border transition-all', aspect === '9:16' ? 'border-violet-500/60 text-violet-300' : 'border-white/10 text-white/50 hover:border-white/20')}
                style={aspect === '9:16' ? { background: 'rgba(139,92,246,0.12)' } : { background: 'rgba(255,255,255,0.04)' }}
              >
                <Smartphone className="h-6 w-4" />
                <span className="text-xs font-bold">Portrait 9:16</span>
                <span className="text-[10px] text-white/30">TikTok, Reels, Shorts</span>
              </button>
            </div>
          </div>

          {/* Generate button / progress */}
          {!videoUrl ? (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ background: generating ? 'rgba(139,92,246,0.2)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', boxShadow: generating ? 'none' : '0 0 20px rgba(124,58,237,0.4)' }}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating… {progress}%</span>
                </>
              ) : (
                <>
                  <Film className="h-4 w-4" />
                  Generate Video
                </>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <a
                  href={videoUrl}
                  download={`${track.title.replace(/[^a-z0-9]/gi, '_')}.mp4`}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}
                >
                  <Download className="h-4 w-4" />
                  Download MP4
                </a>
                <button
                  onClick={handleGenerate}
                  className="px-4 rounded-2xl border border-white/10 text-white/50 text-xs hover:text-white transition-colors"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}

          {/* Share to platforms */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 mb-2">Share to Platform</p>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => handleShare(id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-white/70 hover:text-white transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}