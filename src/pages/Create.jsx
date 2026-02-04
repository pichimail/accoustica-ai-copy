import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Music, ArrowRight, Share2, Trash2, Heart, Lock, Globe, Pause, Play } from 'lucide-react';

import CreateMusicForm from '../components/create/CreateMusicForm';
import GeneratingStatus from '../components/tracks/GeneratingStatus';
import TrackCard from '../components/tracks/TrackCard';
import OnboardingFlow from '../components/onboarding/OnboardingFlow';

export default function Create() {
  const queryClient = useQueryClient();
  const [currentTrack, setCurrentTrack] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [playingTrack, setPlayingTrack] = useState(null);

  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Simple mobile detection (keeps desktop unchanged)
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userPlan } = useQuery({
    queryKey: ['userPlan', user?.email],
    queryFn: async () => {
      const plans = await base44.entities.UserPlan.filter({ user_email: user.email }, '-created_date', 1);
      return plans?.[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: recentTracks = [] } = useQuery({
    queryKey: ['recentTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Track.filter({ created_by: user.email }, '-created_date', 12);
    },
    enabled: !!user?.email,
  });

  const createTrackMutation = useMutation({
    mutationFn: async (payload) => {
      // Create track entity immediately (UI shows "generating")
      const created = await base44.entities.Track.create({
        created_by: user?.email,
        title: payload?.title || payload?.prompt?.slice(0, 40) || 'Untitled',
        prompt: payload?.prompt || '',
        style: payload?.style || '',
        model: payload?.model || 'V5',
        mode: payload?.mode || 'simple',
        instrumental: !!payload?.instrumental,
        status: 'queued',
        is_public: false,
        is_favorite: false,
      });

      setCurrentTrack(created);

      // Kick backend generation
      await base44.functions.invoke('generateMusic', {
        track_id: created.id,
        ...payload,
      });

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentTracks'] });
      toast.success('Queued for generation');
    },
    onError: (e) => {
      console.error(e);
      toast.error('Failed to start generation');
      setCurrentTrack(null);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (trackId) => {
      // Poll track until ready
      const maxTries = 120;
      for (let i = 0; i < maxTries; i++) {
        const t = await base44.entities.Track.get(trackId);
        setCurrentTrack(t);

        if (t.status === 'ready' || t.status === 'failed') return t;

        await new Promise((r) => setTimeout(r, 2000));
      }
      return await base44.entities.Track.get(trackId);
    },
    onSuccess: (t) => {
      queryClient.invalidateQueries({ queryKey: ['recentTracks'] });
      if (t?.status === 'ready') toast.success('Track ready');
      if (t?.status === 'failed') toast.error('Generation failed');
    },
  });

  // When a track is created (queued), start polling.
  useEffect(() => {
    if (currentTrack?.id && (currentTrack.status === 'queued' || currentTrack.status === 'generating')) {
      generateMutation.mutate(currentTrack.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  const handleSubmit = async (data) => {
    if (!user?.email) {
      toast.error('Please login');
      return;
    }
    const created = await createTrackMutation.mutateAsync(data);
    setCurrentTrack(created);
  };

  // audio controls
  const handlePlay = (track) => {
    if (!track?.audio_url) return;

    if (playingTrack?.id === track.id) {
      // toggle play/pause
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) a.play();
      else a.pause();
      return;
    }

    setPlayingTrack(track);
  };

  useEffect(() => {
    if (!playingTrack?.audio_url) return;

    const a = audioRef.current;
    if (!a) return;

    a.src = playingTrack.audio_url;
    a.play().catch(() => {});
    setIsPlaying(true);

    const updateTime = () => {
      if (!a.duration) return;
      setProgress(a.currentTime);
      setDuration(a.duration);
    };
    const handlePause = () => setIsPlaying(false);
    const handlePlayEvt = () => setIsPlaying(true);
    const handleEnded = () => setIsPlaying(false);

    a.addEventListener('timeupdate', updateTime);
    a.addEventListener('pause', handlePause);
    a.addEventListener('play', handlePlayEvt);
    a.addEventListener('ended', handleEnded);

    return () => {
      a.removeEventListener('timeupdate', updateTime);
      a.removeEventListener('pause', handlePause);
      a.removeEventListener('play', handlePlayEvt);
      a.removeEventListener('ended', handleEnded);
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

  // MOBILE: show only the full-screen generator form.
  // (No hero copy, no stats, no recent list, no extra padding)
  if (isMobile) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black" />
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <CreateMusicForm
            onSubmit={handleSubmit}
            isLoading={generateMutation.isLoading}
            disabled={generateMutation.isLoading}
            limitReached={limitReached}
            remainingGenerations={remainingGenerations}
          />
        </div>

        <audio ref={audioRef} />
      </div>
    );
  }

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

      <audio ref={audioRef} />

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