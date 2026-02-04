import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import { Image, RefreshCw, Check, Wand2 } from 'lucide-react';
import BottomSheet from '@/components/mobile/BottomSheet';
import { cn } from '@/lib/utils';

export default function CoverArtGenerator({ open, onClose, track, onSelectCover }) {
  const [generatedCovers, setGeneratedCovers] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedCover, setSelectedCover] = useState(null);

  const generateCovers = async (useCustom = false) => {
    setIsGenerating(true);
    haptics.medium();
    try {
      const prompt = useCustom && customPrompt.trim()
        ? customPrompt
        : `Album cover art for ${track.style} music titled "${track.title}": ${track.prompt}. Modern, artistic, professional.`;

      const response = await base44.integrations.Core.GenerateImage({ prompt });
      
      setGeneratedCovers([...generatedCovers, response.url]);
      toast.success('Cover art generated!');
      haptics.success();
    } catch (error) {
      toast.error('Failed to generate cover art');
      haptics.error();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectCover = async (coverUrl) => {
    try {
      await base44.entities.Track.update(track.id, {
        cover_image_url: coverUrl,
      });
      toast.success('Cover art updated!');
      haptics.success();
      onSelectCover?.(coverUrl);
      onClose();
    } catch (error) {
      toast.error('Failed to update cover');
    }
  };

  const artStyles = [
    'Abstract and colorful',
    'Minimalist and modern',
    'Vintage and retro',
    'Cyberpunk and futuristic',
    'Watercolor and artistic',
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Generate Cover Art" snapPoints={[0.9]}>
      <div className="space-y-6 pb-6">
        {/* Current Cover */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <p className="text-sm text-slate-400 mb-3">Current Cover:</p>
          <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-900">
            <img 
              src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'} 
              alt="Current cover"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Generate Options */}
        <div>
          <p className="text-slate-300 font-medium mb-3">Art Style:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {artStyles.map((style, i) => (
              <Badge
                key={i}
                onClick={() => {
                  haptics.selection();
                  setCustomPrompt(`${track.title} album cover in ${style.toLowerCase()} style`);
                }}
                className="cursor-pointer bg-slate-800 text-slate-300 hover:bg-pink-500/20 hover:text-pink-300 border-slate-700 hover:border-pink-500/30"
              >
                {style}
              </Badge>
            ))}
          </div>

          <Input
            placeholder="Or describe custom art style..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={() => generateCovers(true)}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate AI Cover Art
            </>
          )}
        </Button>

        {/* Generated Covers Grid */}
        {generatedCovers.length > 0 && (
          <div>
            <p className="text-slate-300 font-medium mb-3">Generated Options:</p>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {generatedCovers.map((url, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                      selectedCover === url ? "border-green-500" : "border-slate-700 hover:border-pink-500/50"
                    )}
                    onClick={() => {
                      haptics.light();
                      setSelectedCover(url);
                    }}
                  >
                    <img src={url} alt={`Cover ${i + 1}`} className="w-full h-full object-cover" />
                    {selectedCover === url && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Apply Button */}
        {selectedCover && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              onClick={() => handleSelectCover(selectedCover)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Apply Selected Cover
            </Button>
          </motion.div>
        )}
      </div>
    </BottomSheet>
  );
}