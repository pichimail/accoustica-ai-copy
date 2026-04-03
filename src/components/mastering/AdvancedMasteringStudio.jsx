import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Wand2, Music, Download, Play, Pause, RefreshCw,
  Sparkles, Sliders, Waves, Volume2, Zap } from
'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import BottomSheet from '@/components/mobile/BottomSheet';

const genrePresets = {
  pop: { loudness: -14, compression: 70, bass: 2, highs: 3, width: 85 },
  rock: { loudness: -12, compression: 65, bass: 3, highs: 4, width: 90 },
  electronic: { loudness: -11, compression: 75, bass: 4, highs: 5, width: 95 },
  hiphop: { loudness: -13, compression: 80, bass: 5, highs: 2, width: 80 },
  jazz: { loudness: -18, compression: 40, bass: 1, highs: 2, width: 100 },
  classical: { loudness: -20, compression: 30, bass: 0, highs: 1, width: 100 },
  indie: { loudness: -16, compression: 55, bass: 2, highs: 3, width: 85 },
  ambient: { loudness: -19, compression: 35, bass: 1, highs: 2, width: 100 }
};

export default function AdvancedMasteringStudio({ open, onClose, track, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('pop');
  const [activeTab, setActiveTab] = useState('presets');

  // Mastering parameters
  const [loudness, setLoudness] = useState([-14]);
  const [compression, setCompression] = useState([70]);
  const [bassBoost, setBassBoost] = useState([2]);
  const [highBoost, setHighBoost] = useState([3]);
  const [stereoWidth, setStereoWidth] = useState([85]);
  const [spectralRepair, setSpectralRepair] = useState([50]);
  const [multibandComp, setMultibandComp] = useState([60]);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const applyPreset = (preset) => {
    haptics.selection();
    setSelectedPreset(preset);
    const settings = genrePresets[preset];
    setLoudness([settings.loudness]);
    setCompression([settings.compression]);
    setBassBoost([settings.bass]);
    setHighBoost([settings.highs]);
    setStereoWidth([settings.width]);
  };

  const analyzeTrack = async () => {
    setIsAnalyzing(true);
    haptics.light();
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this music track and suggest optimal mastering settings:
        Genre: ${track.style}
        Title: ${track.title}
        
        Provide mastering recommendations for:
        - Target loudness (LUFS)
        - Compression ratio
        - Bass boost (dB)
        - High frequency boost (dB)
        - Stereo width (%)
        - Spectral repair needs
        
        Return recommendations with brief explanations.`,
        response_json_schema: {
          type: "object",
          properties: {
            loudness: { type: "number" },
            compression: { type: "number" },
            bass_boost: { type: "number" },
            high_boost: { type: "number" },
            stereo_width: { type: "number" },
            spectral_repair: { type: "number" },
            explanation: { type: "string" }
          }
        }
      });

      setAiSuggestions(response);
      setLoudness([response.loudness]);
      setCompression([response.compression]);
      setBassBoost([response.bass_boost]);
      setHighBoost([response.high_boost]);
      setStereoWidth([response.stereo_width]);
      setSpectralRepair([response.spectral_repair]);

      toast.success('AI analysis complete!');
      haptics.success();
    } catch (error) {
      toast.error('Failed to analyze track');
      haptics.error();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMaster = async () => {
    setIsProcessing(true);
    haptics.medium();
    try {
      const response = await base44.functions.invoke('masterTrack', {
        track_id: track.id,
        audio_url: track.audio_url,
        loudness: loudness[0],
        compression: compression[0],
        bass_boost: bassBoost[0],
        high_boost: highBoost[0],
        stereo_width: stereoWidth[0],
        spectral_repair: spectralRepair[0],
        multiband_compression: multibandComp[0]
      });

      if (response.data.success) {
        toast.success('Track mastered successfully!');
        haptics.success();
        onSuccess?.(response.data.mastered_url);
        onClose();
      }
    } catch (error) {
      toast.error('Mastering failed');
      haptics.error();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="AI Mastering" snapPoints={[0.7]}>
      <div className="space-y-3 pb-4">
        {/* AI Analysis */}
        <Button
          onClick={analyzeTrack}
          disabled={isAnalyzing}
          size="sm"
          variant="outline" className="bg-pink-600 text-gray-50 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border shadow-sm hover:text-accent-foreground h-8 w-full border-purple-500/30 hover:bg-purple-500/10">

          
          {isAnalyzing ?
          <>
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Analyzing...
            </> :

          <>
              <Wand2 className="h-3 w-3 mr-2" />
              AI Analyze
            </>
          }
        </Button>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2">
          {Object.keys(genrePresets).map((preset) =>
          <button
            key={preset}
            onClick={() => applyPreset(preset)}
            className={`p-2 rounded-lg border text-xs transition-all ${
            selectedPreset === preset ?
            'bg-purple-500/20 border-purple-400/50 text-white' :
            'bg-slate-800/30 border-slate-700 text-slate-400'}`
            }>
            
              {preset}
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-slate-400">Loudness</Label>
              <span className="text-xs text-slate-300">{loudness[0]} LUFS</span>
            </div>
            <Slider value={loudness} onValueChange={setLoudness} min={-23} max={-8} step={0.5} />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-slate-400">Compression</Label>
              <span className="text-xs text-slate-300">{compression[0]}%</span>
            </div>
            <Slider value={compression} onValueChange={setCompression} max={100} step={5} />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-slate-400">Bass</Label>
              <span className="text-xs text-slate-300">{bassBoost[0]} dB</span>
            </div>
            <Slider value={bassBoost} onValueChange={setBassBoost} min={-6} max={6} step={0.5} />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-slate-400">Highs</Label>
              <span className="text-xs text-slate-300">{highBoost[0]} dB</span>
            </div>
            <Slider value={highBoost} onValueChange={setHighBoost} min={-6} max={6} step={0.5} />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-slate-400">Stereo Width</Label>
              <span className="text-xs text-slate-300">{stereoWidth[0]}%</span>
            </div>
            <Slider value={stereoWidth} onValueChange={setStereoWidth} max={120} step={5} />
          </div>
        </div>

        <Button
          onClick={handleMaster}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          
          {isProcessing ?
          <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Mastering...
            </> :

          <>
              <Sparkles className="h-4 w-4 mr-2" />
              Master Track
            </>
          }
        </Button>
      </div>
    </BottomSheet>);

}