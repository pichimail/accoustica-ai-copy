import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import TrackCard from '@/components/tracks/TrackCard';
import ViewToggle from '@/components/ui/ViewToggle';
import { Sparkles, TrendingUp, Heart, Clock, Zap, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ForYouPage() {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [recommendations, setRecommendations] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  // Fetch user's listening history
  const { data: userTracks = [] } = useQuery({
    queryKey: ['userTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Track.filter(
        { created_by: user.email },
        '-created_date',
        50
      );
    },
    enabled: !!user?.email,
  });

  // Fetch liked tracks
  const { data: likedTracks = [] } = useQuery({
    queryKey: ['likedTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const likes = await base44.entities.TrackLike.filter({
        user_email: user.email,
        type: 'like'
      });
      return likes;
    },
    enabled: !!user?.email,
  });

  // Fetch public tracks for recommendations
  const { data: allTracks = [], isLoading } = useQuery({
    queryKey: ['allPublicTracks'],
    queryFn: async () => {
      return await base44.entities.Track.filter(
        { is_public: true, status: 'ready' },
        '-plays',
        100
      );
    },
  });

  // Generate AI recommendations
  const generateRecommendations = async () => {
    setIsAnalyzing(true);
    try {
      const userStyles = [...new Set(userTracks.map(t => t.style).filter(Boolean))];
      const likedStyles = [...new Set(likedTracks.map(l => l.track_id))];
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this user's music preferences and recommend tracks from the available list.
        
User's created styles: ${userStyles.join(', ') || 'None yet'}
User has ${userTracks.length} tracks and ${likedTracks.length} liked tracks
Available tracks styles: ${[...new Set(allTracks.slice(0, 20).map(t => t.style))].join(', ')}

Recommend track IDs that match the user's taste. Consider:
- Similar styles/genres
- Trending tracks (high play counts)
- Popular tracks they haven't heard
- Diverse recommendations to expand their taste

Return a list of 10-15 track IDs from the available tracks.`,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_ids: {
              type: "array",
              items: { type: "string" }
            },
            reasoning: { type: "string" }
          }
        }
      });

      const recommended = allTracks.filter(t => 
        response.recommended_ids.includes(t.id)
      );
      
      setRecommendations(recommended);
      toast.success('Personalized feed updated!');
    } catch (error) {
      // Fallback: trending + random
      const trending = allTracks
        .filter(t => t.plays > 0)
        .sort((a, b) => (b.plays || 0) - (a.plays || 0))
        .slice(0, 15);
      setRecommendations(trending);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (allTracks.length > 0 && user) {
      generateRecommendations();
    }
  }, [allTracks.length, user?.email]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 pb-32">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-violet-400" />
                For You
              </h1>
              <p className="text-slate-400 mt-2">
                Personalized recommendations based on your taste
              </p>
            </div>
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
          </div>
        </motion.div>

        {/* Recommendation Categories */}
        <div className="space-y-8">
          {/* AI Curated */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-violet-400" />
                AI Curated For You
              </h2>
              {isAnalyzing && <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />}
            </div>
            <div className={viewMode === 'list' ? 'space-y-3' : 'grid md:grid-cols-2 lg:grid-cols-3 gap-4'}>
              {recommendations.slice(0, 6).map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  showActions={false}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </section>

          {/* Trending Now */}
          <section>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-pink-400" />
              Trending Now
            </h2>
            <div className={viewMode === 'list' ? 'space-y-3' : 'grid md:grid-cols-2 lg:grid-cols-3 gap-4'}>
              {allTracks
                .filter(t => t.plays > 0)
                .sort((a, b) => (b.plays || 0) - (a.plays || 0))
                .slice(0, 6)
                .map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    showActions={false}
                    viewMode={viewMode}
                  />
                ))}
            </div>
          </section>

          {/* Recently Added */}
          <section>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-blue-400" />
              Recently Added
            </h2>
            <div className={viewMode === 'list' ? 'space-y-3' : 'grid md:grid-cols-2 lg:grid-cols-3 gap-4'}>
              {allTracks.slice(0, 6).map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  showActions={false}
                  viewMode={viewMode}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}