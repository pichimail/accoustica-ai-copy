import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, X, Plus, Music, Mic2, Lightbulb, Sparkles, Music2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import SongStructureBuilder from './SongStructureBuilder';

const genres = [
  'rap rock', 'r&b', 'techno', 'indie rock', 'pop', 'metal', 
  'piano', 'bridge', 'ambient', 'jazz', 'folk', 'edm'
];

export default function MobileCreateForm({ onSubmit, isLoading, disabled, limitReached }) {
  const [mode, setMode] = useState('simple');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [styles, setStyles] = useState([]);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState('');
  
  const [expandedSections, setExpandedSections] = useState({
    lyrics: false,
    styles: false,
    advanced: false
  });
  const [showStructureBuilder, setShowStructureBuilder] = useState(false);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const addStyle = (style) => {
    if (!styles.includes(style)) {
      setStyles([...styles, style]);
    }
  };

  const removeStyle = (style) => {
    setStyles(styles.filter(s => s !== style));
  };

  const handleSubmit = () => {
    if ((!description.trim() && !lyrics.trim()) || isLoading || disabled) return;
    
    onSubmit({
      prompt: mode === 'simple' ? description : lyrics,
      title: description.split('\n')[0].slice(0, 50) || 'Untitled',
      style: styles.join(', ') || 'pop',
      is_instrumental: isInstrumental,
      mode: mode,
      model_version: 'v5',
    });
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-400">{limitReached ? 0 : limitReached === false ? '∞' : limitReached}</span>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 rounded-full p-1">
          <button
            onClick={() => setMode('simple')}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              mode === 'simple' ? "bg-white text-black" : "text-gray-400"
            )}
          >
            Simple
          </button>
          <button
            onClick={() => setMode('custom')}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              mode === 'custom' ? "bg-white text-black" : "text-gray-400"
            )}
          >
            Custom
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full">
          <span className="text-xs text-gray-400">v5</span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'simple' ? (
          <div className="p-4">
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Song Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="hip hop song about cats"
                className="min-h-[200px] bg-white/5 border-white/10 text-white resize-none text-base"
                disabled={disabled}
              />
            </div>

            {/* Quick Options */}
            <div className="flex items-center gap-3 mb-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm text-gray-300">
                <Plus className="h-4 w-4" />
                Audio
              </button>
              <button 
                onClick={() => setShowStructureBuilder(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm text-gray-300"
              >
                <Music2 className="h-4 w-4" />
                Structure
              </button>
              <button 
                onClick={() => setIsInstrumental(!isInstrumental)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors",
                  isInstrumental ? "bg-white text-black" : "bg-white/5 text-gray-300"
                )}
              >
                Instrumental
              </button>
            </div>

            {/* Inspiration */}
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Inspiration</label>
              <div className="flex flex-wrap gap-2">
                {genres.slice(0, 6).map((genre) => (
                  <button
                    key={genre}
                    onClick={() => addStyle(genre)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/5 rounded-full text-sm text-gray-300"
                  >
                    <Plus className="h-3 w-3" />
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Quick Actions */}
            <div className="flex items-center gap-3 mb-4">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm text-gray-300">
                <Plus className="h-4 w-4" />
                Audio
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm text-gray-300">
                <Plus className="h-4 w-4" />
                Persona
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm text-gray-300">
                <Plus className="h-4 w-4" />
                Inspo
              </button>
            </div>

            {/* Lyrics Section */}
            <div className="bg-white/5 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection('lyrics')}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  {expandedSections.lyrics ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  <span className="text-white font-medium">Lyrics</span>
                </div>
                <Sparkles className="h-4 w-4 text-gray-400" />
              </button>
              <AnimatePresence>
                {expandedSections.lyrics && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <Textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder="Write some lyrics or a prompt — or leave blank for instrumental"
                      className="min-h-[200px] bg-black/50 border-white/10 text-white resize-none text-base"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Styles Section */}
            <div className="bg-white/5 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection('styles')}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  {expandedSections.styles ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  <span className="text-white font-medium">Styles</span>
                </div>
              </button>
              <AnimatePresence>
                {expandedSections.styles && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    {styles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {styles.map((style) => (
                          <button
                            key={style}
                            onClick={() => removeStyle(style)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-full text-sm text-white"
                          >
                            {style}
                            <X className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {genres.map((genre) => (
                        <button
                          key={genre}
                          onClick={() => addStyle(genre)}
                          disabled={styles.includes(genre)}
                          className={cn(
                            "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors",
                            styles.includes(genre) 
                              ? "bg-white/5 text-gray-600" 
                              : "bg-white/10 text-gray-300 hover:bg-white/20"
                          )}
                        >
                          <Plus className="h-3 w-3" />
                          {genre}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Advanced Options */}
            <div className="bg-white/5 rounded-2xl overflow-hidden">
              <button
                onClick={() => toggleSection('advanced')}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  {expandedSections.advanced ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  <span className="text-white font-medium">Advanced Options</span>
                </div>
                <Sparkles className="h-4 w-4 text-gray-400" />
              </button>
              <AnimatePresence>
                {expandedSections.advanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <Input
                      value={advancedOptions}
                      onChange={(e) => setAdvancedOptions(e.target.value)}
                      placeholder="Exclude: -No EDM/trap drops, -no heavy autotune"
                      className="bg-black/50 border-white/10 text-white text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Instrumental Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
              <span className="text-white font-medium">Instrumental</span>
              <Switch checked={isInstrumental} onCheckedChange={setIsInstrumental} />
            </div>
          </div>
        )}
      </div>

      {/* Song Structure Builder Dialog */}
      <SongStructureBuilder
        open={showStructureBuilder}
        onOpenChange={setShowStructureBuilder}
        onApply={(structurePrompt) => {
          if (mode === 'simple') {
            setDescription(prev => prev + '\n\n' + structurePrompt);
          } else {
            setLyrics(prev => prev + '\n\n' + structurePrompt);
          }
        }}
        genre={styles[0] || 'pop'}
      />

      {/* Bottom Create Button */}
      <div className="p-4 pb-24">
        <Button
          onClick={handleSubmit}
          disabled={isLoading || disabled || limitReached || (!description.trim() && !lyrics.trim())}
          className="w-full h-14 bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 hover:from-orange-600 hover:via-pink-600 hover:to-red-600 text-white text-lg font-semibold rounded-full shadow-lg shadow-pink-500/30 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Creating...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Create
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}