// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/exportClient';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Music, Disc } from 'lucide-react';
import { toast } from 'sonner';

export default function StemSeparationDialog({ track, open, onClose }) {
  const [separating, setSeparating] = useState(false);

  // Fetch existing separations
  const { data: separations = [], refetch } = useQuery({
    queryKey: ['stemSeparations', track?.id],
    queryFn: async () => {
      if (!track?.id) return [];
      return await base44.entities.StemSeparation.filter({ track_id: track.id }, '-created_date', 10);
    },
    enabled: !!track?.id && open,
  });

  const handleSeparate = async (type) => {
    if (!track?.task_id || !track?.external_audio_id) {
      toast.error('Track missing required IDs');
      return;
    }

    setSeparating(true);
    try {
      const response = await base44.functions.invoke('separateVocals', {
        taskId: track.task_id,
        audioId: track.external_audio_id,
        trackId: track.id,
        type,
      });

      if (response.data.success) {
        toast.success('Stem separation started', {
          description: 'This may take a minute...',
        });
        // Poll for updates
        pollSeparationStatus(response.data.taskId);
      } else {
        toast.error('Separation failed');
      }
    } catch (error) {
      console.error('Separation error:', error);
      toast.error('Failed to start separation');
    } finally {
      setSeparating(false);
    }
  };

  const pollSeparationStatus = async (taskId) => {
    let attempts = 0;
    const maxAttempts = 40; // 2 minutes max

    const poll = async () => {
      attempts++;
      
      try {
        await refetch();
        const seps = await base44.entities.StemSeparation.filter({ task_id: taskId });
        
        if (seps.length > 0 && seps[0].status === 'ready') {
          toast.success('Stem separation complete!');
          return;
        } else if (seps.length > 0 && seps[0].status === 'failed') {
          toast.error('Stem separation failed');
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          toast.error('Separation timeout - check back later');
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };

    poll();
  };

  const downloadStem = (url, name) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track.title}_${name}.mp3`;
    a.click();
  };

  const latestSeparation = separations[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Disc className="h-5 w-5 text-violet-400" />
            Stem Separation
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Separate your track into individual stems for remixing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Separation Options */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleSeparate('separate_vocal')}
              disabled={separating}
              className="h-24 flex-col gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              {separating ? (
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              ) : (
                <Music className="h-6 w-6 text-violet-400" />
              )}
              <div className="text-center">
                <p className="font-semibold">2-Stem Split</p>
                <p className="text-xs text-slate-400">Vocals + Instrumental</p>
              </div>
            </Button>

            <Button
              onClick={() => handleSeparate('split_stem')}
              disabled={separating}
              className="h-24 flex-col gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              {separating ? (
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              ) : (
                <Disc className="h-6 w-6 text-pink-400" />
              )}
              <div className="text-center">
                <p className="font-semibold">12-Stem Split</p>
                <p className="text-xs text-slate-400">All Instruments</p>
              </div>
            </Button>
          </div>

          {/* Results */}
          {latestSeparation && latestSeparation.status === 'ready' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-300">Available Stems</h4>
              
              <div className="grid grid-cols-2 gap-2">
                {latestSeparation.vocal_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadStem(latestSeparation.vocal_url, 'Vocals')}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Vocals
                  </Button>
                )}
                {latestSeparation.instrumental_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadStem(latestSeparation.instrumental_url, 'Instrumental')}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Instrumental
                  </Button>
                )}
                {latestSeparation.drums_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadStem(latestSeparation.drums_url, 'Drums')}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Drums
                  </Button>
                )}
                {latestSeparation.bass_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadStem(latestSeparation.bass_url, 'Bass')}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Bass
                  </Button>
                )}
                {latestSeparation.guitar_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadStem(latestSeparation.guitar_url, 'Guitar')}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Guitar
                  </Button>
                )}
                {latestSeparation.keyboard_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadStem(latestSeparation.keyboard_url, 'Keyboard')}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Keyboard
                  </Button>
                )}
                {latestSeparation.strings_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadStem(latestSeparation.strings_url, 'Strings')}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Strings
                  </Button>
                )}
                {latestSeparation.synth_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadStem(latestSeparation.synth_url, 'Synth')}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Synth
                  </Button>
                )}
              </div>
            </div>
          )}

          {latestSeparation && latestSeparation.status === 'pending' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto mb-3" />
              <p className="text-slate-400">Processing stems...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}