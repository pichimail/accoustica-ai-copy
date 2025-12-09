import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Film, Sparkles, Mountain, Building2, Disc, Play, Download, Share2, RotateCw, Loader2, Zap, Palette, Square, Plus, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const visualStyles = [
  { name: 'Cinematic', icon: Film, description: 'Movie-like quality', tag: 'dramatic lighting, depth of field' },
  { name: 'Abstract', icon: Sparkles, description: 'Artistic visuals', tag: 'surreal, flowing shapes' },
  { name: 'Nature', icon: Mountain, description: 'Natural landscapes', tag: 'organic, peaceful' },
  { name: 'Urban', icon: Building2, description: 'City scenes', tag: 'modern, architectural' },
  { name: 'Retro', icon: Disc, description: 'Vintage aesthetics', tag: 'nostalgic, grainy' },
  { name: 'Sci-Fi', icon: Zap, description: 'Futuristic tech', tag: 'neon, cyberpunk' },
  { name: 'Anime', icon: Palette, description: 'Japanese animation', tag: 'vibrant, stylized' },
  { name: 'Minimalist', icon: Square, description: 'Clean, simple', tag: 'geometric, modern' },
];

const videoEffects = [
  { id: 'glitch', name: 'Glitch', description: 'Digital distortion' },
  { id: 'vhs', name: 'VHS', description: 'Retro tape effect' },
  { id: 'bloom', name: 'Bloom', description: 'Soft glow' },
  { id: 'chromatic', name: 'Chromatic', description: 'Color split' },
  { id: 'particles', name: 'Particles', description: 'Floating elements' },
  { id: 'kaleidoscope', name: 'Kaleidoscope', description: 'Mirror patterns' },
];

const aspectRatios = [
  { value: '16:9', label: '16:9', description: 'Landscape' },
  { value: '9:16', label: '9:16', description: 'Portrait' },
  { value: '1:1', label: '1:1', description: 'Square' },
  { value: '21:9', label: '21:9', description: 'Ultrawide' },
];

export default function MusicVideoGenerator({ track, open, onOpenChange }) {
  const [description, setDescription] = useState('');
  const [visualStyle, setVisualStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [videoLength, setVideoLength] = useState('full');
  const [effects, setEffects] = useState([]);
  const [scenePrompts, setScenePrompts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentScene, setCurrentScene] = useState(0);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Please describe your video vision');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setVideoUrl(null);

    try {
      const response = await base44.functions.invoke('generateMusicVideoWithLyrics', {
        taskId: track.task_id,
        audioId: track.external_audio_id,
        author: 'Accoustica',
        domainName: 'accoustica.app',
        description,
        visualStyle,
        aspectRatio,
        videoLength,
        effects,
        scenePrompts,
      });

      if (response.data.success) {
        pollVideoStatus(response.data.taskId);
      } else {
        toast.error(response.data.error || 'Failed to start generation');
        setIsGenerating(false);
      }
    } catch (error) {
      toast.error('Generation failed: ' + error.message);
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = async (taskId) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      attempts++;
      setProgress(Math.min(95, (attempts / maxAttempts) * 100));

      try {
        const statusResponse = await base44.functions.invoke('checkMusicVideoStatus', {
          taskId,
        });

        if (statusResponse.data.success) {
          const status = statusResponse.data.status;
          
          if (status === 'SUCCESS' && statusResponse.data.videoUrl) {
            setVideoUrl(statusResponse.data.videoUrl);
            setProgress(100);
            setIsGenerating(false);
            toast.success('Video generated successfully!');
            return;
          } else if (status && status.includes('FAILED')) {
            toast.error('Video generation failed');
            setIsGenerating(false);
            return;
          }
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          toast.error('Video generation timeout');
          setIsGenerating(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setIsGenerating(false);
      }
    };

    poll();
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Film className="h-5 w-5 text-violet-400" />
            AI Video Studio: {track.title}
          </DialogTitle>
        </DialogHeader>

        {!videoUrl ? (
          <div className="space-y-6 mb-6">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">Video Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A journey through neon-lit cityscapes at night, transitioning to peaceful sunrise over mountains..."
                className="min-h-[100px] bg-slate-800/50 border-slate-700"
                disabled={isGenerating}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Aspect Ratio</label>
                <div className="grid grid-cols-2 gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.value}
                      onClick={() => setAspectRatio(ratio.value)}
                      disabled={isGenerating}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-center",
                        aspectRatio === ratio.value
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                      )}
                    >
                      <div className="font-medium text-white text-sm">{ratio.label}</div>
                      <div className="text-xs text-slate-500">{ratio.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">Video Length</label>
                <div className="space-y-2">
                  {['full', '30sec', '60sec'].map((length) => (
                    <button
                      key={length}
                      onClick={() => setVideoLength(length)}
                      disabled={isGenerating}
                      className={cn(
                        "w-full p-2 rounded-lg border-2 transition-all text-sm",
                        videoLength === length
                          ? "border-violet-500 bg-violet-500/10 text-white"
                          : "border-slate-700 bg-slate-800/30 hover:border-slate-600 text-slate-400"
                      )}
                    >
                      {length === 'full' ? 'Full Song' : length}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-3 block">Visual Style</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {visualStyles.map((style) => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.name}
                      onClick={() => setVisualStyle(style.name.toLowerCase())}
                      disabled={isGenerating}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-left",
                        visualStyle === style.name.toLowerCase()
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                      )}
                    >
                      <Icon className="h-5 w-5 text-violet-400 mb-2" />
                      <div className="font-medium text-white text-xs">{style.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{style.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-3 block">Visual Effects (Optional)</label>
              <div className="grid grid-cols-3 gap-2">
                {videoEffects.map((effect) => (
                  <button
                    key={effect.id}
                    onClick={() => {
                      if (effects.includes(effect.id)) {
                        setEffects(effects.filter(e => e !== effect.id));
                      } else {
                        setEffects([...effects, effect.id]);
                      }
                    }}
                    disabled={isGenerating}
                    className={cn(
                      "p-2 rounded-lg border transition-all text-xs",
                      effects.includes(effect.id)
                        ? "border-pink-500 bg-pink-500/10 text-white"
                        : "border-slate-700 bg-slate-800/30 hover:border-slate-600 text-slate-400"
                    )}
                  >
                    <div className="font-medium">{effect.name}</div>
                    <div className="text-xs opacity-70">{effect.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-white">Scene Prompts (Optional)</label>
                <button
                  onClick={() => setScenePrompts([...scenePrompts, ''])}
                  disabled={isGenerating}
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Scene
                </button>
              </div>
              {scenePrompts.length > 0 && (
                <div className="space-y-2">
                  {scenePrompts.map((prompt, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={prompt}
                        onChange={(e) => {
                          const newPrompts = [...scenePrompts];
                          newPrompts[index] = e.target.value;
                          setScenePrompts(newPrompts);
                        }}
                        placeholder={`Scene ${index + 1} description...`}
                        className="bg-slate-800/50 border-slate-700 text-sm"
                        disabled={isGenerating}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setScenePrompts(scenePrompts.filter((_, i) => i !== index))}
                        disabled={isGenerating}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">Generating video...</span>
                  <span className="text-sm text-violet-400">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
                  />
                </div>
              </motion.div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !description.trim()}
              className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Film className="h-4 w-4 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <video src={videoUrl} controls className="w-full rounded-lg" />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = videoUrl;
                  a.download = `${track.title}-video.mp4`;
                  a.click();
                }}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(videoUrl);
                  toast.success('Link copied!');
                }}
                variant="outline"
                className="flex-1"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}