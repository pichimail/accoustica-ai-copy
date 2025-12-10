import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Shuffle, Music } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

export default function VariationGenerator({ open, onClose, track, onSuccess }) {
  const [variationType, setVariationType] = useState('similar');
  const [creativityLevel, setCreativityLevel] = useState([50]);
  const [modifications, setModifications] = useState('');
  const [generating, setGenerating] = useState(false);

  const variationTypes = [
    { id: 'similar', label: 'Similar Style', desc: 'Keep the same vibe' },
    { id: 'remix', label: 'Remix', desc: 'Different arrangement' },
    { id: 'mashup', label: 'Mashup', desc: 'Blend with new elements' },
    { id: 'alternative', label: 'Alternative Take', desc: 'Different mood' },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let prompt = `Create a ${variationType} variation of: ${track.prompt}`;
      
      if (modifications.trim()) {
        prompt += ` Additional changes: ${modifications}`;
      }
      
      prompt += ` [Creativity: ${creativityLevel[0]}%]`;

      const response = await base44.functions.invoke('generateMusic', {
        prompt,
        style: track.style,
        title: `${track.title} (Variation)`,
        instrumental: track.is_instrumental,
      });

      if (response.data.success) {
        toast.success('Variation is being generated!');
        onSuccess?.();
        onClose();
      } else {
        throw new Error(response.data.error || 'Failed to generate variation');
      }
    } catch (error) {
      toast.error('Failed to generate variation', {
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shuffle className="h-5 w-5 text-violet-400" />
            Generate Variation
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new version of "{track?.title}" with AI-powered variations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Variation Type */}
          <div>
            <Label className="text-slate-300 mb-3 block">Variation Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {variationTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setVariationType(type.id)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    variationType === type.id
                      ? "bg-violet-500/20 border-violet-500/50 text-white"
                      : "bg-slate-700/50 border-slate-600 text-slate-300 hover:border-violet-500/30"
                  )}
                >
                  <div className="font-medium mb-1">{type.label}</div>
                  <div className="text-xs text-slate-400">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Creativity Level */}
          <div>
            <Label className="text-slate-300 text-sm mb-3 flex items-center justify-between">
              <span>Creativity Level</span>
              <span className="text-violet-400">{creativityLevel[0]}%</span>
            </Label>
            <Slider
              value={creativityLevel}
              onValueChange={setCreativityLevel}
              max={100}
              step={5}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Conservative</span>
              <span>Wild & Creative</span>
            </div>
          </div>

          {/* Additional Modifications */}
          <div>
            <Label className="text-slate-300 mb-2 block">
              Additional Changes (Optional)
            </Label>
            <Textarea
              value={modifications}
              onChange={(e) => setModifications(e.target.value)}
              placeholder="e.g., Make it more upbeat, add electronic elements, slower tempo..."
              className="bg-slate-700/50 border-slate-600 text-white min-h-[100px]"
            />
          </div>

          {/* Original Track Info */}
          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                <img
                  src={track?.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'}
                  alt={track?.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Music className="h-3 w-3 text-slate-400" />
                  <span className="text-sm text-slate-400">Original Track</span>
                </div>
                <h4 className="font-medium text-white truncate">{track?.title}</h4>
                <p className="text-sm text-slate-400 truncate">{track?.style}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          >
            {generating ? (
              <>
                <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Variation
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}