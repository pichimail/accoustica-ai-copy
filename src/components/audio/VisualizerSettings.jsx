// @ts-nocheck
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { BarChart3, Waves, Palette, Sliders } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';

const COLOR_PALETTES = {
  violet: {
    name: 'Violet Dream',
    colors: ['rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.6)', 'rgba(59, 130, 246, 0.4)'],
    preview: ['bg-violet-500', 'bg-pink-500', 'bg-blue-500']
  },
  sunset: {
    name: 'Sunset',
    colors: ['rgba(251, 146, 60, 0.8)', 'rgba(239, 68, 68, 0.6)', 'rgba(245, 158, 11, 0.4)'],
    preview: ['bg-orange-500', 'bg-red-500', 'bg-amber-500']
  },
  ocean: {
    name: 'Ocean',
    colors: ['rgba(6, 182, 212, 0.8)', 'rgba(14, 165, 233, 0.6)', 'rgba(59, 130, 246, 0.4)'],
    preview: ['bg-cyan-500', 'bg-sky-500', 'bg-blue-500']
  },
  forest: {
    name: 'Forest',
    colors: ['rgba(34, 197, 94, 0.8)', 'rgba(74, 222, 128, 0.6)', 'rgba(16, 185, 129, 0.4)'],
    preview: ['bg-green-600', 'bg-green-400', 'bg-emerald-500']
  },
  neon: {
    name: 'Neon',
    colors: ['rgba(236, 72, 153, 0.8)', 'rgba(168, 85, 247, 0.6)', 'rgba(34, 211, 238, 0.4)'],
    preview: ['bg-pink-500', 'bg-purple-500', 'bg-cyan-400']
  },
  fire: {
    name: 'Fire',
    colors: ['rgba(239, 68, 68, 0.8)', 'rgba(251, 146, 60, 0.6)', 'rgba(234, 179, 8, 0.4)'],
    preview: ['bg-red-500', 'bg-orange-500', 'bg-yellow-500']
  },
  midnight: {
    name: 'Midnight',
    colors: ['rgba(79, 70, 229, 0.8)', 'rgba(99, 102, 241, 0.6)', 'rgba(139, 92, 246, 0.4)'],
    preview: ['bg-indigo-600', 'bg-indigo-500', 'bg-violet-500']
  },
  rose: {
    name: 'Rose Gold',
    colors: ['rgba(244, 114, 182, 0.8)', 'rgba(251, 207, 232, 0.6)', 'rgba(236, 72, 153, 0.4)'],
    preview: ['bg-pink-400', 'bg-pink-200', 'bg-pink-500']
  }
};

export default function VisualizerSettings({ 
  open, 
  onClose, 
  visualizerType,
  setVisualizerType,
  colorPalette,
  setColorPalette,
  sensitivity,
  setSensitivity,
  smoothness,
  setSmoothness
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-violet-400" />
            Visualizer Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visualizer Type */}
          <div>
            <Label className="text-slate-300 mb-3 block">Visualizer Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setVisualizerType('waveform')}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  visualizerType === 'waveform'
                    ? "bg-violet-500/20 border-violet-500 shadow-lg shadow-violet-500/20"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                )}
              >
                <Waves className={cn(
                  "h-8 w-8 mx-auto mb-2",
                  visualizerType === 'waveform' ? "text-violet-400" : "text-slate-400"
                )} />
                <p className={cn(
                  "text-sm font-medium",
                  visualizerType === 'waveform' ? "text-white" : "text-slate-400"
                )}>
                  Waveform
                </p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setVisualizerType('bars')}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  visualizerType === 'bars'
                    ? "bg-violet-500/20 border-violet-500 shadow-lg shadow-violet-500/20"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                )}
              >
                <BarChart3 className={cn(
                  "h-8 w-8 mx-auto mb-2",
                  visualizerType === 'bars' ? "text-violet-400" : "text-slate-400"
                )} />
                <p className={cn(
                  "text-sm font-medium",
                  visualizerType === 'bars' ? "text-white" : "text-slate-400"
                )}>
                  Frequency Bars
                </p>
              </motion.button>
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <Label className="text-slate-300 mb-3 flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color Palette
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setColorPalette(key)}
                  className={cn(
                    "p-3 rounded-xl border-2 transition-all",
                    colorPalette === key
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  )}
                >
                  <div className="flex gap-1 mb-2">
                    {palette.preview.map((color, idx) => (
                      <div
                        key={idx}
                        className={cn("h-6 flex-1 rounded", color)}
                      />
                    ))}
                  </div>
                  <p className={cn(
                    "text-xs font-medium",
                    colorPalette === key ? "text-white" : "text-slate-400"
                  )}>
                    {palette.name}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Sensitivity */}
          <div>
            <Label className="text-slate-300 mb-3 block">
              Sensitivity: {sensitivity}%
            </Label>
            <div className="space-y-2">
              <Slider
                value={[sensitivity]}
                onValueChange={(v) => setSensitivity(v[0])}
                min={50}
                max={200}
                step={5}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtle</span>
                <span>Moderate</span>
                <span>Intense</span>
              </div>
            </div>
          </div>

          {/* Smoothness */}
          <div>
            <Label className="text-slate-300 mb-3 block">
              Smoothness: {smoothness}%
            </Label>
            <div className="space-y-2">
              <Slider
                value={[smoothness]}
                onValueChange={(v) => setSmoothness(v[0])}
                min={0}
                max={100}
                step={5}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Sharp</span>
                <span>Balanced</span>
                <span>Smooth</span>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <Button
            onClick={() => {
              setVisualizerType('waveform');
              setColorPalette('violet');
              setSensitivity(100);
              setSmoothness(50);
            }}
            variant="outline"
            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Reset to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { COLOR_PALETTES };