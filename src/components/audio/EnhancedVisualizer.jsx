import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Palette, Zap, Activity, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { haptics } from '@/components/utils/haptics';

const VISUALIZER_THEMES = {
  gradient: {
    name: 'Gradient Flow',
    colors: ['rgba(139, 92, 246, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(251, 146, 60, 0.8)'],
    style: 'gradient',
  },
  neon: {
    name: 'Neon Pulse',
    colors: ['rgba(0, 255, 255, 0.9)', 'rgba(255, 0, 255, 0.9)', 'rgba(255, 255, 0, 0.9)'],
    style: 'neon',
  },
  fire: {
    name: 'Fire Wave',
    colors: ['rgba(255, 69, 0, 0.9)', 'rgba(255, 140, 0, 0.9)', 'rgba(255, 215, 0, 0.9)'],
    style: 'fire',
  },
  ocean: {
    name: 'Ocean Deep',
    colors: ['rgba(0, 119, 182, 0.8)', 'rgba(0, 180, 216, 0.8)', 'rgba(72, 202, 228, 0.8)'],
    style: 'ocean',
  },
  monochrome: {
    name: 'Monochrome',
    colors: ['rgba(255, 255, 255, 0.9)', 'rgba(200, 200, 200, 0.8)', 'rgba(150, 150, 150, 0.7)'],
    style: 'monochrome',
  },
};

export default function EnhancedVisualizer({ 
  audioRef, 
  isPlaying, 
  className = '',
  height = 200,
  bassBoost = 1,
  midBoost = 1,
  trebleBoost = 1,
}) {
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const [currentTheme, setCurrentTheme] = useState('gradient');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [syncMode, setSyncMode] = useState('full'); // 'full', 'bass', 'vocals'
  const [sensitivity, setSensitivity] = useState(1);

  useEffect(() => {
    if (!audioRef?.current) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioRef.current);
    
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    analyserRef.current = analyser;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [audioRef]);

  useEffect(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const theme = VISUALIZER_THEMES[currentTheme];
      const barCount = syncMode === 'bass' ? 32 : syncMode === 'vocals' ? 64 : 128;
      const barWidth = canvas.width / barCount;

      // Apply frequency-specific boosts
      const processedData = new Uint8Array(bufferLength);
      for (let i = 0; i < bufferLength; i++) {
        let boost = 1;
        if (syncMode === 'bass' && i < bufferLength / 4) {
          boost = bassBoost;
        } else if (syncMode === 'vocals' && i >= bufferLength / 4 && i < bufferLength / 2) {
          boost = midBoost;
        } else if (i >= bufferLength / 2) {
          boost = trebleBoost;
        }
        processedData[i] = Math.min(255, dataArray[i] * boost * sensitivity);
      }

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const barHeight = (processedData[dataIndex] / 255) * canvas.height;
        const x = i * barWidth;

        // Apply theme styles
        if (theme.style === 'gradient') {
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, theme.colors[0]);
          gradient.addColorStop(0.5, theme.colors[1]);
          gradient.addColorStop(1, theme.colors[2]);
          ctx.fillStyle = gradient;
        } else if (theme.style === 'neon') {
          const colorIndex = Math.floor((i / barCount) * 3);
          ctx.fillStyle = theme.colors[colorIndex];
          ctx.shadowBlur = 20;
          ctx.shadowColor = theme.colors[colorIndex];
        } else if (theme.style === 'fire') {
          const intensity = barHeight / canvas.height;
          const colorIndex = Math.floor(intensity * 2);
          ctx.fillStyle = theme.colors[colorIndex];
        } else {
          ctx.fillStyle = theme.colors[0];
        }

        // Draw bar
        const radius = 2;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, radius);
        ctx.fill();

        // Reset shadow for next iteration
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTheme, syncMode, sensitivity, bassBoost, midBoost, trebleBoost]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        width={800}
        height={height}
        className="w-full h-full rounded-xl"
        style={{ imageRendering: 'crisp-edges' }}
      />

      {/* Controls Overlay */}
      <div className="absolute top-2 right-2 flex gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            haptics.light();
            setShowThemeSelector(!showThemeSelector);
          }}
          className="h-8 w-8 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white"
        >
          <Palette className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            haptics.selection();
            const modes = ['full', 'bass', 'vocals'];
            const currentIndex = modes.indexOf(syncMode);
            setSyncMode(modes[(currentIndex + 1) % modes.length]);
          }}
          className="h-8 w-8 bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white"
        >
          {syncMode === 'bass' ? (
            <Zap className="h-4 w-4" />
          ) : syncMode === 'vocals' ? (
            <Activity className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Theme Selector Dropdown */}
      <AnimatePresence>
        {showThemeSelector && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-12 right-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl p-2 shadow-xl z-10"
          >
            <div className="space-y-1 min-w-[160px]">
              {Object.entries(VISUALIZER_THEMES).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => {
                    haptics.selection();
                    setCurrentTheme(key);
                    setShowThemeSelector(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                    currentTheme === key
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <div className="flex gap-1">
                    {theme.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {theme.name}
                </button>
              ))}
            </div>

            {/* Sensitivity Control */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <label className="text-xs text-slate-400 block mb-2">Sensitivity</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Mode Indicator */}
      <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
        <span className="text-xs text-white font-medium">
          {syncMode === 'bass' ? 'Bass Sync' : syncMode === 'vocals' ? 'Vocal Sync' : 'Full Spectrum'}
        </span>
      </div>
    </div>
  );
}