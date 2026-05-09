// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { Sparkles, TrendingUp, Clock, Zap, Loader2, Play, Pause, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import OledBackground from '@/components/audio/OledBackground';

export default function ForYouPage() {
  const [user, setUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: userTracks = [] } = useQuery({
    queryKey: ['userTracks', user?.email],
    queryFn: () => base44.entities.Track.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email
  });

  const { data: allTracks = [], isLoading } = useQuery({
    queryKey: ['allPublicTracks'],
    queryFn: () => base44.entities.Track.filter({ is_public: true, status: 'ready' }, '-plays', 100)
  });

  const generateRecommendations = async () => {
    setIsAnalyzing(true);
    haptics.light();
    try {
      const userStyles = [...new Set(userTracks.map((t) => t.style).filter(Boolean))];
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `User creates music in styles: ${userStyles.join(', ') || 'various'}. From these track IDs, pick 10 that best match their taste: ${allTracks.slice(0, 30).map((t) => t.id).join(',')}`,
        response_json_schema: {
          type: 'object',
          properties: { recommended_ids: { type: 'array', items: { type: 'string' } } }
        }
      });
      const rec = allTracks.filter((t) => res.recommended_ids?.includes(t.id));
      setRecommendations(rec.length ? rec : allTracks.slice(0, 10));
      toast.success('Feed refreshed!');
    } catch {
      setRecommendations(allTracks.slice(0, 10));
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (allTracks.length > 0 && user && recommendations.length === 0) generateRecommendations();
  }, [allTracks.length, user?.email]);

  const trending = [...allTracks].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 8);
  const recent = allTracks.slice(0, 8);

  const sections = [
  { id: 'ai', title: 'AI Picks For You', icon: Zap, color: 'text-violet-400', tracks: recommendations },
  { id: 'trending', title: 'Trending Now', icon: TrendingUp, color: 'text-pink-400', tracks: trending },
  { id: 'recent', title: 'Recently Added', icon: Clock, color: 'text-blue-400', tracks: recent }];


  return (
    <div className="min-h-screen bg-black pb-32 relative">
      <OledBackground intensity={0.6} />
      {/* Header */}
      













      

      {isLoading ?
      <div className="relative z-10 flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        </div> :

      <div className="relative z-10 pb-6">
          {sections.map(({ id, title, icon: Icon, color, tracks }) =>
        <div key={id} className="mt-6">
              <div className="flex items-center gap-2 px-4 mb-3">
                <Icon className={cn('h-4 w-4', color)} />
                <h2 className="text-sm font-semibold text-white">{title}</h2>
                {id === 'ai' && isAnalyzing && <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />}
              </div>

              {/* Horizontal scroll cards */}
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
                {tracks.slice(0, 8).map((track, i) =>
            <HorizontalTrackCard
              key={track.id}
              track={track}
              index={i}
              isCurrentlyPlaying={currentTrack?.id === track.id && isPlaying}
              onPlay={() => {
                haptics.medium();
                base44.entities.Track.update(track.id, { plays: (track.plays || 0) + 1 });
                playTrack(track, tracks);
              }} />

            )}
              </div>
            </div>
        )}
        </div>
      }
    </div>);

}

function HorizontalTrackCard({ track, index, isCurrentlyPlaying, onPlay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      className="flex-shrink-0 w-36">
      
      <button onClick={onPlay} className="relative w-full">
        <div className="w-full aspect-square rounded-xl overflow-hidden bg-white/10 mb-2">
          {track.cover_image_url ?
          <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" /> :

          <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white/20" />
            </div>
          }
          <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
            {isCurrentlyPlaying ? <Pause className="h-8 w-8 text-white" /> : <Play className="h-8 w-8 text-white" />}
          </div>
          {isCurrentlyPlaying &&
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-pink-500 rounded-b-xl" />
          }
        </div>
      </button>
      <p className={cn('text-xs font-medium truncate', isCurrentlyPlaying ? 'text-violet-400' : 'text-white')}>
        {track.title}
      </p>
      <p className="text-[10px] text-white/35 truncate mt-0.5">{track.style || 'Unknown'}</p>
    </motion.div>);

}