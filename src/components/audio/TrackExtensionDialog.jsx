import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, Wand2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import BottomSheet from '@/components/mobile/BottomSheet';
import { cn } from '@/lib/utils';

const sectionTypes = [
  { id: 'intro', label: 'Intro', color: 'from-blue-500 to-cyan-500' },
  { id: 'verse', label: 'Verse', color: 'from-purple-500 to-pink-500' },
  { id: 'chorus', label: 'Chorus', color: 'from-orange-500 to-red-500' },
  { id: 'bridge', label: 'Bridge', color: 'from-green-500 to-emerald-500' },
  { id: 'outro', label: 'Outro', color: 'from-indigo-500 to-violet-500' },
];

export default function TrackExtensionDialog({ open, onClose, track, onSuccess }) {
  const [selectedSection, setSelectedSection] = useState(null);
  const [extensionPrompt, setExtensionPrompt] = useState('');
  const [isExtending, setIsExtending] = useState(false);

  const handleExtend = async () => {
    if (!extensionPrompt.trim()) {
      toast.error('Please describe how to extend the track');
      return;
    }

    setIsExtending(true);
    haptics.medium();
    try {
      const response = await base44.functions.invoke('extendMusic', {
        audio_id: track.external_audio_id,
        prompt: extensionPrompt,
        continue_at: selectedSection?.id || 'end',
      });

      if (response.data.success) {
        toast.success('Track extension started!');
        haptics.success();
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      toast.error('Extension failed');
      haptics.error();
    } finally {
      setIsExtending(false);
    }
  };

  const quickPrompts = [
    'Build to a dramatic climax',
    'Add a melodic bridge section',
    'Create an energetic outro',
    'Extend with a softer breakdown',
    'Add instrumental solo section',
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Extend & Arrange" snapPoints={[0.9]}>
      <div className="space-y-6 pb-6">
        {/* Info Banner */}
        <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl p-4 border border-violet-500/20">
          <h3 className="font-semibold text-violet-300 mb-1">AI Track Extension</h3>
          <p className="text-sm text-slate-400">
            Intelligently extend your track with AI-generated sections
          </p>
        </div>

        {/* Section Selection */}
        <div>
          <label className="text-slate-300 font-medium mb-3 block">Add Section After:</label>
          <div className="grid grid-cols-3 gap-3">
            {sectionTypes.map((section) => (
              <motion.button
                key={section.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  haptics.selection();
                  setSelectedSection(section);
                }}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all",
                  selectedSection?.id === section.id
                    ? `bg-gradient-to-br ${section.color} border-white/50`
                    : "bg-slate-800/50 border-slate-700 hover:border-violet-500/30"
                )}
              >
                <p className={cn(
                  "font-medium text-sm",
                  selectedSection?.id === section.id ? "text-white" : "text-slate-400"
                )}>
                  {section.label}
                </p>
              </motion.button>
            ))}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                haptics.selection();
                setSelectedSection({ id: 'end', label: 'End' });
              }}
              className={cn(
                "p-3 rounded-xl border-2 transition-all",
                selectedSection?.id === 'end'
                  ? "bg-gradient-to-br from-pink-500 to-rose-500 border-white/50"
                  : "bg-slate-800/50 border-slate-700 hover:border-violet-500/30"
              )}
            >
              <p className={cn(
                "font-medium text-sm",
                selectedSection?.id === 'end' ? "text-white" : "text-slate-400"
              )}>
                At End
              </p>
            </motion.button>
          </div>
        </div>

        {/* Extension Instructions */}
        <div>
          <label className="text-slate-300 font-medium mb-2 block">Extension Instructions</label>
          <Textarea
            value={extensionPrompt}
            onChange={(e) => setExtensionPrompt(e.target.value)}
            placeholder="Describe how you want to extend the track..."
            className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
          />
        </div>

        {/* Quick Prompts */}
        <div>
          <label className="text-slate-400 text-sm mb-2 block">Quick Suggestions:</label>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, i) => (
              <Badge
                key={i}
                onClick={() => {
                  haptics.light();
                  setExtensionPrompt(prompt);
                }}
                className="cursor-pointer bg-slate-800 text-slate-300 hover:bg-violet-500/20 hover:text-violet-300 border-slate-700 hover:border-violet-500/30"
              >
                {prompt}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleExtend}
          disabled={isExtending || !extensionPrompt.trim()}
          className="w-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 h-12 text-base font-semibold"
        >
          {isExtending ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Extending Track...
            </>
          ) : (
            <>
              <ArrowRight className="h-5 w-5 mr-2" />
              Extend Track
            </>
          )}
        </Button>
      </div>
    </BottomSheet>
  );
}