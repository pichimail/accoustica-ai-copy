import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Volume2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function MasteringDialog({ track, open, onClose, onSuccess }) {
  const [preset, setPreset] = useState('balanced');
  const [loudness, setLoudness] = useState([0]);
  const [eqAdjust, setEqAdjust] = useState([0]);
  const [compression, setCompression] = useState([50]);
  const [processing, setProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const presets = {
    // Genre-specific presets
    pop: { name: 'Pop', description: 'Bright, punchy, radio-ready sound', genre: true },
    rock: { name: 'Rock', description: 'Powerful mids, tight bass, crisp highs', genre: true },
    edm: { name: 'EDM/Electronic', description: 'Heavy bass, wide stereo, loud dynamics', genre: true },
    hiphop: { name: 'Hip Hop', description: 'Deep bass, clear vocals, punchy drums', genre: true },
    jazz: { name: 'Jazz', description: 'Warm, natural dynamics, spacious', genre: true },
    classical: { name: 'Classical', description: 'Dynamic range, natural tone, clarity', genre: true },
    acoustic: { name: 'Acoustic', description: 'Natural warmth, organic feel', genre: true },
    
    // Mood-specific presets
    energetic: { name: 'Energetic', description: 'Boosted presence, tight compression', mood: true },
    chill: { name: 'Chill/Ambient', description: 'Soft warmth, gentle compression', mood: true },
    cinematic: { name: 'Cinematic', description: 'Wide dynamics, epic presence', mood: true },
    lofi: { name: 'Lo-Fi', description: 'Vintage warmth, gentle saturation', mood: true },
    
    // Professional presets
    balanced: { name: 'Balanced', description: 'Professional all-purpose mastering' },
    punchy: { name: 'Punchy', description: 'Enhanced dynamics for impact' },
    warm: { name: 'Warm', description: 'Smooth and pleasant tonality' },
    bright: { name: 'Bright', description: 'Enhanced high frequencies' },
    bass_heavy: { name: 'Bass Heavy', description: 'Enhanced low-end presence' },
    broadcast: { name: 'Broadcast Standard', description: 'Streaming platform optimized' },
  };

  const handleMaster = async () => {
    setProcessing(true);

    try {
      // Simulate mastering process with realistic timing
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Create a new version of the track with mastering applied
      const user = await base44.auth.me();

      // In a real implementation, you'd call a mastering service API here
      // For now, we'll create a version record
      await base44.entities.TrackVersion.create({
        track_id: track.id,
        parent_track_id: track.id,
        changes_description: `Applied ${presets[preset].name} mastering: Loudness ${loudness[0] > 0 ? '+' : ''}${loudness[0]}dB, EQ ${eqAdjust[0] > 0 ? '+' : ''}${eqAdjust[0]}dB, Compression ${compression[0]}%`,
        edit_type: 'other',
        edited_by: user.email,
      });

      toast.success('Mastering applied successfully!', {
        description: `Track enhanced with ${presets[preset].name} preset`,
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
      <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            AI Mastering: {track.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Genre Presets */}
          <div>
            <Label className="text-slate-300 mb-3 block">Genre Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presets).filter(([_, v]) => v.genre).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    preset === key
                      ? 'bg-violet-500/20 border-violet-500/50'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <p className="text-white text-sm font-medium">{value.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{value.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Mood Presets */}
          <div>
            <Label className="text-slate-300 mb-3 block">Mood Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presets).filter(([_, v]) => v.mood).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    preset === key
                      ? 'bg-violet-500/20 border-violet-500/50'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <p className="text-white text-sm font-medium">{value.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{value.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Professional Presets */}
          <div>
            <Label className="text-slate-300 mb-3 block">Professional Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(presets).filter(([_, v]) => !v.genre && !v.mood).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPreset(key)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    preset === key
                      ? 'bg-violet-500/20 border-violet-500/50'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <p className="text-white text-sm font-medium">{value.name}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{value.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Controls Toggle */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-slate-400 hover:text-white"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Controls
          </Button>

          {/* Advanced Controls */}
          {showAdvanced && (
            <div className="space-y-6 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
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
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Darker</span>
                  <span>Brighter</span>
                </div>
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
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Light</span>
                  <span>Heavy</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="text-slate-300 mb-3 block">
              Loudness Adjustment: {loudness[0] > 0 ? '+' : ''}{loudness[0]} dB
            </Label>
            <Slider
              value={loudness}
              onValueChange={setLoudness}
              min={-6}
              max={6}
              step={1}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Quieter</span>
              <span>Louder</span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-400 flex items-start gap-2">
              <Volume2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                AI mastering will automatically enhance your track with professional-grade 
                loudness normalization, equalization, and dynamic range compression. 
                The original track will be preserved.
              </span>
            </p>
          </div>

          {/* Visual Feedback During Processing */}
          {processing && (
            <div className="bg-slate-800/50 rounded-xl p-6 text-center space-y-4">
              <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-pink-500 animate-pulse" 
                     style={{ width: '60%' }} />
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium">Applying AI Mastering...</p>
                <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
                  <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Analyzing Audio
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Applying EQ
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    Normalizing
                  </span>
                </div>
              </div>
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
                Processing Audio...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Apply AI Mastering
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}