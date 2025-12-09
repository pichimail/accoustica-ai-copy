import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Loader2, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function MusicVideoGenerator({ track, open, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [taskId, setTaskId] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the video you want to create');
      return;
    }

    setGenerating(true);
    setVideoUrl(null);

    try {
      const response = await base44.functions.invoke('createMusicVideo', {
        taskId: track.task_id,
        audioId: track.external_audio_id,
      });

      if (response.data.success) {
        const newTaskId = response.data.taskId;
        setTaskId(newTaskId);
        toast.success('Video generation started!');
        
        // Poll for completion
        pollVideoStatus(newTaskId);
      } else {
        toast.error(response.data.error || 'Failed to generate video');
        setGenerating(false);
      }
    } catch (error) {
      toast.error('Failed to generate video: ' + error.message);
      setGenerating(false);
    }
  };

  const pollVideoStatus = async (id) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        
        const statusResponse = await base44.functions.invoke('checkMusicStatus', {
          taskId: id,
        });

        if (statusResponse.data.success) {
          const status = statusResponse.data.status;
          
          if (status === 'SUCCESS' && statusResponse.data.tracks?.[0]?.video_url) {
            setVideoUrl(statusResponse.data.tracks[0].video_url);
            setGenerating(false);
            toast.success('Video generated successfully!');
            return;
          } else if (status === 'FAILED') {
            toast.error('Video generation failed');
            setGenerating(false);
            return;
          }
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          toast.error('Video generation timeout');
          setGenerating(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setGenerating(false);
      }
    };

    poll();
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Video className="h-5 w-5 text-violet-400" />
            Generate Music Video: {track.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!videoUrl ? (
            <>
              <div>
                <Label className="text-slate-300">Video Description</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the visual style, mood, and imagery you want in the music video..."
                  className="bg-slate-800 border-slate-700 text-white h-32"
                  disabled={generating}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Be specific about colors, themes, movements, and visual effects
                </p>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Video...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Generate Music Video
                  </>
                )}
              </Button>

              {generating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-slate-800/50 rounded-lg p-4 text-center"
                >
                  <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto mb-2" />
                  <p className="text-white text-sm">Creating your music video...</p>
                  <p className="text-slate-400 text-xs mt-1">This may take a few minutes</p>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                <video
                  src={videoUrl}
                  controls
                  className="w-full"
                  poster={track.cover_image_url}
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => window.open(videoUrl, '_blank')}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = videoUrl;
                    a.download = `${track.title}-video.mp4`;
                    a.click();
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>

              <Button
                onClick={() => {
                  setVideoUrl(null);
                  setPrompt('');
                  setGenerating(false);
                }}
                variant="outline"
                className="w-full"
              >
                Generate Another Video
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}