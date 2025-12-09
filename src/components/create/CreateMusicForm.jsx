import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Wand2, Music, ChevronDown, ChevronUp, Plus, X, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateMusicForm({ onSubmit, isLoading, disabled, limitReached, remainingGenerations }) {
  const [mode, setMode] = useState('simple'); // 'simple' or 'advanced'
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [vocalGender, setVocalGender] = useState('male');
  const [lyricsMode, setLyricsMode] = useState('manual');
  const [weirdness, setWeirdness] = useState([50]);
  const [styleInfluence, setStyleInfluence] = useState([50]);
  const [excludeStyles, setExcludeStyles] = useState(false);
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showStyles, setShowStyles] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const quickStyles = [
    'pop', 'rock', 'hip hop', 'electronic', 'jazz', 'classical',
    'r&b', 'country', 'indie', 'rap', 'techno', 'trap melodic',
    'heavy sound', 'tribal grooves', 'rhythmic complexity', 'happy music'
  ];

  const inspirationTags = [
    'rap rock', 'r&b', 'techno', 'indie rock', 'reggae', 'blues',
    'folk', 'metal', 'punk', 'disco', 'funk', 'soul'
  ];

  const handleStyleToggle = (tag) => {
    const styles = style.split(',').map(s => s.trim()).filter(Boolean);
    if (styles.includes(tag)) {
      setStyle(styles.filter(s => s !== tag).join(', '));
    } else {
      setStyle([...styles, tag].join(', '));
    }
  };

  const handleGenerateLyrics = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a song description first');
      return;
    }

    setGeneratingLyrics(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate song lyrics based on this description: "${prompt}". 
        Make them creative, emotional, and suitable for music. 
        Format: Verse, Chorus, Verse, Chorus, Bridge, Chorus structure.
        Keep it concise and impactful.`,
        add_context_from_internet: false,
      });

      setLyrics(response);
      toast.success('Lyrics generated!');
    } catch (error) {
      toast.error('Failed to generate lyrics');
    } finally {
      setGeneratingLyrics(false);
    }
  };

  const handleCorrectPrompt = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description first');
      return;
    }

    setGeneratingLyrics(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Improve this song description to be more creative and detailed for AI music generation: "${prompt}". 
        Keep it concise but evocative. Return only the improved description.`,
        add_context_from_internet: false,
      });

      setPrompt(response);
      toast.success('Description improved!');
    } catch (error) {
      toast.error('Failed to improve description');
    } finally {
      setGeneratingLyrics(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (mode === 'simple') {
      if (!prompt.trim()) {
        toast.error('Please describe your song');
        return;
      }
      onSubmit({
        prompt: prompt,
        style: style || 'AI Generated',
        title: title || 'Untitled Track',
        is_instrumental: isInstrumental,
      });
    } else {
      if (!lyrics.trim() && !isInstrumental) {
        toast.error('Please provide lyrics or enable instrumental mode');
        return;
      }
      onSubmit({
        prompt: lyrics || prompt,
        style: style || 'AI Generated',
        title: title || 'Untitled Track',
        is_instrumental: isInstrumental,
      });
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header with Tabs */}
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">{remainingGenerations} credits</span>
          </div>
          <div className="text-xs text-slate-500">v5</div>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('simple')}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              mode === 'simple'
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => setMode('advanced')}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              mode === 'advanced'
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {mode === 'simple' ? (
          <>
            {/* Simple Mode: Song Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-300">Song Description</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCorrectPrompt}
                  disabled={generatingLyrics || !prompt.trim()}
                  className="h-7 text-xs text-violet-400 hover:text-violet-300"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  AI Improve
                </Button>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the song you want to create..."
                className="bg-slate-800 border-slate-700 text-white min-h-[120px] resize-none"
                disabled={disabled || isLoading}
              />
            </div>

            {/* Audio/Lyrics/Instrumental Row */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <Plus className="h-3 w-3 mr-1" />
                Audio
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowLyrics(!showLyrics)}
                className="border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <Plus className="h-3 w-3 mr-1" />
                Lyrics
              </Button>
              <button
                type="button"
                onClick={() => setIsInstrumental(!isInstrumental)}
                className={cn(
                  "ml-auto px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isInstrumental
                    ? "bg-slate-700 text-white"
                    : "bg-slate-800/50 text-slate-400 hover:text-white"
                )}
              >
                Instrumental
              </button>
            </div>

            {/* Lyrics Section (Expandable) */}
            <AnimatePresence>
              {showLyrics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-300">Lyrics</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleGenerateLyrics}
                      disabled={generatingLyrics}
                      className="h-7 text-xs text-violet-400 hover:text-violet-300"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Generate
                    </Button>
                  </div>
                  <Textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Write lyrics or generate with AI..."
                    className="bg-slate-800 border-slate-700 text-white min-h-[100px] text-sm"
                    disabled={disabled || isLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inspiration Tags */}
            <div>
              <Label className="text-slate-300 mb-3 block">Inspiration</Label>
              <div className="flex flex-wrap gap-2">
                {inspirationTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleStyleToggle(tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                      style.includes(tag)
                        ? "bg-slate-700 border-slate-600 text-white"
                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600"
                    )}
                  >
                    <Plus className="h-3 w-3 inline mr-1" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Advanced Mode: Lyrics */}
            <div>
              <button
                type="button"
                onClick={() => setShowLyrics(!showLyrics)}
                className="flex items-center justify-between w-full mb-2"
              >
                <Label className="text-slate-300 cursor-pointer">Lyrics</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateLyrics();
                    }}
                    disabled={generatingLyrics}
                    className="h-7 text-xs text-violet-400 hover:text-violet-300"
                  >
                    <Wand2 className="h-3 w-3" />
                  </Button>
                  {showLyrics ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>
              <AnimatePresence>
                {showLyrics && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <Textarea
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      placeholder="Write some lyrics or a prompt — or leave blank for instrumental"
                      className="bg-slate-800 border-slate-700 text-white min-h-[120px] text-sm resize-none"
                      disabled={disabled || isLoading}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Styles Section */}
            <div>
              <button
                type="button"
                onClick={() => setShowStyles(!showStyles)}
                className="flex items-center justify-between w-full mb-2"
              >
                <Label className="text-slate-300 cursor-pointer">Styles</Label>
                {showStyles ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              <AnimatePresence>
                {showStyles && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3"
                  >
                    <Input
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      placeholder="rap hiphop, heavy sound, tribal grooves, rhythmic complexity, filmstep"
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                      disabled={disabled || isLoading}
                    />
                    <div className="flex flex-wrap gap-2">
                      {quickStyles.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleStyleToggle(tag)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs transition-all",
                            style.includes(tag)
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                          )}
                        >
                          <Plus className="h-3 w-3 inline mr-1" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Advanced Options */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center justify-between w-full mb-2"
              >
                <Label className="text-slate-300 cursor-pointer">Advanced Options</Label>
                {showAdvancedOptions ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              <AnimatePresence>
                {showAdvancedOptions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4"
                  >
                    {/* Exclude Styles Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExcludeStyles(!excludeStyles)}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center",
                          excludeStyles ? "bg-cyan-500 border-cyan-500" : "border-slate-600"
                        )}
                      >
                        {excludeStyles && <X className="h-3 w-3 text-white" />}
                      </button>
                      <span className="text-sm text-slate-400">Exclude styles</span>
                    </div>

                    {/* Vocal Gender */}
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 flex items-center gap-2">
                        Vocal Gender
                        <span className="text-xs text-slate-500">ⓘ</span>
                      </Label>
                      <div className="flex gap-2">
                        {['male', 'female'].map((gender) => (
                          <button
                            key={gender}
                            type="button"
                            onClick={() => setVocalGender(gender)}
                            className={cn(
                              "flex-1 px-3 py-2 rounded-lg text-sm transition-all",
                              vocalGender === gender
                                ? "bg-slate-700 text-white"
                                : "bg-slate-800/50 text-slate-400 hover:text-white"
                            )}
                          >
                            {gender.charAt(0).toUpperCase() + gender.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lyrics Mode */}
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 flex items-center gap-2">
                        Lyrics Mode
                        <span className="text-xs text-slate-500">ⓘ</span>
                      </Label>
                      <div className="flex gap-2">
                        {['manual', 'auto'].map((lmode) => (
                          <button
                            key={lmode}
                            type="button"
                            onClick={() => setLyricsMode(lmode)}
                            className={cn(
                              "flex-1 px-3 py-2 rounded-lg text-sm transition-all",
                              lyricsMode === lmode
                                ? "bg-slate-700 text-white"
                                : "bg-slate-800/50 text-slate-400 hover:text-white"
                            )}
                          >
                            {lmode.charAt(0).toUpperCase() + lmode.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Weirdness Slider */}
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          Weirdness
                          <span className="text-xs text-slate-500">ⓘ</span>
                        </span>
                        <span className="text-xs text-slate-400">{weirdness[0]}%</span>
                      </Label>
                      <Slider
                        value={weirdness}
                        onValueChange={setWeirdness}
                        max={100}
                        step={1}
                        className="cursor-pointer"
                      />
                    </div>

                    {/* Style Influence Slider */}
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          Style Influence
                          <span className="text-xs text-slate-500">ⓘ</span>
                        </span>
                        <span className="text-xs text-slate-400">{styleInfluence[0]}%</span>
                      </Label>
                      <Slider
                        value={styleInfluence}
                        onValueChange={setStyleInfluence}
                        max={100}
                        step={1}
                        className="cursor-pointer"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Song Title */}
            <div>
              <Label className="text-slate-300 text-sm mb-2 flex items-center gap-2">
                <Music className="h-3 w-3" />
                Song Title (Optional)
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Track"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={disabled || isLoading}
              />
            </div>
          </>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={disabled || isLoading || limitReached}
          className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-pink-600 hover:from-orange-600 hover:via-pink-600 hover:to-pink-700 text-white font-medium py-6 rounded-xl"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : limitReached ? (
            'Daily Limit Reached'
          ) : (
            <>
              <Music className="h-4 w-4 mr-2" />
              Create
            </>
          )}
        </Button>

        {limitReached && (
          <p className="text-xs text-red-400 text-center">
            You've reached your daily limit. Upgrade for more generations.
          </p>
        )}
      </form>
    </div>
  );
}