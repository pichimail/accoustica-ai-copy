import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Video, Loader2, Download, Share2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const visualStyles = [
  { id: 'cinematic', name: 'Cinematic', desc: 'Movie-quality visuals' },
  { id: 'abstract', name: 'Abstract', desc: 'Artistic patterns' },
  { id: 'nature', name: 'Nature', desc: 'Landscapes' },
  { id: 'urban', name: 'Urban', desc: 'City scenes' },
  { id: 'cosmic', name: 'Cosmic', desc: 'Space themes' },
  { id: 'retro', name: 'Retro', desc: 'Vintage 80s/90s' },
  { id: 'psychedelic', name: 'Psychedelic', desc: 'Trippy colors' },
  { id: 'minimalist', name: 'Minimalist', desc: 'Clean & simple' },
];

const effects = ['Particles', 'Glow', 'Vignette', 'Color Grade', 'Motion Blur', 'Film Grain'];

export default function VideoGeneratorDialog({ track, open, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [videoLength, setVideoLength] = useState([30]);
  const [selectedEffects, setSelectedEffects] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);

  const toggleEffect = (effect) => {
    setSelectedEffects(prev =>
      prev.includes(effect) ? prev.filter(e => e !== effect) : [...prev, effect]
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the video you want');
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      const response = await base44.functions.invoke('generateMusicVideoWithLyrics', {
        taskId: track.task_id,
        audioId: track.external_audio_id,
        author: 'Accoustica',
        domainName: 'accoustica.app',
        prompt: prompt,
        visualStyle: selectedStyle,
        aspectRatio: aspectRatio,
        effects: selectedEffects,
      });

      if (response.data.success) {
        toast.success('Video generation started!');
        pollVideoStatus(response.data.taskId);
      } else {
        toast.error(response.data.error || 'Failed to start generation');
        setGenerating(false);
      }
    } catch (error) {
      toast.error('Failed to generate video');
      setGenerating(false);
    }
  };

  const pollVideoStatus = async (taskId) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        setProgress(Math.min(95, (attempts / maxAttempts) * 100));

        const statusResponse = await base44.functions.invoke('checkMusicVideoStatus', { taskId });

        if (statusResponse.data.success) {
          const status = statusResponse.data.status;

          if (status === 'SUCCESS' && statusResponse.data.videoUrl) {
            setVideoUrl(statusResponse.data.videoUrl);
            setProgress(100);
            setGenerating(false);
            toast.success('Video ready!');
            return;
          } else if (status?.includes('FAILED')) {
            toast.error('Video generation failed');
            setGenerating(false);
            return;
          }
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          toast.error('Generation timeout');
          setGenerating(false);
        }
      } catch (error) {
        setGenerating(false);
      }
    };

    poll();
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `${track.title}-video.mp4`;
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
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Video className="h-5 w-5 text-violet-400" />
            Generate Music Video: {track.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!videoUrl ? (
            <>
              {/* Scene Description */}
              <div>
                <Label className="text-slate-300 mb-2 block">Video Description</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe scenes, visual style, camera movements, atmosphere..."
                  className="bg-slate-800 border-slate-700 text-white h-24"
                  disabled={generating}
                />
              </div>

              {/* Visual Style */}
              <div>
                <Label className="text-slate-300 mb-3 block">Visual Style</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {visualStyles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedStyle === style.id
                          ? 'bg-violet-500/20 border-violet-500/50 text-white'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <p className="font-medium text-sm">{style.name}</p>
                      <p className="text-xs opacity-70">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio & Length */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 mb-2 block">Aspect Ratio</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['16:9', '9:16', '1:1', '4:3'].map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAspectRatio(ratio)}
                        className={`py-2 rounded-lg text-sm transition-all ${
                          aspectRatio === ratio
                            ? 'bg-violet-500/20 border border-violet-500/50 text-white'
                            : 'bg-slate-800 border border-slate-700 text-slate-400'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 mb-2 block">Length: {videoLength[0]}s</Label>
                  <Slider
                    value={videoLength}
                    onValueChange={setVideoLength}
                    min={15}
                    max={120}
                    step={5}
                    className="mt-3"
                  />
                </div>
              </div>

              {/* Effects */}
              <div>
                <Label className="text-slate-300 mb-2 block">Effects</Label>
                <div className="flex flex-wrap gap-2">
                  {effects.map((effect) => (
                    <button
                      key={effect}
                      type="button"
                      onClick={() => toggleEffect(effect)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                        selectedEffects.includes(effect)
                          ? 'bg-pink-500/20 border border-pink-500/50 text-pink-300'
                          : 'bg-slate-800 border border-slate-700 text-slate-400'
                      }`}
                    >
                      {effect}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress */}
              {generating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-slate-800/50 rounded-xl p-6 text-center"
                >
                  <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto mb-3" />
                  <p className="text-white font-medium mb-2">Generating video...</p>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{Math.round(progress)}%</p>
                </motion.div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Generate Video
                  </>
                )}
              </Button>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="bg-slate-800/50 rounded-xl overflow-hidden">
                <video src={videoUrl} controls className="w-full" poster={track.cover_image_url}>
                  Your browser does not support video.
                </video>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={handleShare} variant="outline" className="border-slate-700">
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