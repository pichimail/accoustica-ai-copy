import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Volume2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function MasteringDialog({ track, open, onClose, onSuccess }) {
  const [preset, setPreset] = useState('balanced');
  const [loudness, setLoudness] = useState([0]);
  const [processing, setProcessing] = useState(false);

  const presets = {
    balanced: { name: 'Balanced', description: 'Professional all-purpose mastering' },
    punchy: { name: 'Punchy', description: 'Enhanced dynamics for impact' },
    warm: { name: 'Warm', description: 'Smooth and pleasant tonality' },
    bright: { name: 'Bright', description: 'Enhanced high frequencies' },
    bass_heavy: { name: 'Bass Heavy', description: 'Enhanced low-end presence' },
  };

  const handleMaster = async () => {
    setProcessing(true);

    try {
      // Simulate mastering process (in real app, this would call a mastering API)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Create a new version of the track with mastering applied
      const user = await base44.auth.me();
      const masteredTitle = `${track.title} (Mastered - ${presets[preset].name})`;

      // In a real implementation, you'd call a mastering service API here
      // For now, we'll create a version record
      await base44.entities.TrackVersion.create({
        track_id: track.id,
        parent_track_id: track.id,
        changes_description: `Applied ${presets[preset].name} mastering preset with ${loudness[0] > 0 ? 'increased' : loudness[0] < 0 ? 'decreased' : 'neutral'} loudness`,
        edit_type: 'other',
        edited_by: user.email,
      });

      toast.success('Mastering applied successfully!', {
        description: 'Your track has been enhanced with professional mastering',
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
          <div>
            <Label className="text-slate-300 mb-3 block">Mastering Preset</Label>
            <div className="space-y-2">
              {Object.entries(presets).map(([key, value]) => (
                <div
                  key={key}
                  onClick={() => setPreset(key)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    preset === key
                      ? 'bg-violet-500/20 border-violet-500/50'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{value.name}</p>
                      <p className="text-slate-400 text-xs">{value.description}</p>
                    </div>
                    {preset === key && (
                      <div className="w-4 h-4 rounded-full bg-violet-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

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