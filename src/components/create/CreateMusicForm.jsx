import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Wand2, Music, ChevronDown, ChevronUp, Plus, X, Sparkles, Upload, Dices } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import SongStructureBuilder from './SongStructureBuilder';
import AudioUploader from './AudioUploader';
import { haptics } from '@/components/utils/haptics';
import { hasFeatureAccess, getUserPlanTier, getUpgradeRequirement, FEATURE_TIERS } from '@/lib/premium-features';
import UpgradeModal from '@/components/premium/UpgradeModal';

export default function CreateMusicForm({ onSubmit, isLoading, disabled, limitReached, remainingGenerations, initialPrompt = '' }) {
  const [user, setUser] = useState(null);
  const [userTier, setUserTier] = useState(FEATURE_TIERS.FREE);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeRequirement, setUpgradeRequirement] = useState(null);

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

  // Fetch user and their plan tier
  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      if (userData) {
        setUser(userData);
        const tier = await getUserPlanTier(userData);
        setUserTier(tier);
      }
    };
    fetchUser();
  }, []);

  React.useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  const modelOptions = [
    { value: 'V5', label: 'V5 (latest)' },
    { value: 'V4_5PLUS', label: 'V4.5 Plus' },
    { value: 'V4_5', label: 'V4.5' },
    { value: 'V4', label: 'V4 (legacy)' },
  ];

  const quickStyles = [
    'pop', 'rock', 'hip hop', 'electronic', 'jazz', 'classical',
    'r&b', 'country', 'indie', 'rap', 'techno', 'trap melodic',
    'heavy sound', 'tribal grooves', 'rhythmic complexity', 'happy music'
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

  // Check if user has access to a feature and show upgrade modal if not
  const checkFeatureAccess = async (featureName) => {
    if (!user) return false;

    const hasAccess = await hasFeatureAccess(user, featureName);
    if (!hasAccess) {
      const requirement = getUpgradeRequirement(featureName);
      setUpgradeRequirement(requirement);
      setShowUpgradeModal(true);
      haptics.error();
      return false;
    }
    return true;
  };

  // Handle mode change with plan checks
  const handleModeChange = async (newMode) => {
    if (newMode === 'custom') {
      const canUseCustom = await checkFeatureAccess('custom_mode');
      if (!canUseCustom) return;
    } else if (newMode === 'instrumental') {
      const canUseInstrumental = await checkFeatureAccess('instrumental_mode');
      if (!canUseInstrumental) return;
    }
    setMode(newMode);
    haptics.selection();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    haptics.medium();

    // Check plan access based on mode
    if (mode === 'custom') {
      const canUseCustom = await checkFeatureAccess('custom_mode');
      if (!canUseCustom) return;
    } else if (mode === 'instrumental') {
      const canUseInstrumental = await checkFeatureAccess('instrumental_mode');
      if (!canUseInstrumental) return;
    }

    // Check advanced features access
    if (showAdvancedOptions) {
      const canUseAdvanced = await checkFeatureAccess('advanced_parameters');
      if (!canUseAdvanced) return;
    }

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
    <div className="glass-surface rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-slate-300" />
            <span className="text-sm text-slate-300">{remainingGenerations} credits</span>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 glass-surface p-1 rounded-full">
          <button
            type="button"
            onClick={() => handleModeChange('simple')}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              mode === 'simple'
                ? "bg-white/20 text-white"
                : "text-slate-300 hover:text-white"
            )}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('custom')}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all relative",
              mode === 'custom'
                ? "bg-white/20 text-white"
                : "text-slate-300 hover:text-white"
            )}
          >
            Custom
            {userTier === FEATURE_TIERS.FREE && (
              <Crown className="h-3 w-3 text-violet-400 absolute top-1 right-1" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('instrumental')}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all relative",
              mode === 'instrumental'
                ? "bg-white/20 text-white"
                : "text-slate-300 hover:text-white"
            )}
          >
            Instrumental
          </button>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-300">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="bg-slate-800/60 border-slate-700 text-slate-200">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                {modelOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-slate-200">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-slate-500 leading-relaxed self-end">
            Options: V5, V4_5PLUS, V4_5, V4
          </div>
        </div>

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
                className="min-h-[100px] resize-none hover:border-violet-500/30 focus:border-violet-500/50 transition-all"
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
                className="min-h-[150px] resize-none"
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
                className="min-h-[80px] text-sm resize-none"
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
                        : "glass-surface text-slate-300 hover:text-white"
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
                                ? "bg-white/20 text-white"
                                : "glass-surface text-slate-300 hover:text-white"
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
                className="min-h-[100px] resize-none"
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
                        : "glass-surface text-slate-300 hover:text-white"
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

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        requiredTier={upgradeRequirement?.tier}
        featureName={upgradeRequirement?.feature}
        currentTier={userTier}
      />
    </div>
  );
}
