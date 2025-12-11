import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Volume2, Play, Pause, Download, Wand2, 
  RefreshCw, Music2, Disc3, Guitar, Piano 
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import BottomSheet from '@/components/mobile/BottomSheet';

const stemIcons = {
  vocal: Music2,
  instrumental: Guitar,
  drums: Disc3,
  bass: Volume2,
  guitar: Guitar,
  keyboard: Piano,
  other: Music2,
};

export default function StemMixer({ open, onClose, track, stemData, onRemixComplete }) {
  const [stems, setStems] = useState([]);
  const [playingStems, setPlayingStems] = useState(new Set());
  const [remixingStep, setRemixingStep] = useState(null);
  const [remixPrompt, setRemixPrompt] = useState('');
  const [isRemixing, setIsRemixing] = useState(false);

  useEffect(() => {
    if (stemData) {
      const stemArray = [];
      if (stemData.vocal_url) stemArray.push({ name: 'Vocals', key: 'vocal', url: stemData.vocal_url, volume: [100], pan: [50] });
      if (stemData.instrumental_url) stemArray.push({ name: 'Instrumental', key: 'instrumental', url: stemData.instrumental_url, volume: [100], pan: [50] });
      if (stemData.drums_url) stemArray.push({ name: 'Drums', key: 'drums', url: stemData.drums_url, volume: [100], pan: [50] });
      if (stemData.bass_url) stemArray.push({ name: 'Bass', key: 'bass', url: stemData.bass_url, volume: [100], pan: [50] });
      if (stemData.guitar_url) stemArray.push({ name: 'Guitar', key: 'guitar', url: stemData.guitar_url, volume: [100], pan: [50] });
      if (stemData.keyboard_url) stemArray.push({ name: 'Keyboard', key: 'keyboard', url: stemData.keyboard_url, volume: [100], pan: [50] });
      setStems(stemArray);
    }
  }, [stemData]);

  const updateStemVolume = (index, value) => {
    const newStems = [...stems];
    newStems[index].volume = value;
    setStems(newStems);
  };

  const updateStemPan = (index, value) => {
    const newStems = [...stems];
    newStems[index].pan = value;
    setStems(newStems);
  };

  const handleRemixStem = async (stem) => {
    if (!remixPrompt.trim()) {
      toast.error('Please enter remix instructions');
      return;
    }

    setIsRemixing(true);
    haptics.medium();
    try {
      const response = await base44.functions.invoke('remixStem', {
        track_id: track.id,
        stem_type: stem.key,
        stem_url: stem.url,
        prompt: remixPrompt,
      });

      if (response.data.success) {
        toast.success('AI remix started! Check back in a minute.');
        haptics.success();
        onRemixComplete?.();
        setRemixingStep(null);
        setRemixPrompt('');
      }
    } catch (error) {
      toast.error('Remix failed');
      haptics.error();
    } finally {
      setIsRemixing(false);
    }
  };

  const handleDownloadMix = () => {
    toast.info('Export feature coming soon!');
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Stem Mixer" snapPoints={[0.95]}>
      <div className="space-y-6 pb-6">
        {/* Mixer Controls */}
        <div className="space-y-4">
          {stems.map((stem, index) => {
            const Icon = stemIcons[stem.key] || Music2;
            return (
              <motion.div
                key={stem.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30">
                      <Icon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{stem.name}</h4>
                      <p className="text-xs text-slate-400">Isolated track</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRemixingStep(stem)}
                    className="border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    AI Remix
                  </Button>
                </div>

                {/* Volume Control */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Volume</span>
                    <span className="text-violet-400">{stem.volume[0]}%</span>
                  </div>
                  <Slider
                    value={stem.volume}
                    onValueChange={(value) => updateStemVolume(index, value)}
                    max={150}
                    className="cursor-pointer"
                  />
                </div>

                {/* Pan Control */}
                <div className="space-y-2 mt-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Pan</span>
                    <span className="text-pink-400">
                      {stem.pan[0] === 50 ? 'Center' : stem.pan[0] < 50 ? `L ${50 - stem.pan[0]}` : `R ${stem.pan[0] - 50}`}
                    </span>
                  </div>
                  <Slider
                    value={stem.pan}
                    onValueChange={(value) => updateStemPan(index, value)}
                    max={100}
                    className="cursor-pointer"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Export Button */}
        <Button
          onClick={handleDownloadMix}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Mixed Track
        </Button>

        {/* AI Remix Dialog */}
        <AnimatePresence>
          {remixingStep && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setRemixingStep(null)}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 rounded-2xl border border-slate-700 p-6 max-w-md w-full"
              >
                <h3 className="text-xl font-bold text-white mb-2">AI Remix {remixingStep.name}</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Describe how you want to transform this stem
                </p>
                <Input
                  value={remixPrompt}
                  onChange={(e) => setRemixPrompt(e.target.value)}
                  placeholder="e.g., 'add vintage 80s drums' or 'make it more aggressive'"
                  className="bg-slate-800 border-slate-700 text-white mb-4"
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setRemixingStep(null)}
                    className="flex-1 border-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleRemixStem(remixingStep)}
                    disabled={isRemixing || !remixPrompt.trim()}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                  >
                    {isRemixing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Remixing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Remix
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BottomSheet>
  );
}