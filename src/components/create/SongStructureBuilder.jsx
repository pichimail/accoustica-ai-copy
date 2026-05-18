import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, GripVertical, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const structureTemplates = {
  pop: ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Chorus', 'Outro'],
  rock: ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Guitar Solo', 'Chorus', 'Outro'],
  hiphop: ['Intro', 'Verse', 'Hook', 'Verse', 'Hook', 'Verse', 'Hook', 'Outro'],
  edm: ['Build', 'Drop', 'Break', 'Build', 'Drop', 'Outro'],
  ballad: ['Intro', 'Verse', 'Chorus', 'Verse', 'Chorus', 'Bridge', 'Final Chorus', 'Outro'],
};

export default function SongStructureBuilder({ onApply, genre = 'pop' }) {
  const [sections, setSections] = useState([
    { id: 1, type: 'Verse', duration: 16 },
    { id: 2, type: 'Chorus', duration: 16 },
  ]);
  const [generating, setGenerating] = useState(false);

  const sectionTypes = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Solo', 'Break', 'Drop', 'Build', 'Hook', 'Outro'];

  const addSection = () => {
    setSections([...sections, { id: Date.now(), type: 'Verse', duration: 16 }]);
  };

  const removeSection = (id) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id, field, value) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const applyTemplate = (templateName) => {
    const template = structureTemplates[templateName];
    if (template) {
      const newSections = template.map((type, index) => ({
        id: Date.now() + index,
        type,
        duration: type === 'Intro' || type === 'Outro' ? 8 : 16,
      }));
      setSections(newSections);
      toast.success(`Applied ${templateName} template`);
    }
  };

  const generateAISuggestion = async () => {
    setGenerating(true);
    try {
      const { llmService } = await import('@/services/llmService');
      const response = await llmService.invoke({
        prompt: `Suggest an optimal song structure for a ${genre} song. Provide a JSON array with sections like: [{"type": "Intro", "duration": 8}, {"type": "Verse", "duration": 16}, ...]. Keep it between 6-10 sections total. Return ONLY the JSON array.`,
        response_json_schema: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  duration: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (response.sections) {
        setSections(response.sections.map((s, i) => ({ ...s, id: Date.now() + i })));
        toast.success('AI structure applied!');
      }
    } catch (error) {
      toast.error('Failed to generate AI suggestion');
    } finally {
      setGenerating(false);
    }
  };

  const getTotalDuration = () => {
    return sections.reduce((sum, s) => sum + (s.duration || 0), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Song Structure</h3>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={generateAISuggestion}
            disabled={generating}
            className="h-7 text-xs text-violet-400 hover:text-violet-300"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI Suggest
          </Button>
          <span className="text-xs text-slate-500">{getTotalDuration()}s</span>
        </div>
      </div>

      {/* Templates */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(structureTemplates).map((template) => (
          <button
            key={template}
            type="button"
            onClick={() => applyTemplate(template)}
            className="px-2 py-1 rounded-lg text-xs bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all"
          >
            {template}
          </button>
        ))}
      </div>

      {/* Sections List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-2"
            >
              <GripVertical className="h-4 w-4 text-slate-600" />
              <span className="text-xs text-slate-500 w-6">{index + 1}</span>
              <select
                value={section.type}
                onChange={(e) => updateSection(section.id, 'type', e.target.value)}
                className="flex-1 bg-slate-700 text-white text-xs rounded px-2 py-1.5 border border-slate-600"
              >
                {sectionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Input
                type="number"
                value={section.duration}
                onChange={(e) => updateSection(section.id, 'duration', parseInt(e.target.value) || 8)}
                className="w-16 bg-slate-700 border-slate-600 text-white text-xs h-8"
                min="4"
                max="64"
              />
              <span className="text-xs text-slate-500">s</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeSection(section.id)}
                className="h-7 w-7 text-slate-400 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Button
        type="button"
        onClick={addSection}
        variant="outline"
        size="sm"
        className="w-full border-slate-700 text-slate-400 hover:bg-slate-800"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Section
      </Button>

      <Button
        type="button"
        onClick={() => onApply(sections)}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white"
      >
        Apply Structure
      </Button>
    </div>
  );
}