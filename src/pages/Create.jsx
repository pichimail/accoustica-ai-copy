import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CreateMusicForm from '@/components/create/CreateMusicForm';
import GeneratingStatus from '@/components/tracks/GeneratingStatus';
import TrackCard from '@/components/tracks/TrackCard';
import AudioPlayer from '@/components/audio/AudioPlayer';
import FullscreenPlayer from '@/components/audio/FullscreenPlayer';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import { Button } from "@/components/ui/button";
import { ArrowRight, Music, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreatePage() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [fullscreenPlayerOpen, setFullscreenPlayerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = React.useRef(null);
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user data and check onboarding
  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Check if user needs onboarding
      const progress = await base44.entities.OnboardingProgress.filter({ created_by: userData.email });
      if (progress.length === 0 || (!progress[0].is_completed && !progress[0].skipped)) {
        setShowOnboarding(true);
      }
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
      // Refetch every 2 seconds if any track is generating for faster updates
      const hasGenerating = Array.isArray(data) && data.some(t => t.status === 'generating' || t.status === 'queued');
      return hasGenerating ? 2000 : false;
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
        creativity_level: data.creativity_level || 50,
        complexity_level: data.complexity_level || 50,
        variation_count: data.variation_count || 1,
        genre_fusion: data.genre_fusion || '',
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
          setTimeout(poll, 2000); // Poll every 2 seconds for faster updates
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
    // Now handled by global player
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playingTrack]);

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-12">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 mb-6"
            >
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-sm text-slate-300">AI-Powered Music Generation</span>
            </motion.div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-6">
              <span className="text-white">Create</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 animate-gradient">
                Your Sound
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Transform your imagination into professional music. 
              No instruments needed, just your creativity.
            </p>

            {/* Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-8 mt-8"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{remainingGenerations}</div>
                <div className="text-sm text-slate-400">Generations Left</div>
              </div>
              <div className="w-px h-12 bg-slate-700"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{recentTracks.length}</div>
                <div className="text-sm text-slate-400">Tracks Created</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Centered Creation Form */}
          <div className="max-w-3xl mx-auto mb-12">
            <AnimatePresence mode="wait">
              {currentTrack && currentTrack.status !== 'ready' ? (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500/10 to-pink-500/10 backdrop-blur-xl border border-white/10 p-8"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-pink-500/20 animate-pulse"></div>
                  <div className="relative z-10">
                    <GeneratingStatus status={currentTrack.status} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CreateMusicForm
                    onSubmit={(data) => createTrackMutation.mutate(data)}
                    isLoading={createTrackMutation.isPending}
                    disabled={currentTrack?.status === 'generating'}
                    limitReached={limitReached}
                    remainingGenerations={remainingGenerations}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Generated Tracks Grid */}
          {recentTracks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                    <Music className="h-5 w-5 text-white" />
                  </div>
                  Your Tracks
                </h2>
                <Link to={createPageUrl('Library')}>
                  <Button 
                    variant="ghost" 
                    className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"
                  >
                    View All 
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {recentTracks.map((track, index) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <TrackCard
                        track={track}
                        onPlay={handlePlay}
                        onDelete={handleDelete}
                        onToggleVisibility={handleToggleVisibility}
                        onToggleFavorite={handleToggleFavorite}
                        showActions={true}
                        />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </div>
      </div>



      {/* Onboarding Flow */}
      <OnboardingFlow 
        open={showOnboarding} 
        onComplete={() => setShowOnboarding(false)} 
      />

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>
    </div>
  );
}