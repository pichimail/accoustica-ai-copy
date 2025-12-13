import React, { useState } from 'react';
import ViewToggle from '@/components/ui/ViewToggle';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { User, Users, Plus, Search, Sparkles, Music, Wand2, Trash2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import PersonaCreator from '@/components/audio/PersonaCreator';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';

export default function PersonasHubPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreator, setShowCreator] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const queryClient = useQueryClient();

  const { data: personas = [], isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: () => base44.entities.Persona.list('-created_date'),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['tracks'],
    queryFn: () => base44.entities.Track.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (personaId) => base44.entities.Persona.delete(personaId),
    onSuccess: () => {
      queryClient.invalidateQueries(['personas']);
      toast.success('Persona deleted successfully!');
      haptics.success();
    },
  });

  const filteredPersonas = personas.filter(persona =>
    persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    persona.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (persona) => {
    if (confirm(`Are you sure you want to delete "${persona.name}"?`)) {
      haptics.medium();
      deleteMutation.mutate(persona.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">AI Personas Hub</h1>
              <p className="text-slate-400 text-sm">Create and manage your musical AI personas</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{personas.length}</p>
                  <p className="text-xs text-slate-400">Active Personas</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Music className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{tracks.length}</p>
                  <p className="text-xs text-slate-400">Source Tracks</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">∞</p>
                  <p className="text-xs text-slate-400">Unlimited Creation</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search and Create Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-col md:flex-row gap-4"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search personas..."
              className="pl-10 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
          <Button
            onClick={() => {
              haptics.medium();
              setShowCreator(true);
            }}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Persona
          </Button>
        </motion.div>

        {/* Personas Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPersonas.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-slate-800/20 rounded-xl border border-slate-700/50"
          >
            <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">
              {searchQuery ? 'No personas found' : 'No personas yet'}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first AI musical persona'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => {
                  haptics.medium();
                  setShowCreator(true);
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Persona
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPersonas.map((persona, index) => {
              const sourceTrack = tracks.find(t => t.id === persona.track_id);
              return (
                <motion.div
                  key={persona.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-slate-800/40 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden hover:border-amber-500/50 transition-all"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                        <User className="h-7 w-7 text-white" />
                      </div>
                      <button
                        onClick={() => handleDelete(persona)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">{persona.name}</h3>
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{persona.description}</p>

                    {sourceTrack && (
                      <div className="flex items-center gap-2 mb-4 p-2 bg-slate-900/50 rounded-lg">
                        <Music className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-500">Source Track</p>
                          <p className="text-sm text-white truncate">{sourceTrack.title}</p>
                        </div>
                      </div>
                    )}

                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Persona
                    </Badge>

                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <p className="text-xs text-slate-500">
                        Created {new Date(persona.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Persona Creator Modal */}
      <PersonaCreator
        open={showCreator}
        onClose={() => setShowCreator(false)}
        onSuccess={() => {
          queryClient.invalidateQueries(['personas']);
          setShowCreator(false);
        }}
      />
    </div>
  );
}