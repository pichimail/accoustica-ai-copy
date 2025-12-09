import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import MobileCreateForm from '@/components/create/MobileCreateForm';
import GeneratingStatus from '@/components/tracks/GeneratingStatus';
import TrackCard from '@/components/tracks/TrackCard';
import AudioPlayer from '@/components/audio/AudioPlayer';
import BottomNav from '@/components/mobile/BottomNav';
import { Music, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreatePage() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const queryClient = useQueryClient();

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    fetchUser();
  }, []);

  // Fetch user's plan
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.Plan.list(),
  });

  useEffect(() => {
    if (user?.plan_id && plans.length > 0) {
      const plan = plans.find(p => p.id === user.plan_id);
      setUserPlan(plan);
    } else if (plans.length > 0) {
      // Default to free plan
      const freePlan = plans.find(p => p.name.toLowerCase() === 'free');
      setUserPlan(freePlan || plans[0]);
    }
  }, [user, plans]);

  // Fetch recent tracks
  const { data: recentTracks = [] } = useQuery({
    queryKey: ['recentTracks'],
    queryFn: async () => {
      const tracks = await base44.entities.Track.filter(
        { created_by: user?.email },
        '-created_date',
        5
      );
      return tracks;
    },
    enabled: !!user?.email,
    refetchInterval: (data) => {
      // Refetch every 5 seconds if any track is generating
      const hasGenerating = Array.isArray(data) && data.some(t => t.status === 'generating' || t.status === 'queued');
      return hasGenerating ? 5000 : false;
    },
  });

  // Create track mutation
  const createTrackMutation = useMutation({
    mutationFn: async (data) => {
      // Check daily limit
      const today = new Date().toISOString().split('T')[0];
      const dailyUsage = user?.last_usage_reset === today ? (user?.daily_usage || 0) : 0;
      const dailyLimit = userPlan?.daily_limit || 5;

      if (dailyUsage >= dailyLimit) {
        throw new Error('Daily generation limit reached');
      }

      // Update user usage first
      await base44.auth.updateMe({
        daily_usage: dailyUsage + 1,
        last_usage_reset: today,
        monthly_usage: (user?.monthly_usage || 0) + 1,
        total_tracks: (user?.total_tracks || 0) + 1,
        last_active: new Date().toISOString(),
      });

      // Call backend function to generate music with Suno API (v5 model)
      const response = await base44.functions.invoke('generateMusic', {
        prompt: data.prompt,
        style: data.style,
        title: data.title,
        instrumental: data.is_instrumental || false,
        model_version: 'v5',
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to start generation');
      }

      // Poll for status updates
      const taskId = response.data.taskId;
      pollMusicStatus(taskId);

      return track;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentTracks'] });
      toast.success('Generation started!', {
        description: 'Your track is being created...',
      });
    },
    onError: (error) => {
      toast.error('Generation failed', {
        description: error.message,
      });
    },
  });

  // Poll music generation status
  const pollMusicStatus = async (taskId) => {
    const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)
    let attempts = 0;
    let hasShownFirstTrack = false;

    const poll = async () => {
      try {
        attempts++;

        const statusResponse = await base44.functions.invoke('checkMusicStatus', {
          taskId,
        });

        if (statusResponse.data.success) {
          const updatedTracks = statusResponse.data.tracks || [];

          // Show progress for first track that's still generating
          const generatingTrack = updatedTracks.find(t => t.status === 'generating' || t.status === 'queued');
          if (generatingTrack) {
            setCurrentTrack(generatingTrack);
          }

          // Check if all tracks are ready
          const allReady = updatedTracks.length > 0 && updatedTracks.every(t => t.status === 'ready');
          const anyFailed = updatedTracks.some(t => t.status === 'failed');

          if (allReady) {
            queryClient.invalidateQueries({ queryKey: ['recentTracks'] });
            toast.success(`${updatedTracks.length} tracks generated successfully!`);
            setCurrentTrack(null);
            return;
          } else if (anyFailed) {
            queryClient.invalidateQueries({ queryKey: ['recentTracks'] });
            const failedCount = updatedTracks.filter(t => t.status === 'failed').length;
            toast.error(`${failedCount} track(s) failed to generate`);
            setCurrentTrack(null);
            return;
          }

          // Show notification when first track completes
          if (!hasShownFirstTrack && updatedTracks.some(t => t.status === 'ready')) {
            hasShownFirstTrack = true;
            toast.success('First track ready! Generating second track...');
            queryClient.invalidateQueries({ queryKey: ['recentTracks'] });
          }
        }

        // Continue polling if not finished and under max attempts
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000); // Poll every 3 seconds for faster updates
        } else {
          toast.error('Generation timeout - check your library later');
          setCurrentTrack(null);
        }
      } catch (error) {
        console.error('Error polling status:', error);
        toast.error('Failed to check generation status');
        setCurrentTrack(null);
      }
    };

    // Start polling
    poll();
  };

  const handlePlay = (track) => {
    setPlayingTrack(track);
  };

  const handleToggleVisibility = async (track) => {
    await base44.entities.Track.update(track.id, {
      is_public: !track.is_public,
    });
    queryClient.invalidateQueries({ queryKey: ['recentTracks'] });
    toast.success(track.is_public ? 'Track is now private' : 'Track is now public');
  };

  const handleDelete = async (track) => {
    await base44.entities.Track.delete(track.id);
    queryClient.invalidateQueries({ queryKey: ['recentTracks'] });
    if (playingTrack?.id === track.id) {
      setPlayingTrack(null);
    }
    toast.success('Track deleted');
  };

  const handleToggleFavorite = async (track) => {
    await base44.entities.Track.update(track.id, {
      is_favorite: !track.is_favorite,
    });
    queryClient.invalidateQueries({ queryKey: ['recentTracks'] });
    toast.success(track.is_favorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const dailyUsage = user?.last_usage_reset === new Date().toISOString().split('T')[0] 
    ? (user?.daily_usage || 0) 
    : 0;
  const dailyLimit = userPlan?.daily_limit || 5;
  const remainingGenerations = Math.max(0, dailyLimit - dailyUsage);
  const limitReached = remainingGenerations <= 0;

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-black">
        <AnimatePresence mode="wait">
          {currentTrack && currentTrack.status !== 'ready' ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-screen flex items-center justify-center p-6"
            >
              <div className="w-full max-w-md">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 animate-pulse"></div>
                    <Loader2 className="absolute inset-0 m-auto h-12 w-12 text-white animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Creating Your Track</h2>
                  <p className="text-gray-400">This usually takes 30-60 seconds</p>
                </div>
                <GeneratingStatus status={currentTrack.status} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-screen"
            >
              <MobileCreateForm
                onSubmit={(data) => createTrackMutation.mutate(data)}
                isLoading={createTrackMutation.isPending}
                disabled={currentTrack?.status === 'generating'}
                limitReached={limitReached}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <BottomNav />
      </div>

      {/* Desktop View - Keep existing design */}
      <div className="hidden md:block min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold text-white mb-4">
              Create Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-pink-500 to-red-500">Music</span>
            </h1>
            <p className="text-gray-400 text-lg">
              Transform your ideas into professional-quality music with AI
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <AnimatePresence mode="wait">
                {currentTrack && currentTrack.status !== 'ready' ? (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8"
                  >
                    <GeneratingStatus status={currentTrack.status} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <MobileCreateForm
                      onSubmit={(data) => createTrackMutation.mutate(data)}
                      isLoading={createTrackMutation.isPending}
                      disabled={currentTrack?.status === 'generating'}
                      limitReached={limitReached}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Music className="h-5 w-5" />
                Recent Tracks
              </h2>
              <div className="space-y-4">
                {recentTracks.length === 0 ? (
                  <div className="bg-white/5 rounded-2xl p-8 text-center border border-white/10">
                    <Music className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No tracks yet</p>
                  </div>
                ) : (
                  recentTracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      onPlay={handlePlay}
                      onDelete={handleDelete}
                      onToggleVisibility={handleToggleVisibility}
                      onToggleFavorite={handleToggleFavorite}
                      showActions={true}
                      isPlaying={playingTrack?.id === track.id}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Player */}
      <AnimatePresence>
        {playingTrack && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-white/10 p-4"
          >
            <AudioPlayer
              src={playingTrack.audio_url || playingTrack.stream_audio_url}
              title={playingTrack.title}
              artist={playingTrack.style}
              coverImage={playingTrack.cover_image_url}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}