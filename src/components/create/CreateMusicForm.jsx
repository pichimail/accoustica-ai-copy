import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Wand2, Music, ChevronDown, ChevronUp, Plus, Dices } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';

export default function CreateMusicForm({ onSubmit, isLoading, disabled, limitReached, remainingGenerations, initialPrompt = '' }) {
  const [mode, setMode] = useState('simple'); // 'simple', 'custom', or 'instrumental'
  const [model, setModel] = useState('V5');
  const [prompt, setPrompt] = useState(initialPrompt);
  const [lyrics, setLyrics] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [vocalGender, setVocalGender] = useState('m');
  const [lyricsMode, setLyricsMode] = useState('manual');
  const [weirdness, setWeirdness] = useState([50]);
  const [styleInfluence, setStyleInfluence] = useState([50]);
  const [excludeStyles, setExcludeStyles] = useState(false);
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showStyles, setShowStyles] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [songStructure, setSongStructure] = useState(null);
  const [audioAnalysis, setAudioAnalysis] = useState(null);
  const [generatingRandom, setGeneratingRandom] = useState(false);
  const [selectedInspiration, setSelectedInspiration] = useState(null);
  const [musicKey, setMusicKey] = useState('');
  const [bpm, setBpm] = useState([120]);
  const [energyLevel, setEnergyLevel] = useState([5]);
  const [variationMode, setVariationMode] = useState(false);
  const [baseTrackId, setBaseTrackId] = useState(null);
  const [creativityLevel, setCreativityLevel] = useState([50]);
  const [complexityLevel, setComplexityLevel] = useState([50]);
  const [genreFusion, setGenreFusion] = useState([]);
  const [variationCount, setVariationCount] = useState(1);
  const [autoGenerateLyrics, setAutoGenerateLyrics] = useState(false);

  React.useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const quickStyles = [
    'pop', 'rock', 'hip hop', 'electronic', 'jazz', 'classical',
    'r&b', 'country', 'indie', 'rap', 'techno', 'trap melodic',
    'heavy sound', 'tribal grooves', 'rhythmic complexity', 'happy music'
  ];

  const models = [
    { value: 'V5', label: 'V5', desc: 'Superior musical expression, faster' },
    { value: 'V4_5PLUS', label: 'V4.5+', desc: 'Richer sound, max 8 min' },
    { value: 'V4_5', label: 'V4.5', desc: 'Smarter prompts, max 8 min' },
    { value: 'V4_5ALL', label: 'V4.5 All', desc: 'Smarter prompts, max 8 min' },
    { value: 'V4', label: 'V4', desc: 'Improved vocals, max 4 min' },
  ];

  const musicalKeys = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
    'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'
  ];

  // Character limits based on model
  const getCharLimits = () => {
    if (mode === 'simple') {
      return { prompt: 500 };
    }
    if (model === 'V4') {
      return { prompt: 3000, style: 200, title: 80 };
    }
    return { prompt: 5000, style: 1000, title: 80 };
  };

  const inspirationTags = [
    'rap rock', 'r&b', 'techno', 'indie rock', 'reggae', 'blues',
    'folk', 'metal', 'punk', 'disco', 'funk', 'soul'
  ];

  const genreFusionOptions = [
    'pop', 'rock', 'hip hop', 'electronic', 'jazz', 'classical',
    'r&b', 'country', 'indie', 'latin', 'afrobeat', 'k-pop'
  ];

  const handleStyleToggle = (tag) => {
    const styles = style.split(',').map(s => s.trim()).filter(Boolean);
    if (styles.includes(tag)) {
      setStyle(styles.filter(s => s !== tag).join(', '));
    } else {
      setStyle([...styles, tag].join(', '));
    }
  };

  const handleInspirationClick = (tag) => {
    const styles = style.split(',').map(s => s.trim()).filter(Boolean);
    
    if (styles.includes(tag)) {
      // Remove tag from style
      setStyle(styles.filter(s => s !== tag).join(', '));
    } else {
      // Add tag to style
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
      const { llmService } = await import('@/services/llmService');
      const response = await llmService.invoke({
        prompt: `Generate song lyrics that match this song description: "${prompt}". 
        Style: ${style || 'Any style'}
        Make them creative, emotional, and suitable for the described theme and style. 
        Format: Verse, Chorus, Verse, Chorus, Bridge, Chorus structure.
        Keep it concise and impactful.`,
        add_context_from_internet: false,
      });

      setLyrics(response);
      toast.success('Lyrics generated based on description!');
    } catch (error) {
      toast.error('Failed to generate lyrics');
    } finally {
      setGeneratingLyrics(false);
    }
  };

  const handleRandomDescription = async () => {
    setGeneratingRandom(true);
    try {
      const { llmService } = await import('@/services/llmService');
      const response = await llmService.invoke({
        prompt: `Generate a short, creative song concept for AI music generation (like Suno.com style). Just describe the type of song, mood, and style in 1-2 sentences. NO LYRICS. Examples: "An upbeat pop song with electronic beats and summer vibes" or "A melancholic jazz ballad with piano and soft vocals". Return only the description.`,
        add_context_from_internet: false,
      });

      setPrompt(response);
      toast.success('Random song concept generated!');
    } catch (error) {
      toast.error('Failed to generate concept');
    } finally {
      setGeneratingRandom(false);
    }
  };

  const handleCorrectPrompt = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description first');
      return;
    }

    setGeneratingLyrics(true);
    try {
      const { llmService } = await import('@/services/llmService');
      const response = await llmService.invoke({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    haptics.medium();

    const limits = getCharLimits();

    // Validation based on mode
    if (mode === 'simple') {
      if (!prompt.trim()) {
        toast.error('Please describe your song');
        return;
      }
      if (prompt.length > limits.prompt) {
        toast.error(`Description must be under ${limits.prompt} characters`);
        return;
      }
    } else if (mode === 'custom') {
      if (!prompt.trim()) {
        toast.error('Please provide lyrics');
        return;
      }
      if (!style.trim()) {
        toast.error('Please specify a music style');
        return;
      }
      if (!title.trim()) {
        toast.error('Please provide a title');
        return;
      }
      if (prompt.length > limits.prompt) {
        toast.error(`Lyrics must be under ${limits.prompt} characters`);
        return;
      }
      if (style.length > limits.style) {
        toast.error(`Style must be under ${limits.style} characters`);
        return;
      }
      if (title.length > limits.title) {
        toast.error(`Title must be under ${limits.title} characters`);
        return;
      }
    } else if (mode === 'instrumental') {
      if (!style.trim()) {
        toast.error('Please specify a music style');
        return;
      }
      if (!title.trim()) {
        toast.error('Please provide a title');
        return;
      }
      if (style.length > limits.style) {
        toast.error(`Style must be under ${limits.style} characters`);
        return;
      }
      if (title.length > limits.title) {
        toast.error(`Title must be under ${limits.title} characters`);
        return;
      }
    }
    
    const baseData = {
      mode: mode,
      model: model,
      prompt: mode === 'custom' ? prompt : (mode === 'simple' ? prompt : ''),
      style: mode !== 'simple' ? style : '',
      title: mode !== 'simple' ? title : '',
      customMode: mode !== 'simple',
      instrumental: mode === 'instrumental',
      vocalGender: vocalGender,
      weirdness: weirdness[0] / 100,
      styleInfluence: styleInfluence[0] / 100,
    };

    onSubmit(baseData);
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header with Model & Tabs */}
      <div className="border-b border-slate-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">{remainingGenerations} credits</span>
          </div>
          
          {/* Model Selector */}
          <div className="relative">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="appearance-none bg-slate-800/50 border border-slate-700 text-white text-xs px-3 py-1.5 pr-8 rounded-lg cursor-pointer hover:border-violet-500/30 transition-all"
            >
              {models.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label} - {m.desc}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setMode('simple');
            }}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              mode === 'simple'
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setMode('custom');
            }}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              mode === 'custom'
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            Custom
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setMode('instrumental');
            }}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              mode === 'instrumental'
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            )}
          >
            Instrumental
          </button>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {mode === 'simple' ? (
          <>
            {/* Simple Mode: Song Description */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-300">Prompt</Label>
                <span className="text-xs text-slate-500">{prompt.length}/{getCharLimits().prompt}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRandomDescription}
                    disabled={generatingRandom}
                    className="h-7 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                    title="Generate random description"
                  >
                    <motion.div
                      animate={generatingRandom ? { rotate: 360 } : {}}
                      transition={{ duration: 0.6, repeat: generatingRandom ? Infinity : 0, ease: "linear" }}
                    >
                      <Dices className="h-3 w-3" />
                    </motion.div>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleCorrectPrompt}
                    disabled={generatingLyrics || !prompt.trim()}
                    className="h-7 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    AI Improve
                  </Button>
                </div>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your music in a few words..."
                maxLength={getCharLimits().prompt}
                className="bg-slate-800/50 backdrop-blur-xl border-slate-700 text-white min-h-[100px] resize-none hover:border-violet-500/30 focus:border-violet-500/50 transition-all"
                disabled={disabled || isLoading}
              />
            </div>

          </>
        ) : mode === 'custom' ? (
          <>
            {/* Custom Mode: Lyrics (Prompt) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-300">Custom Prompt (Lyrics)</Label>
                <span className="text-xs text-slate-500">{prompt.length}/{getCharLimits().prompt}</span>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Write your lyrics here..."
                maxLength={getCharLimits().prompt}
                className="bg-slate-800/50 border-slate-700 text-white min-h-[150px] resize-none"
                disabled={disabled || isLoading}
              />
            </div>

            {/* Style */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-300">Style</Label>
                <span className="text-xs text-slate-500">{style.length}/{getCharLimits().style}</span>
              </div>
              <Textarea
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g., pop / female singer / synthwave / dark / Jazz..."
                maxLength={getCharLimits().style}
                className="bg-slate-800/50 border-slate-700 text-white min-h-[80px] text-sm resize-none"
                disabled={disabled || isLoading}
              />
              <div className="flex flex-wrap gap-2 mt-2">
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
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-300">Title</Label>
                <span className="text-xs text-slate-500">{title.length}/{getCharLimits().title}</span>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song Title"
                maxLength={getCharLimits().title}
                className="bg-slate-800/50 border-slate-700 text-white"
                disabled={disabled || isLoading}
              />
            </div>

            {/* Advanced Parameters */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center justify-between w-full mb-2"
              >
                <Label className="text-slate-300 cursor-pointer">Advanced Parameters</Label>
                {showAdvancedOptions ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              <AnimatePresence>
                {showAdvancedOptions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3"
                  >
                    {/* Vocal Gender */}
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 block">Vocal Gender</Label>
                      <div className="flex gap-2">
                        {[{ v: 'm', l: 'Male' }, { v: 'f', l: 'Female' }].map(({ v, l }) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setVocalGender(v)}
                            className={cn(
                              "flex-1 px-3 py-2 rounded-lg text-sm transition-all",
                              vocalGender === v
                                ? "bg-slate-700 text-white"
                                : "bg-slate-800/50 text-slate-400 hover:text-white"
                            )}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Weirdness (0-1) */}
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 flex justify-between">
                        <span>Weirdness Constraint</span>
                        <span className="text-xs text-slate-400">{(weirdness[0] / 100).toFixed(2)}</span>
                      </Label>
                      <Slider
                        value={weirdness}
                        onValueChange={setWeirdness}
                        max={100}
                        step={1}
                        className="cursor-pointer"
                      />
                    </div>

                    {/* Style Weight (0-1) */}
                    <div>
                      <Label className="text-slate-300 text-sm mb-2 flex justify-between">
                        <span>Style Weight</span>
                        <span className="text-xs text-slate-400">{(styleInfluence[0] / 100).toFixed(2)}</span>
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
          </>
        ) : (
          <>
            {/* Instrumental Mode */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-300">Style</Label>
                <span className="text-xs text-slate-500">{style.length}/{getCharLimits().style}</span>
              </div>
              <Textarea
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g., Classical / Piano / Acoustic"
                maxLength={getCharLimits().style}
                className="bg-slate-800/50 border-slate-700 text-white min-h-[100px] resize-none"
                disabled={disabled || isLoading}
              />
              <div className="flex flex-wrap gap-2 mt-2">
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
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-300">Title</Label>
                <span className="text-xs text-slate-500">{title.length}/{getCharLimits().title}</span>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song Title"
                maxLength={getCharLimits().title}
                className="bg-slate-800/50 border-slate-700 text-white"
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