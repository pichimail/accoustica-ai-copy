import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Video, Loader2, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAppSettings } from '@/lib/use-app-settings';

export default function VideoGeneratorDialog({ track, open, onClose }) {
  const [author, setAuthor] = useState('');
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const { settings } = useAppSettings();

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);

    try {
      const response = await base44.functions.invoke('generateLyricVideo', {
        taskId: track.task_id,
        audioId: track.external_audio_id,
        author: author || 'Accoustica',
        domainName: 'accoustica.app',
      });

      if (response.data?.success) {
        toast.success('Lyric video generation started!');
        pollVideoStatus(response.data.taskId);
      } else {
        toast.error(response.data?.error || 'Failed to start lyric video');
        setGenerating(false);
      }
    } catch (error) {
      toast.error('Failed to generate lyric video');
      setGenerating(false);
    }
  };

  const pollVideoStatus = async (videoTaskId) => {
    const maxAttempts = 120;
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        setProgress(Math.min(95, (attempts / maxAttempts) * 100));

        const videoRecords = await base44.entities.VideoGeneration.filter({ task_id: videoTaskId });
        if (videoRecords.length > 0) {
          const videoRecord = videoRecords[0];

          if (videoRecord.status === 'ready' && videoRecord.video_url) {
            setVideoUrl(videoRecord.video_url);
            setProgress(100);
            setGenerating(false);
            toast.success('Lyric video ready! Find it in your profile.');
            return;
          }

          if (videoRecord.status === 'failed') {
            toast.error(videoRecord.error_message || 'Lyric video generation failed');
            setGenerating(false);
            return;
          }
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          toast.error('Lyric video generation timeout. Check your profile later.');
          setGenerating(false);
        }
      } catch (error) {
        console.error('Lyric video polling error:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setGenerating(false);
        }
      }
    };

    poll();
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${track.title}-lyric-video.mp4`;
    a.click();
  };

  const handleShare = () => {
    if (!videoUrl) return;
    navigator.clipboard.writeText(videoUrl);
    toast.success('Video URL copied!');
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Video className="h-5 w-5 text-pink-400" />
            Lyric Video for {track.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!videoUrl ? (
            <>
              <div className="glass-surface rounded-2xl p-4 text-sm text-slate-300">
                Generates a lyric video synced to your track. Uses 2 credits.
              </div>

              <div>
                <Label className="text-slate-300">Artist Credit (Optional)</Label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Artist name for credits"
                />
              </div>

              <div className="text-xs text-slate-400">
                Watermark: {settings.watermark_text || 'Accoustica'} logo is applied automatically.
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Lyric Video...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Generate Lyric Video
                  </>
                )}
              </Button>

              {generating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-surface rounded-2xl p-6 text-center space-y-3"
                >
                  <Loader2 className="h-8 w-8 text-pink-400 animate-spin mx-auto" />
                  <div className="space-y-2">
                    <p className="text-white font-medium">Processing your lyric video…</p>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-pink-500 to-orange-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="glass-surface rounded-2xl overflow-hidden">
                <video src={videoUrl} controls className="w-full" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleDownload} className="bg-emerald-500 hover:bg-emerald-600">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
