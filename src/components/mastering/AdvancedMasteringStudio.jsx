import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Wand2, Music, Download, Play, Pause, RefreshCw, 
  Sparkles, Sliders, Waves, Volume2, Zap 
} from 'lucide-react';
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
  ambient: { loudness: -19, compression: 35, bass: 1, highs: 2, width: 100 },
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
        multiband_compression: multibandComp[0],
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
    <BottomSheet open={open} onClose={onClose} title="AI Mastering Studio" snapPoints={[0.95]}>
      <div className="space-y-6 pb-6">
        {/* AI Analysis Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-2xl p-4 border border-purple-500/20"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-purple-400 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-300 mb-1">AI-Powered Mastering</h3>
              <p className="text-sm text-slate-400 mb-3">
                Let AI analyze your track and suggest optimal mastering settings
              </p>
              <Button
                onClick={analyzeTrack}
                disabled={isAnalyzing}
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    AI Analyze Track
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* AI Suggestions */}
        <AnimatePresence>
          {aiSuggestions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20"
            >
              <div className="flex items-start gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-400 mt-0.5" />
                <h4 className="font-medium text-blue-300">AI Recommendations</h4>
              </div>
              <p className="text-sm text-slate-300">{aiSuggestions.explanation}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-slate-800/50 grid grid-cols-3">
            <TabsTrigger value="presets" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
              <Music className="h-4 w-4 mr-2" />
              Presets
            </TabsTrigger>
            <TabsTrigger value="dynamics" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-300">
              <Sliders className="h-4 w-4 mr-2" />
              Dynamics
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300">
              <Waves className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(genrePresets).map((preset) => (
                <motion.button
                  key={preset}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => applyPreset(preset)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedPreset === preset
                      ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-400/50'
                      : 'bg-slate-800/30 border-slate-700 hover:border-purple-500/30'
                  }`}
                >
                  <Music className="h-5 w-5 text-purple-400 mb-2" />
                  <p className="font-medium text-white capitalize">{preset}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {genrePresets[preset].loudness} LUFS
                  </p>
                </motion.button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dynamics" className="space-y-6 mt-4">
            <div>
              <div className="flex justify-between mb-3">
                <Label className="text-purple-300 flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Target Loudness
                </Label>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {loudness[0]} LUFS
                </Badge>
              </div>
              <Slider
                value={loudness}
                onValueChange={setLoudness}
                min={-23}
                max={-8}
                step={0.5}
                className="cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2">Industry standard: -14 LUFS</p>
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <Label className="text-pink-300 flex items-center gap-2">
                  <Sliders className="h-4 w-4" />
                  Compression
                </Label>
                <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30">
                  {compression[0]}%
                </Badge>
              </div>
              <Slider
                value={compression}
                onValueChange={setCompression}
                max={100}
                step={5}
                className="cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <Label className="text-orange-300">Bass Boost</Label>
                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                  {bassBoost[0]} dB
                </Badge>
              </div>
              <Slider
                value={bassBoost}
                onValueChange={setBassBoost}
                min={-6}
                max={6}
                step={0.5}
                className="cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <Label className="text-blue-300">High Frequency Boost</Label>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {highBoost[0]} dB
                </Badge>
              </div>
              <Slider
                value={highBoost}
                onValueChange={setHighBoost}
                min={-6}
                max={6}
                step={0.5}
                className="cursor-pointer"
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-4">
            <div>
              <div className="flex justify-between mb-3">
                <Label className="text-cyan-300">Stereo Width</Label>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  {stereoWidth[0]}%
                </Badge>
              </div>
              <Slider
                value={stereoWidth}
                onValueChange={setStereoWidth}
                max={120}
                step={5}
                className="cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <Label className="text-green-300">Spectral Repair</Label>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  {spectralRepair[0]}%
                </Badge>
              </div>
              <Slider
                value={spectralRepair}
                onValueChange={setSpectralRepair}
                max={100}
                step={5}
                className="cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2">Removes unwanted frequencies and noise</p>
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <Label className="text-yellow-300">Multi-band Compression</Label>
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                  {multibandComp[0]}%
                </Badge>
              </div>
              <Slider
                value={multibandComp}
                onValueChange={setMultibandComp}
                max={100}
                step={5}
                className="cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2">Separate compression for different frequency bands</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t border-slate-800 space-y-3">
          <Button
            onClick={handleMaster}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 h-12 text-base font-semibold"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Mastering...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Master Track
              </>
            )}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}