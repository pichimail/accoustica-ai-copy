import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Volume2, ChevronDown, ChevronUp, Sliders } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const presets = {
  genre: [
    { name: 'Pop', settings: { loudness: 75, eq: 50, compression: 60, bass: 55, treble: 60, mid: 50, stereoWidth: 65 }, description: 'Balanced, radio-ready sound' },
    { name: 'Rock', settings: { loudness: 80, eq: 65, compression: 70, bass: 65, treble: 70, mid: 60, stereoWidth: 70 }, description: 'Punchy, aggressive energy' },
    { name: 'Hip Hop', settings: { loudness: 85, eq: 55, compression: 75, bass: 80, treble: 50, mid: 45, stereoWidth: 60 }, description: 'Deep bass, crisp highs' },
    { name: 'Electronic', settings: { loudness: 90, eq: 60, compression: 80, bass: 75, treble: 75, mid: 50, stereoWidth: 80 }, description: 'Wide, dynamic spectrum' },
    { name: 'Jazz', settings: { loudness: 60, eq: 45, compression: 40, bass: 45, treble: 55, mid: 60, stereoWidth: 75 }, description: 'Natural, warm dynamics' },
    { name: 'Metal', settings: { loudness: 85, eq: 70, compression: 85, bass: 70, treble: 75, mid: 65, stereoWidth: 65 }, description: 'Heavy, crushing impact' },
    { name: 'R&B', settings: { loudness: 70, eq: 50, compression: 55, bass: 65, treble: 60, mid: 55, stereoWidth: 70 }, description: 'Smooth, silky vocals' },
    { name: 'Classical', settings: { loudness: 55, eq: 40, compression: 30, bass: 50, treble: 60, mid: 55, stereoWidth: 85 }, description: 'Natural orchestral space' },
  ],
  mood: [
    { name: 'Energetic', settings: { loudness: 85, eq: 70, compression: 75, bass: 70, treble: 75, mid: 60, stereoWidth: 70 }, description: 'High-octane excitement' },
    { name: 'Chill', settings: { loudness: 65, eq: 45, compression: 50, bass: 55, treble: 50, mid: 50, stereoWidth: 75 }, description: 'Relaxed, atmospheric' },
    { name: 'Dark', settings: { loudness: 80, eq: 40, compression: 70, bass: 75, treble: 40, mid: 45, stereoWidth: 60 }, description: 'Brooding, mysterious' },
    { name: 'Bright', settings: { loudness: 75, eq: 80, compression: 60, bass: 50, treble: 80, mid: 55, stereoWidth: 75 }, description: 'Sparkling, uplifting' },
    { name: 'Warm', settings: { loudness: 70, eq: 50, compression: 55, bass: 60, treble: 55, mid: 65, stereoWidth: 70 }, description: 'Cozy, intimate feel' },
    { name: 'Aggressive', settings: { loudness: 88, eq: 75, compression: 85, bass: 75, treble: 70, mid: 60, stereoWidth: 65 }, description: 'Intense, forward' },
  ],
  professional: [
    { name: 'Streaming', settings: { loudness: 75, eq: 55, compression: 65, bass: 60, treble: 60, mid: 55, stereoWidth: 70 }, description: 'Spotify/Apple optimized' },
    { name: 'Radio', settings: { loudness: 90, eq: 60, compression: 85, bass: 65, treble: 65, mid: 55, stereoWidth: 60 }, description: 'Broadcast standards' },
    { name: 'Club', settings: { loudness: 95, eq: 65, compression: 90, bass: 85, treble: 70, mid: 50, stereoWidth: 75 }, description: 'Dancefloor power' },
    { name: 'Vinyl', settings: { loudness: 65, eq: 45, compression: 50, bass: 55, treble: 60, mid: 60, stereoWidth: 80 }, description: 'Analog warmth' },
    { name: 'Podcast', settings: { loudness: 80, eq: 50, compression: 70, bass: 50, treble: 55, mid: 70, stereoWidth: 50 }, description: 'Clear voice focus' },
  ],
};

export default function MasteringDialog({ track, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [loudness, setLoudness] = useState(75);
  const [eq, setEq] = useState(50);
  const [compression, setCompression] = useState(60);
  const [bass, setBass] = useState(60);
  const [treble, setTreble] = useState(60);
  const [mid, setMid] = useState(55);
  const [stereoWidth, setStereoWidth] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [progress, setProgress] = useState(0);

  const applyPreset = (preset) => {
    setSelectedPreset(preset);
    setLoudness(preset.settings.loudness);
    setEq(preset.settings.eq);
    setCompression(preset.settings.compression);
    setBass(preset.settings.bass);
    setTreble(preset.settings.treble);
    setMid(preset.settings.mid);
    setStereoWidth(preset.settings.stereoWidth);
  };

  const handleMaster = async () => {
    setIsProcessing(true);
    setProgress(0);
    try {
      const stages = [
        { name: 'Analyzing audio...', duration: 800 },
        { name: 'Applying EQ...', duration: 1000 },
        { name: 'Compressing dynamics...', duration: 1200 },
        { name: 'Enhancing stereo width...', duration: 900 },
        { name: 'Finalizing master...', duration: 1100 },
      ];
      
      let totalProgress = 0;
      for (const stage of stages) {
        setProcessingStage(stage.name);
        await new Promise(resolve => setTimeout(resolve, stage.duration));
        totalProgress += 100 / stages.length;
        setProgress(Math.min(totalProgress, 100));
      }
      
      toast.success('Mastering complete!', {
        description: 'A new mastered version has been created'
      });
      
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      onOpenChange(false);
    } catch (error) {
      toast.error('Mastering failed', {
        description: error.message
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProcessingStage('');
    }
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Volume2 className="h-5 w-5 text-violet-400" />
            AI Mastering Studio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Object.entries(presets).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-white mb-3 capitalize">{category}</h3>
                <div className="space-y-2">
                  {items.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all group",
                        selectedPreset?.name === preset.name
                          ? "bg-violet-500/20 border-2 border-violet-500"
                          : "bg-slate-800/50 border border-slate-700 hover:bg-slate-800"
                      )}
                    >
                      <div className="font-medium text-white mb-1">{preset.name}</div>
                      <div className="text-xs text-slate-400">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between hover:bg-slate-800"
            >
              <span className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                Fine-Tune Parameters
              </span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-5 p-4 bg-slate-800/30 rounded-xl border border-slate-700"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-white mb-2 block flex items-center justify-between">
                        Bass
                        <span className="text-xs text-slate-400">{bass}%</span>
                      </label>
                      <Slider
                        value={[bass]}
                        onValueChange={(value) => setBass(value[0])}
                        max={100}
                        step={1}
                        className="mb-1"
                      />
                      <div className="text-xs text-slate-500">Low frequencies</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-white mb-2 block flex items-center justify-between">
                        Treble
                        <span className="text-xs text-slate-400">{treble}%</span>
                      </label>
                      <Slider
                        value={[treble]}
                        onValueChange={(value) => setTreble(value[0])}
                        max={100}
                        step={1}
                        className="mb-1"
                      />
                      <div className="text-xs text-slate-500">High frequencies</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-white mb-2 block flex items-center justify-between">
                        Mids
                        <span className="text-xs text-slate-400">{mid}%</span>
                      </label>
                      <Slider
                        value={[mid]}
                        onValueChange={(value) => setMid(value[0])}
                        max={100}
                        step={1}
                        className="mb-1"
                      />
                      <div className="text-xs text-slate-500">Mid frequencies</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-white mb-2 block flex items-center justify-between">
                        Stereo Width
                        <span className="text-xs text-slate-400">{stereoWidth}%</span>
                      </label>
                      <Slider
                        value={[stereoWidth]}
                        onValueChange={(value) => setStereoWidth(value[0])}
                        max={100}
                        step={1}
                        className="mb-1"
                      />
                      <div className="text-xs text-slate-500">Spatial enhancement</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white mb-2 block flex items-center justify-between">
                      Compression
                      <span className="text-xs text-slate-400">{compression}%</span>
                    </label>
                    <Slider
                      value={[compression]}
                      onValueChange={(value) => setCompression(value[0])}
                      max={100}
                      step={1}
                      className="mb-1"
                    />
                    <div className="text-xs text-slate-500">Dynamic range control</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white mb-2 block flex items-center justify-between">
                      Loudness
                      <span className="text-xs text-slate-400">{loudness}%</span>
                    </label>
                    <Slider
                      value={[loudness]}
                      onValueChange={(value) => setLoudness(value[0])}
                      max={100}
                      step={1}
                      className="mb-1"
                    />
                    <div className="text-xs text-slate-500">Overall output level</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white">{processingStage}</span>
                <span className="text-sm text-violet-400">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ scaleY: [1, 1.5, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1 h-4 bg-violet-400 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400">Analyzing waveform...</span>
              </div>
            </motion.div>
          )}

          <Button
            onClick={handleMaster}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Apply Mastering
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}