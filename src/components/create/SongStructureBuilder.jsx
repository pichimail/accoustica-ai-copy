import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, GripVertical, Sparkles, Music2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

const sectionTemplates = {
  intro: { name: 'Intro', duration: '8-16 bars', description: 'Opening section to set the mood' },
  verse: { name: 'Verse', duration: '16 bars', description: 'Main storytelling section' },
  prechorus: { name: 'Pre-Chorus', duration: '8 bars', description: 'Build-up to the chorus' },
  chorus: { name: 'Chorus', duration: '16 bars', description: 'Main hook and memorable part' },
  bridge: { name: 'Bridge', duration: '8-16 bars', description: 'Contrast section before final chorus' },
  outro: { name: 'Outro', duration: '8-16 bars', description: 'Ending section' },
  breakdown: { name: 'Breakdown', duration: '8 bars', description: 'Minimal instrumentation' },
  drop: { name: 'Drop', duration: '16 bars', description: 'High-energy climax' },
};

const genreTemplates = {
  pop: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'],
  rock: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'],
  'hip hop': ['intro', 'verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus', 'outro'],
  edm: ['intro', 'verse', 'chorus', 'breakdown', 'drop', 'verse', 'drop', 'outro'],
  ballad: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'],
  jazz: ['intro', 'verse', 'verse', 'bridge', 'verse', 'outro'],
};

export default function SongStructureBuilder({ open, onOpenChange, onApply, genre }) {
  const [structure, setStructure] = useState([]);
  const [customInstructions, setCustomInstructions] = useState('');

  const suggestStructure = () => {
    const genreKey = genre?.toLowerCase() || 'pop';
    const template = genreTemplates[genreKey] || genreTemplates.pop;
    
    const suggested = template.map((sectionKey, index) => ({
      id: `${sectionKey}-${index}`,
      type: sectionKey,
      ...sectionTemplates[sectionKey],
      notes: '',
    }));
    
    setStructure(suggested);
    toast.success('Structure suggested based on genre!');
  };

  const addSection = (type) => {
    const newSection = {
      id: `${type}-${Date.now()}`,
      type,
      ...sectionTemplates[type],
      notes: '',
    };
    setStructure([...structure, newSection]);
  };

  const removeSection = (id) => {
    setStructure(structure.filter(s => s.id !== id));
  };

  const updateSectionNotes = (id, notes) => {
    setStructure(structure.map(s => s.id === id ? { ...s, notes } : s));
  };

  const handleApply = () => {
    if (structure.length === 0) {
      toast.error('Please add at least one section');
      return;
    }

    const structureText = structure
      .map(s => `${s.name}: ${s.notes || 'Default ' + s.description.toLowerCase()}`)
      .join('\n');

    const fullPrompt = `Song Structure:\n${structureText}\n\n${customInstructions}`;
    
    onApply(fullPrompt);
    onOpenChange(false);
    toast.success('Song structure applied!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-slate-900 border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Music2 className="h-5 w-5 text-violet-400" />
            Song Structure Builder
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Design your song's structure section by section for better control
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Suggestion */}
          <div className="flex items-center gap-3 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">AI Structure Suggestion</div>
              <div className="text-xs text-slate-400">Based on {genre || 'pop'} genre</div>
            </div>
            <Button
              onClick={suggestStructure}
              variant="outline"
              className="border-violet-500/50 text-violet-400 hover:bg-violet-500/20"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Suggest
            </Button>
          </div>

          {/* Quick Add Sections */}
          <div>
            <label className="text-sm font-medium text-white mb-2 block">Add Sections</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(sectionTemplates).map(([key, template]) => (
                <button
                  key={key}
                  onClick={() => addSection(key)}
                  className="p-2 rounded-lg border border-slate-700 bg-slate-800/30 hover:border-violet-500 hover:bg-violet-500/10 transition-all text-xs text-white"
                >
                  <Plus className="h-3 w-3 mx-auto mb-1" />
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Structure List */}
          {structure.length > 0 && (
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Current Structure ({structure.length} sections)
              </label>
              <div className="space-y-2">
                {structure.map((section, index) => (
                  <div
                    key={section.id}
                    className="group p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="h-4 w-4 text-slate-600 cursor-move" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">
                              {index + 1}. {section.name}
                            </span>
                            <span className="text-xs text-slate-500">{section.duration}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{section.description}</div>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeSection(section.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={section.notes}
                      onChange={(e) => updateSectionNotes(section.id, e.target.value)}
                      placeholder={`Notes for ${section.name} (optional)...`}
                      className="mt-2 min-h-[60px] bg-slate-900/50 border-slate-700 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Instructions */}
          <div>
            <label className="text-sm font-medium text-white mb-2 block">Additional Instructions</label>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Any specific transitions, mood changes, or production notes..."
              className="min-h-[80px] bg-slate-800/50 border-slate-700"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleApply}
              disabled={structure.length === 0}
              className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
            >
              <Music2 className="h-4 w-4 mr-2" />
              Apply Structure
            </Button>
            <Button
              onClick={() => setStructure([])}
              variant="outline"
              className="border-slate-700"
            >
              Clear
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}