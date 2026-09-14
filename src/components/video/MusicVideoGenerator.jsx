// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Video, Loader2, Download, ExternalLink, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function MusicVideoGenerator({ track, open, onClose, onSuccess }) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [visualStyle, setVisualStyle] = useState('cinematic');
  const [effects, setEffects] = useState([]);
  const [author, setAuthor] = useState('');
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [progress, setProgress] = useState(0);

  const visualStyles = {
    cinematic: 'Cinematic - Movie-quality visuals',
    abstract: 'Abstract - Artistic patterns and shapes',
    nature: 'Nature - Landscapes and natural scenes',
    urban: 'Urban - City and street scenes',
    cosmic: 'Cosmic - Space and galaxy themes',
    retro: 'Retro - Vintage 80s/90s aesthetics',
    minimalist: 'Minimalist - Clean and simple',
    psychedelic: 'Psychedelic - Trippy and colorful',
  };

  const availableEffects = [
    { id: 'particles', name: 'Particle Effects' },
    { id: 'glow', name: 'Glow & Bloom' },
    { id: 'vignette', name: 'Vignette' },
    { id: 'colorGrade', name: 'Color Grading' },
    { id: 'motionBlur', name: 'Motion Blur' },
    { id: 'filmGrain', name: 'Film Grain' },
  ];

  const toggleEffect = (effectId) => {
    setEffects(prev => 
      prev.includes(effectId) 
        ? prev.filter(e => e !== effectId)
        : [...prev, effectId]
    );
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the video you want to create');
      return;
    }

    setGenerating(true);
    setVideoUrl(null);
    setProgress(0);

    try {
      const response = await base44.functions.invoke('generateMusicVideoWithLyrics', {
        taskId: track.task_id,
        audioId: track.external_audio_id,
        author: author || 'Accoustica',
        domainName: 'accoustica.app',
        prompt: prompt,
        visualStyle: visualStyle,
        aspectRatio: aspectRatio,
        effects: effects,
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
        setProgress(Math.min(95, (attempts / maxAttempts) * 100));
        
        // Every 10 attempts (20 seconds), directly check API status as fallback
        if (attempts % 10 === 0) {
          try {
            const statusCheck = await base44.functions.invoke('checkVideoStatus', { taskId: id });
            if (statusCheck.data.success && statusCheck.data.status === 'ready') {
              setVideoUrl(statusCheck.data.video_url);
              setProgress(100);
              setGenerating(false);
              toast.success('Video generated successfully!');
              if (onSuccess) onSuccess();
              return;
            } else if (statusCheck.data.status === 'failed') {
              toast.error(statusCheck.data.error || 'Video generation failed');
              setGenerating(false);
              return;
            }
          } catch (error) {
            console.error('Direct status check failed:', error);
          }
        }
        
        // Query the VideoGeneration entity directly
        const videos = await base44.entities.VideoGeneration.filter({ task_id: id });
        
        if (videos.length > 0) {
          const video = videos[0];
          
          if (video.status === 'ready' && video.video_url) {
            setVideoUrl(video.video_url);
            setProgress(100);
            setGenerating(false);
            toast.success('Video generated successfully!');
            if (onSuccess) onSuccess();
            return;
          } else if (video.status === 'failed') {
            toast.error(video.error_message || 'Video generation failed');
            setGenerating(false);
            return;
          }
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds for faster response
        } else {
          toast.error('Video generation timeout - check back later');
          setGenerating(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          setGenerating(false);
        }
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
              {/* Video Description */}
              <div>
                <Label className="text-slate-300">Scene & Visual Description</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe specific scenes, visual style, colors, camera movements, and atmosphere you want... e.g., 'Start with a sunrise over mountains, transition to abstract geometric patterns pulsing with the beat, end with starry night sky'"
                  className="bg-slate-800 border-slate-700 text-white h-32"
                  disabled={generating}
                />
                <p className="text-xs text-slate-500 mt-1">
                  More detailed descriptions produce better results
                </p>
              </div>

              {/* Visual Style Selection */}
              <div>
                <Label className="text-slate-300 mb-2 block">Visual Style</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(visualStyles).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setVisualStyle(key)}
                      disabled={generating}
                      className={`p-2 rounded-lg border text-left text-sm transition-all ${
                        visualStyle === key
                          ? 'bg-violet-500/20 border-violet-500/50 text-white'
                          : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div>
                <Label className="text-slate-300 mb-2 block">Aspect Ratio</Label>
                <div className="flex gap-2">
                  {['16:9', '9:16', '1:1', '4:3'].map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      disabled={generating}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                        aspectRatio === ratio
                          ? 'bg-violet-500/20 border-violet-500/50 text-white'
                          : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {aspectRatio === '16:9' && 'Standard widescreen (YouTube, Desktop)'}
                  {aspectRatio === '9:16' && 'Vertical (TikTok, Instagram Stories)'}
                  {aspectRatio === '1:1' && 'Square (Instagram Feed)'}
                  {aspectRatio === '4:3' && 'Classic (Traditional TV)'}
                </p>
              </div>

              {/* Visual Effects */}
              <div>
                <Label className="text-slate-300 mb-2 block">Visual Effects (Optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableEffects.map((effect) => (
                    <button
                      key={effect.id}
                      type="button"
                      onClick={() => toggleEffect(effect.id)}
                      disabled={generating}
                      className={`p-2 rounded-lg border text-xs transition-all ${
                        effects.includes(effect.id)
                          ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {effect.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Author Credit */}
              <div>
                <Label className="text-slate-300">Artist Credit (Optional)</Label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your artist name..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                  disabled={generating}
                  maxLength={50}
                />
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

              {/* Progress Visualization */}
              {generating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-slate-800/50 rounded-lg p-6 text-center space-y-4"
                >
                  <Loader2 className="h-10 w-10 text-violet-400 animate-spin mx-auto" />
                  <div className="space-y-2">
                    <p className="text-white font-medium">Creating your music video...</p>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-slate-400 text-xs">
                      {progress < 30 && 'Analyzing audio and generating scenes...'}
                      {progress >= 30 && progress < 60 && 'Rendering visual effects...'}
                      {progress >= 60 && progress < 90 && 'Synchronizing with audio...'}
                      {progress >= 90 && 'Finalizing video...'}
                    </p>
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

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(videoUrl);
                    toast.success('Video URL copied to clipboard');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Link
                </Button>
                <Button
                  onClick={() => {
                    setVideoUrl(null);
                    setPrompt('');
                    setProgress(0);
                    setGenerating(false);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Generate Another
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}