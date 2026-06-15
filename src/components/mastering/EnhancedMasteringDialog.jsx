// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/exportClient';
import * as trackClient from '@/api/trackClient';
import * as musicClient from '@/api/musicClient';
import * as llmClient from '@/api/llmClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Upload, Save, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function EnhancedMasteringDialog({ track, open, onClose, onSuccess }) {
  const [preset, setPreset] = useState('balanced');
  const [loudness, setLoudness] = useState([0]);
  const [eqAdjust, setEqAdjust] = useState([0]);
  const [compression, setCompression] = useState([50]);
  const [stereoWidth, setStereoWidth] = useState([100]);
  const [bassBoost, setBassBoost] = useState([0]);
  const [highBoost, setHighBoost] = useState([0]);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [referenceFile, setReferenceFile] = useState(null);
  const [customPresetName, setCustomPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user's custom presets
  const { data: customPresets = [] } = useQuery({
    queryKey: ['masteringPresets'],
    queryFn: async () => {
      const user = await base44.auth.me();
      // TODO_EXPORT_REPLACE_WITH_NEON_DB: MasteringPreset entity → NeonDB table
      return await base44.entities.MasteringPreset.filter({ created_by: user.email });
    },
    enabled: open,
  });

  const builtInPresets = {
    pop: { name: 'Pop', loudness: 2, eq: 1, compression: 70, stereo: 120, bass: 0, high: 2 },
    rock: { name: 'Rock', loudness: 0, eq: 0, compression: 60, stereo: 100, bass: -1, high: 1 },
    hiphop: { name: 'Hip Hop', loudness: 3, eq: -2, compression: 80, stereo: 90, bass: 4, high: 0 },
    edm: { name: 'EDM', loudness: 4, eq: 2, compression: 85, stereo: 150, bass: 5, high: 3 },
    jazz: { name: 'Jazz', loudness: -2, eq: 0, compression: 30, stereo: 110, bass: 0, high: -1 },
    classical: { name: 'Classical', loudness: -3, eq: 0, compression: 20, stereo: 120, bass: 0, high: 0 },
  };

  const handleReferenceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAnalyzing(true);
    try {
      // Upload reference track
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setReferenceFile(file_url);

      // Analyze reference track with AI
      const analysis = await llmClient.invoke({
        prompt: `Analyze this audio file and provide mastering settings. Return a JSON with: loudness (dB from -6 to 6), eq_adjust (dB from -6 to 6), compression (0-100), stereo_width (50-150), bass_boost (dB from -6 to 6), high_boost (dB from -6 to 6). Base your analysis on the sonic characteristics of professional mastering.`,
        file_urls: file_url,
        response_json_schema: {
          type: 'object',
          properties: {
            loudness: { type: 'number' },
            eq_adjust: { type: 'number' },
            compression: { type: 'number' },
            stereo_width: { type: 'number' },
            bass_boost: { type: 'number' },
            high_boost: { type: 'number' },
          },
        },
      });

      // Apply analyzed settings
      setLoudness([analysis.loudness || 0]);
      setEqAdjust([analysis.eq_adjust || 0]);
      setCompression([analysis.compression || 50]);
      setStereoWidth([analysis.stereo_width || 100]);
      setBassBoost([analysis.bass_boost || 0]);
      setHighBoost([analysis.high_boost || 0]);

      toast.success('Reference track analyzed!', {
        description: 'Settings applied from your reference',
      });
    } catch (error) {
      toast.error('Failed to analyze reference track');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSavePreset = async () => {
    if (!customPresetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    setSavingPreset(true);
    try {
      // TODO_EXPORT_REPLACE_WITH_NEON_DB
      await base44.entities.MasteringPreset.create({
        preset_name: customPresetName,
        description: `Custom preset: ${customPresetName}`,
        loudness: loudness[0],
        eq_adjust: eqAdjust[0],
        compression: compression[0],
        stereo_width: stereoWidth[0],
        bass_boost: bassBoost[0],
        high_boost: highBoost[0],
        reference_track_url: referenceFile,
      });

      queryClient.invalidateQueries({ queryKey: ['masteringPresets'] });
      toast.success('Preset saved!');
      setCustomPresetName('');
    } catch (error) {
      toast.error('Failed to save preset');
    } finally {
      setSavingPreset(false);
    }
  };

  const handleLoadPreset = (presetData) => {
    setLoudness([presetData.loudness]);
    setEqAdjust([presetData.eq_adjust]);
    setCompression([presetData.compression]);
    setStereoWidth([presetData.stereo_width]);
    setBassBoost([presetData.bass_boost]);
    setHighBoost([presetData.high_boost]);
    toast.success(`Loaded preset: ${presetData.preset_name || presetData.name}`);
  };

  const handleDeletePreset = async (presetId) => {
    try {
      // TODO_EXPORT_REPLACE_WITH_NEON_DB
      await base44.entities.MasteringPreset.delete(presetId);
      queryClient.invalidateQueries({ queryKey: ['masteringPresets'] });
      toast.success('Preset deleted');
    } catch (error) {
      toast.error('Failed to delete preset');
    }
  };

  const handleMaster = async () => {
    setProcessing(true);
    try {
      const response = await musicClient.master({
        trackId: track.id,
        audioUrl: track.audio_url || track.stream_audio_url,
        targetLufs: loudness[0],
        loudnessTarget: loudness[0],
        eqPreset: eqAdjust[0] > 1 ? 'bright' : eqAdjust[0] < -1 ? 'warm' : 'balanced',
        compressionLevel: compression[0] > 70 ? 'heavy' : compression[0] < 35 ? 'light' : 'medium',
        compression: compression[0],
        stereoWidth: stereoWidth[0],
        bassBoost: bassBoost[0],
        highBoost: highBoost[0],
        eqBands: [
          { freq: '100Hz', gain: bassBoost[0] },
          { freq: '1kHz', gain: eqAdjust[0] },
          { freq: '10kHz', gain: highBoost[0] },
        ],
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Mastering failed');
      }
      
      const user = await base44.auth.me();
      // TODO_EXPORT_REPLACE_WITH_NEON_DB
      await trackClient.createTrackVersion({
        track_id: track.id,
        parent_track_id: track.id,
        changes_description: `AI Mastering: Loudness ${loudness[0]}dB, EQ ${eqAdjust[0]}dB, Compression ${compression[0]}%, Stereo ${stereoWidth[0]}%, Bass ${bassBoost[0]}dB, Highs ${highBoost[0]}dB`,
        edit_type: 'other',
        edited_by: user.email,
      });

      toast.success('Mastering applied!', {
        description: response.data?.report || 'Mastering metadata updated.',
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Mastering failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!track || track.status !== 'ready') return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            Advanced AI Mastering: {track.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="presets" className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="presets" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
              Presets
            </TabsTrigger>
            <TabsTrigger value="reference" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
              Reference Track
            </TabsTrigger>
            <TabsTrigger value="custom" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
              My Presets
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(builtInPresets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handleLoadPreset(preset)}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-violet-500/50 text-left transition-all"
                >
                  <p className="text-white font-medium">{preset.name}</p>
                  <div className="flex gap-1 mt-2 text-xs text-slate-400">
                    <span>{preset.loudness > 0 ? '+' : ''}{preset.loudness}dB</span>
                    <span>•</span>
                    <span>{preset.compression}%</span>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reference" className="space-y-4">
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
              <h3 className="text-white font-medium mb-4">Upload Reference Track</h3>
              <p className="text-slate-400 text-sm mb-4">
                Upload a professionally mastered track. Our AI will analyze its sonic characteristics 
                and apply similar mastering to your track.
              </p>
              
              <label className="block">
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-violet-500/50 transition-colors cursor-pointer">
                  {analyzing ? (
                    <div className="space-y-3">
                      <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto" />
                      <p className="text-white">Analyzing reference track...</p>
                    </div>
                  ) : referenceFile ? (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 text-green-400 mx-auto" />
                      <p className="text-white">Reference uploaded!</p>
                      <p className="text-xs text-slate-400">Settings applied</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="text-white">Click to upload reference track</p>
                      <p className="text-xs text-slate-400">MP3, WAV, or other audio formats</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleReferenceUpload}
                  className="hidden"
                  disabled={analyzing}
                />
              </label>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
              <h3 className="text-white font-medium mb-3">Save Current Settings</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Preset name (e.g., My Pop Master)"
                  value={customPresetName}
                  onChange={(e) => setCustomPresetName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Button
                  onClick={handleSavePreset}
                  disabled={savingPreset || !customPresetName.trim()}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-medium">Your Presets</h3>
              {customPresets.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">
                  No custom presets yet. Configure settings and save them!
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {customPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-violet-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => handleLoadPreset(preset)}
                          className="flex-1 text-left"
                        >
                          <p className="text-white font-medium flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400" />
                            {preset.preset_name}
                          </p>
                          <div className="flex gap-1 mt-1 text-xs text-slate-400">
                            <span>{preset.loudness > 0 ? '+' : ''}{preset.loudness}dB</span>
                            <span>•</span>
                            <span>{preset.compression}%</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-6">
              <div>
                <Label className="text-slate-300 mb-3 block">
                  Loudness: {loudness[0] > 0 ? '+' : ''}{loudness[0]} dB
                </Label>
                <Slider
                  value={loudness}
                  onValueChange={setLoudness}
                  min={-6}
                  max={6}
                  step={0.5}
                  className="cursor-pointer"
                />
              </div>

              <div>
                <Label className="text-slate-300 mb-3 block">
                  EQ Balance: {eqAdjust[0] > 0 ? '+' : ''}{eqAdjust[0]} dB
                </Label>
                <Slider
                  value={eqAdjust}
                  onValueChange={setEqAdjust}
                  min={-6}
                  max={6}
                  step={0.5}
                  className="cursor-pointer"
                />
              </div>

              <div>
                <Label className="text-slate-300 mb-3 block">
                  Compression: {compression[0]}%
                </Label>
                <Slider
                  value={compression}
                  onValueChange={setCompression}
                  min={0}
                  max={100}
                  step={5}
                  className="cursor-pointer"
                />
              </div>

              <div>
                <Label className="text-slate-300 mb-3 block">
                  Stereo Width: {stereoWidth[0]}%
                </Label>
                <Slider
                  value={stereoWidth}
                  onValueChange={setStereoWidth}
                  min={50}
                  max={150}
                  step={5}
                  className="cursor-pointer"
                />
              </div>

              <div>
                <Label className="text-slate-300 mb-3 block">
                  Bass Boost: {bassBoost[0] > 0 ? '+' : ''}{bassBoost[0]} dB
                </Label>
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
                <Label className="text-slate-300 mb-3 block">
                  High Boost: {highBoost[0] > 0 ? '+' : ''}{highBoost[0]} dB
                </Label>
                <Slider
                  value={highBoost}
                  onValueChange={setHighBoost}
                  min={-6}
                  max={6}
                  step={0.5}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {processing && (
          <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
            <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-pink-500 animate-pulse" style={{ width: '60%' }} />
            </div>
            <p className="text-white text-center">Applying AI Mastering...</p>
          </div>
        )}

        <Button
          onClick={handleMaster}
          disabled={processing}
          className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Apply Mastering
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}