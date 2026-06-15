import React, { useState } from 'react';
import { base44 } from '@/api/exportClient';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { Loader2, Play, Pause, Music,
  ChevronDown, ChevronUp, Layers, Zap
} from 'lucide-react';
import { toast } from 'sonner';

const MASHUP_STYLES = ['Trap Fusion', 'Lo-Fi Blend', 'EDM Mashup', 'Jazz Remix', 'Chill Rework', 'Epic Orchestral Mix', 'Acoustic Cover', 'Hip-Hop Flip'];

export default function MashupRemix({ recentTracks = [], user, onNewTrack }) {
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [mashupStyle, setMashupStyle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  const readyTracks = recentTracks.filter(t => t.status === 'ready');

  const toggleTrack = (t) => {
    setSelectedTracks(prev =>
      prev.find(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t].slice(0, 4)
    );
  };

  const handleMashup = async () => {
    if (selectedTracks.length < 2) { toast.error('Select at least 2 tracks to mashup'); return; }
    setIsGenerating(true);
    try {
      const prompt = `Create a ${mashupStyle || 'creative'} mashup/remix combining the following tracks: ${selectedTracks.map(t => t.title).join(', ')}. ${instructions}`;
      const response = await base44.functions.invoke('generateMusic', {
        mode: 'custom',
        model: 'V5',
        prompt,
        style: selectedTracks.map(t => t.style || 'Pop').join(', '),
        title: `Mashup: ${selectedTracks.map(t => t.title.slice(0, 15)).join(' × ')}`,
        customMode: true,
        instrumental: false,
      });
      if (!response.data.success) throw new Error(response.data.error || 'Failed');
      toast.success('Mashup generating!');
      setSelectedTracks([]);
      setInstructions('');
      onNewTrack?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (readyTracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center">
          <Layers className="h-7 w-7 text-white/20" />
        </div>
        <p className="text-white/30 text-sm">Generate some tracks first to create mashups & remixes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Track selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          Select Tracks to Mix ({selectedTracks.length}/4)
        </label>
        <div className="space-y-2">
          {readyTracks.map(track => {
            const sel = selectedTracks.find(x => x.id === track.id);
            const playing = currentTrack?.id === track.id && isPlaying;
            return (
              <div
                key={track.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl p-3 border transition-all cursor-pointer',
                  sel
                    ? 'bg-violet-500/15 border-violet-500/40'
                    : 'bg-white/[0.03] border-white/[0.06] hover:border-white/20'
                )}
                onClick={() => toggleTrack(track)}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                  {track.cover_image_url
                    ? <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Music className="h-4 w-4 text-white/30" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{track.title}</p>
                  <p className="text-xs text-white/30 truncate">{track.style || 'AI Generated'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); playTrack(track, readyTracks); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 transition-all"
                  >
                    {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                  </button>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                    sel ? 'bg-violet-500 border-violet-500' : 'border-white/20'
                  )}>
                    {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advanced options toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Advanced Options
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Mashup style chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Remix Style</label>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {MASHUP_STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setMashupStyle(mashupStyle === s ? '' : s)}
                    className={cn(
                      'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      mashupStyle === s
                        ? 'bg-pink-500/25 border-pink-500/50 text-pink-300'
                        : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/70'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <textarea
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Additional remix instructions... e.g. make it more upbeat, add heavy bass, slow tempo"
              rows={2}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Mashup button */}
      <button
        onClick={handleMashup}
        disabled={isGenerating || selectedTracks.length < 2}
        className={cn(
          'w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2',
          isGenerating || selectedTracks.length < 2
            ? 'bg-white/[0.06] text-white/30 cursor-not-allowed'
            : 'text-white shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 active:scale-[0.98]'
        )}
        style={!isGenerating && selectedTracks.length >= 2 ? {
          background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
        } : {}}
      >
        {isGenerating ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Generating Mashup…</>
        ) : (
          <><Zap className="h-4 w-4" /> Generate Mashup {selectedTracks.length >= 2 ? `(${selectedTracks.length} tracks)` : ''}</>
        )}
      </button>
    </div>
  );
}