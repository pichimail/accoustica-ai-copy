import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PromptInput from '@/components/create/PromptInput';
import GeneratingStatus from '@/components/tracks/GeneratingStatus';
import TrackCard from '@/components/tracks/TrackCard';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { Button } from "@/components/ui/button";
import { ArrowRight, Music, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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

      // Call backend function to generate music with Suno API
      const response = await base44.functions.invoke('generateMusic', {
        prompt: data.prompt,
        style: data.style,
        title: data.title,
        instrumental: data.is_instrumental || false,
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

  const dailyUsage = user?.last_usage_reset === new Date().toISOString().split('T')[0] 
    ? (user?.daily_usage || 0) 
    : 0;
  const dailyLimit = userPlan?.daily_limit || 5;
  const remainingGenerations = Math.max(0, dailyLimit - dailyUsage);
  const limitReached = remainingGenerations <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Create Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">Music</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Transform your ideas into professional-quality music with AI
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            <PromptInput
              onSubmit={(data) => createTrackMutation.mutate(data)}
              isLoading={createTrackMutation.isPending}
              disabled={currentTrack?.status === 'generating'}
              limitReached={limitReached}
              remainingGenerations={remainingGenerations}
            />

            {/* Generation Status */}
            <AnimatePresence>
              {currentTrack && currentTrack.status !== 'ready' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <GeneratingStatus status={currentTrack.status} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Recent Tracks */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Music className="h-5 w-5 text-violet-400" />
                Recent Creations
              </h2>
              <Link to={createPageUrl('Library')}>
                <Button variant="ghost" className="text-slate-400 hover:text-white">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            {recentTracks.length === 0 ? (
              <div className="bg-slate-800/30 rounded-2xl p-8 text-center border border-slate-700/50">
                <Sparkles className="h-12 w-12 text-violet-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No tracks yet</h3>
                <p className="text-slate-400">Create your first track using the form</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTracks.map((track) => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    onPlay={handlePlay}
                    onDelete={handleDelete}
                    onToggleVisibility={handleToggleVisibility}
                    isPlaying={playingTrack?.id === track.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Player */}
        <AnimatePresence>
          {playingTrack && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800"
            >
              <div className="max-w-4xl mx-auto">
                <AudioPlayer
                  src={playingTrack.audio_url || playingTrack.stream_audio_url}
                  title={playingTrack.title}
                  artist={playingTrack.style}
                  coverImage={playingTrack.cover_image_url}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}