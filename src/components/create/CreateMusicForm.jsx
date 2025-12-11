import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Wand2, Music, ChevronDown, ChevronUp, Plus, X, Sparkles, Upload, Dices } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import SongStructureBuilder from './SongStructureBuilder';
import AudioUploader from './AudioUploader';
import { haptics } from '@/components/utils/haptics';

export default function CreateMusicForm({ onSubmit, isLoading, disabled, limitReached, remainingGenerations }) {
  const [mode, setMode] = useState('simple'); // 'simple', 'custom', or 'instrumental'
  const [model, setModel] = useState('V5');
  const [prompt, setPrompt] = useState('');
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
      return { prompt: 200 };
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
      const response = await base44.integrations.Core.InvokeLLM({
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
      const response = await base44.integrations.Core.InvokeLLM({
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

            {/* Inspiration Tags - Single Line Slider (Simple Mode only) */}
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">Style Tags</Label>
              <div className="relative">
                <div className="flex gap-2 overflow-x-auto pb-2 inspiration-scrollbar">
                  {inspirationTags.map((tag) => {
                    const isSelected = style.split(',').map(s => s.trim()).includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          handleInspirationClick(tag);
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-medium transition-all border whitespace-nowrap backdrop-blur-xl flex-shrink-0",
                          isSelected
                            ? "bg-gradient-to-r from-violet-500/30 to-pink-500/30 border-violet-400/50 text-white shadow-lg"
                            : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-violet-300 hover:border-violet-500/30 hover:bg-violet-500/10"
                        )}
                      >
                        {isSelected ? (
                          <X className="h-3 w-3 inline mr-1" />
                        ) : (
                          <Plus className="h-3 w-3 inline mr-1" />
                        )}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
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

        {/* Old sections removed - keeping only submit button below */}
        {mode === 'simple' && (
          <>
            {/* Genre Fusion (Simple Mode Only) */}
            <div>
              <Label className="text-slate-300 mb-2 block text-sm">Genre Fusion (AI Blend)</Label>
              <div className="flex flex-wrap gap-2">
                {genreFusionOptions.map((genre) => {
                  const isSelected = genreFusion.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setGenreFusion(prev => 
                          isSelected 
                            ? prev.filter(g => g !== genre)
                            : prev.length < 3 ? [...prev, genre] : prev
                        );
                      }}
                      disabled={!isSelected && genreFusion.length >= 3}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                        isSelected
                          ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400/50 text-white"
                          : genreFusion.length >= 3
                          ? "bg-slate-800/30 border-slate-700 text-slate-600 cursor-not-allowed"
                          : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30"
                      )}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">Select up to 3 genres to blend</p>
            </div>
          </>
        )}

        {mode === 'simple' && (
          <>
            {/* AI Parameters (Simple Mode Only) */}
            <div className="space-y-4 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl p-4 border border-blue-500/10">
              <Label className="text-blue-300 font-medium">AI Generation Parameters</Label>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-slate-300 text-sm">Creativity Level</Label>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                    {creativityLevel[0]}%
                  </Badge>
                </div>
                <Slider
                  value={creativityLevel}
                  onValueChange={setCreativityLevel}
                  max={100}
                  step={10}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Safe</span>
                  <span>Experimental</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-slate-300 text-sm">Complexity Level</Label>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                    {complexityLevel[0]}%
                  </Badge>
                </div>
                <Slider
                  value={complexityLevel}
                  onValueChange={setComplexityLevel}
                  max={100}
                  step={10}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Simple</span>
                  <span>Complex</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-slate-300 text-sm">Variations to Generate</Label>
                  <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30 text-xs">
                    {variationCount}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setVariationCount(count);
                      }}
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                        variationCount === count
                          ? "bg-pink-500/20 text-pink-300 border-pink-400/50"
                          : "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-pink-500/30"
                      )}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">Generate multiple variations at once</p>
              </div>
            </div>
          </>
        )}

        {/* Remove old advanced mode sections - everything between line 596 and 957 */}
        {/* Old instrumental toggle/lyrics sections removed */}
        {mode === 'simple' && (
          <>
            {/* Auto-generate Lyrics Toggle */}
            {!isInstrumental && mode === 'simple' && (
              <div className="flex items-center justify-between bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl p-4 border border-violet-500/20">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                  <div>
                    <Label className="text-violet-300 font-medium">AI Lyric Generation</Label>
                    <p className="text-xs text-slate-400 mt-0.5">Auto-generate lyrics from your prompt</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setAutoGenerateLyrics(!autoGenerateLyrics);
                  }}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    autoGenerateLyrics ? "bg-violet-500" : "bg-slate-700"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all",
                    autoGenerateLyrics ? "left-6" : "left-0.5"
                  )} />
                </button>
              </div>
            )}
          </>
        )}

        {mode === 'simple' && (
          <>
            {/* Audio Upload for Style Transfer */}
            <AnimatePresence>
              {showAudioUpload && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2"
                >
                  <Label className="text-slate-300 text-sm">Audio Style Transfer</Label>
                    <AudioUploader
                      onAnalysisComplete={(analysis) => {
                        setAudioAnalysis(analysis);
                        // Pre-fill form fields with AI analysis
                        if (analysis) {
                          const styleSuggestion = [
                            analysis.genre,
                            analysis.mood,
                            ...(analysis.style_tags || [])
                          ].filter(Boolean).join(', ');
                          
                          setStyle(styleSuggestion);
                          
                          // Generate a detailed prompt based on analysis
                          const autoPrompt = `Create a ${analysis.genre} track with ${analysis.mood} mood, ${analysis.tempo} BPM, in the key of ${analysis.key}. Energy level: ${analysis.energy_level}/10. ${analysis.instruments ? 'Featuring: ' + analysis.instruments + '.' : ''} ${analysis.vocal_style !== 'instrumental' ? 'Vocals: ' + analysis.vocal_style : 'Instrumental only'}`;
                          
                          if (!prompt) {
                            setPrompt(autoPrompt);
                          }
                          
                          toast.success('Analysis applied to form!');
                        }
                      }}
                      onStyleTransfer={(url, analysis) => {
                        toast.success('Style will be transferred to your track!');
                      }}
                    />
                </motion.div>
              )}
            </AnimatePresence>
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