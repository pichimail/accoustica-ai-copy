// @ts-nocheck
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/exportClient';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import { User, Plus, Trash2, Wand2, X } from 'lucide-react';
import BottomSheet from '@/components/mobile/BottomSheet';

export default function PersonaManager({ open, onClose, user }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newPersona, setNewPersona] = useState({ name: '', description: '' });
  const queryClient = useQueryClient();

  const { data: personas = [] } = useQuery({
    queryKey: ['personas', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Persona.filter({ created_by: user.email });
    },
    enabled: !!user?.email && open,
  });

  const createPersonaMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('generatePersona', {
        name: data.name,
        description: data.description,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast.success('Persona created!');
      haptics.success();
      setIsCreating(false);
      setNewPersona({ name: '', description: '' });
    },
    onError: () => {
      toast.error('Failed to create persona');
      haptics.error();
    },
  });

  const deletePersonaMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Persona.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast.success('Persona deleted');
    },
  });

  const handleCreatePersona = () => {
    if (!newPersona.name.trim() || !newPersona.description.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    createPersonaMutation.mutate(newPersona);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="AI Personas" snapPoints={[0.9]}>
      <div className="space-y-6 pb-6">
        {/* Info */}
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/20">
          <h3 className="font-semibold text-indigo-300 mb-1">Sound Profiles</h3>
          <p className="text-sm text-slate-400">
            Create unique AI personas with distinct musical characteristics
          </p>
        </div>

        {/* Create New Persona */}
        {!isCreating ? (
          <Button
            onClick={() => {
              haptics.light();
              setIsCreating(true);
            }}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Persona
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">New Persona</h4>
              <button
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Input
              placeholder="Persona Name (e.g., 'Blues Master')"
              value={newPersona.name}
              onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <Textarea
              placeholder="Describe the musical characteristics (e.g., 'A gritty blues guitarist with soulful, expressive playing')"
              value={newPersona.description}
              onChange={(e) => setNewPersona({ ...newPersona, description: e.target.value })}
              className="bg-slate-900 border-slate-700 text-white min-h-[100px]"
            />
            <Button
              onClick={handleCreatePersona}
              disabled={createPersonaMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {createPersonaMutation.isPending ? (
                <>
                  <Wand2 className="h-4 w-4 mr-2 animate-pulse" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Persona
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Existing Personas */}
        <div className="space-y-3">
          <h4 className="text-slate-300 font-medium">Your Personas</h4>
          {personas.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <User className="h-12 w-12 mx-auto mb-3 text-slate-600" />
              <p>No personas yet</p>
              <p className="text-sm mt-1">Create your first AI persona to get started</p>
            </div>
          ) : (
            <AnimatePresence>
              {personas.map((persona, i) => (
                <motion.div
                  key={persona.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <h5 className="font-semibold text-white">{persona.name}</h5>
                          </div>
                          <p className="text-sm text-slate-400 mb-2">{persona.description}</p>
                          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                            {persona.persona_id}
                          </Badge>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            haptics.light();
                            deletePersonaMutation.mutate(persona.id);
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}