// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/exportClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PersonaCreator({ track, open, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!track?.task_id || !track?.external_audio_id) {
      toast.error('Track missing required IDs');
      return;
    }

    setIsCreating(true);
    try {
      const response = await base44.functions.invoke('generatePersona', {
        taskId: track.task_id,
        audioId: track.external_audio_id,
        name: name.trim(),
        description: description.trim(),
      });

      if (response.data.success) {
        // Save persona to database
        await base44.entities.Persona.create({
          persona_id: response.data.personaId,
          name: name.trim(),
          description: description.trim(),
          task_id: track.task_id,
          audio_id: track.external_audio_id,
          track_id: track.id,
        });

        toast.success('Persona created successfully!', {
          description: `Created persona: ${name}`,
        });
        onSuccess?.();
        onClose();
        setName('');
        setDescription('');
      } else {
        toast.error(response.data.error || 'Failed to create persona');
      }
    } catch (error) {
      console.error('Persona creation error:', error);
      toast.error(error.message || 'Failed to create persona');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-violet-400" />
            Create Persona
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a reusable persona from this track's style
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Persona Name</label>
            <Input
              placeholder="e.g., Electronic Pop Singer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Description</label>
            <Textarea
              placeholder="Describe the musical characteristics, style, and personality..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-white min-h-32"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || !description.trim()}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Persona...
              </>
            ) : (
              'Create Persona'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}