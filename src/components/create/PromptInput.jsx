import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Music, Wand2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { motion } from 'framer-motion';

const genres = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Blues', 'Reggae', 'Metal', 'Folk', 'Indie', 'Soul',
  'Funk', 'Ambient', 'Lo-Fi', 'Cinematic', 'World Music'
];

const moods = [
  'Happy', 'Sad', 'Energetic', 'Calm', 'Romantic', 'Dark',
  'Uplifting', 'Melancholic', 'Aggressive', 'Dreamy', 'Nostalgic'
];

export default function PromptInput({
  onSubmit,
  isLoading,
  disabled,
  limitReached,
  remainingGenerations
}) {
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customMode, setCustomMode] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || disabled) return;
    
    onSubmit({
      prompt: prompt.trim(),
      title: title.trim() || `Untitled Track`,
      style: style || 'Pop',
      is_instrumental: isInstrumental,
      custom_mode: customMode,
    });
  };

  const handleQuickStyle = (newStyle) => {
    setStyle(prev => {
      if (prev.includes(newStyle)) {
        return prev.replace(newStyle, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
      }
      return prev ? `${prev}, ${newStyle}` : newStyle;
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
          <Wand2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Create Music</h2>
          <p className="text-sm text-slate-400">Describe your track and we'll generate it</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Title Input */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-slate-300">Track Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your track a name..."
            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
            maxLength={80}
          />
        </div>

        {/* Main Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="prompt" className="text-slate-300">
              {isInstrumental ? 'Description' : 'Lyrics / Description'}
            </Label>
            <span className="text-xs text-slate-500">{prompt.length}/3000</span>
          </div>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isInstrumental 
              ? "Describe the music you want to create... e.g., 'A peaceful piano melody with soft strings, perfect for relaxation'"
              : "Write your lyrics or describe your song... e.g., 'An upbeat pop song about summer adventures with a catchy chorus'"
            }
            className="min-h-[140px] bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500 resize-none"
            maxLength={3000}
          />
        </div>

        {/* Style/Genre */}
        <div className="space-y-2">
          <Label htmlFor="style" className="text-slate-300">Style / Genre</Label>
          <Input
            id="style"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="e.g., Pop, Upbeat, Happy, Female vocals"
            className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-violet-500"
            maxLength={200}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {genres.slice(0, 8).map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => handleQuickStyle(genre)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  style.includes(genre)
                    ? "bg-violet-500 text-white"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                )}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Instrumental Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Music className="h-5 w-5 text-violet-400" />
            <div>
              <p className="text-sm font-medium text-white">Instrumental Only</p>
              <p className="text-xs text-slate-400">Generate music without vocals</p>
            </div>
          </div>
          <Switch
            checked={isInstrumental}
            onCheckedChange={setIsInstrumental}
          />
        </div>

        {/* Advanced Options */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between text-slate-400 hover:text-white hover:bg-slate-700/50"
            >
              Advanced Options
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Mood</Label>
                <Select onValueChange={(val) => handleQuickStyle(val)}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                    <SelectValue placeholder="Select mood" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {moods.map((mood) => (
                      <SelectItem key={mood} value={mood} className="text-slate-300 focus:text-white focus:bg-slate-700">
                        {mood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Additional Genre</Label>
                <Select onValueChange={(val) => handleQuickStyle(val)}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {genres.map((genre) => (
                      <SelectItem key={genre} value={genre} className="text-slate-300 focus:text-white focus:bg-slate-700">
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Submit Button */}
        <div className="pt-2">
          {limitReached ? (
            <div className="text-center p-4 bg-red-500/10 rounded-xl border border-red-500/30">
              <p className="text-red-400 font-medium">Daily limit reached</p>
              <p className="text-slate-400 text-sm mt-1">Upgrade your plan for more generations</p>
            </div>
          ) : (
            <>
              <Button
                type="submit"
                disabled={!prompt.trim() || isLoading || disabled}
                className="w-full h-12 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white font-semibold rounded-xl"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Music
                  </>
                )}
              </Button>
              {remainingGenerations !== undefined && (
                <p className="text-center text-xs text-slate-500 mt-2">
                  {remainingGenerations} generations remaining today
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </motion.form>
  );
}