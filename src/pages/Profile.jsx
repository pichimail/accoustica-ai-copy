import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatsCard from '@/components/ui/StatsCard';
import TrackCard from '@/components/tracks/TrackCard';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { 
  User, Music, Calendar, Edit2, Save, X, Camera, 
  Crown, Zap, TrendingUp, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [playingTrack, setPlayingTrack] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      setEditData({
        bio: userData?.bio || '',
        avatar_url: userData?.avatar_url || '',
      });
    };
    fetchUser();
  }, []);

  const { data: plan } = useQuery({
    queryKey: ['userPlan', user?.plan_id],
    queryFn: async () => {
      if (!user?.plan_id) {
        const plans = await base44.entities.Plan.filter({ name: 'Free' });
        return plans[0];
      }
      const plans = await base44.entities.Plan.filter({ id: user.plan_id });
      return plans[0];
    },
    enabled: true,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['userTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Track.filter(
        { created_by: user.email },
        '-created_date',
        20
      );
    },
    enabled: !!user?.email,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      setIsEditing(false);
      setUser(prev => ({ ...prev, ...editData }));
      toast.success('Profile updated');
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  const handlePlay = (track) => {
    setPlayingTrack(track);
  };

  const handleDelete = async (track) => {
    await base44.entities.Track.delete(track.id);
    queryClient.invalidateQueries({ queryKey: ['userTracks'] });
    if (playingTrack?.id === track.id) {
      setPlayingTrack(null);
    }
    toast.success('Track deleted');
  };

  const handleToggleVisibility = async (track) => {
    await base44.entities.Track.update(track.id, {
      is_public: !track.is_public,
    });
    queryClient.invalidateQueries({ queryKey: ['userTracks'] });
    toast.success(track.is_public ? 'Track is now private' : 'Track is now public');
  };

  const stats = {
    totalTracks: user?.total_tracks || tracks.length,
    publicTracks: tracks.filter(t => t.is_public).length,
    totalPlays: tracks.reduce((sum, t) => sum + (t.plays || 0), 0),
    monthlyUsage: user?.monthly_usage || 0,
  };

  const today = new Date().toISOString().split('T')[0];
  const dailyUsage = user?.last_usage_reset === today ? (user?.daily_usage || 0) : 0;
  const dailyLimit = plan?.daily_limit || 5;

  const avatarUrl = user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name || 'User'}`;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 pb-32">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 md:p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            {/* Avatar */}
            <div className="relative">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-violet-500/30">
                <img 
                  src={avatarUrl} 
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                />
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white" />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{user.full_name}</h1>
                <Badge className="bg-gradient-to-r from-violet-500 to-pink-500 text-white border-0">
                  <Crown className="h-3 w-3 mr-1" />
                  {plan?.name || 'Free'}
                </Badge>
              </div>
              <p className="text-slate-400 mb-2">{user.email}</p>
              
              {isEditing ? (
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-slate-300">Bio</Label>
                    <Textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      className="bg-slate-900/50 border-slate-700 text-white mt-1"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                      className="bg-violet-500 hover:bg-violet-600"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button 
                      onClick={() => setIsEditing(false)}
                      variant="ghost" 
                      className="text-slate-400"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {user.bio && (
                    <p className="text-slate-300 mt-2">{user.bio}</p>
                  )}
                  <Button 
                    onClick={() => setIsEditing(true)}
                    variant="ghost" 
                    className="mt-4 text-violet-400 hover:text-violet-300"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </>
              )}
            </div>

            {/* Usage */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 text-center">
              <p className="text-slate-400 text-sm mb-1">Today's Usage</p>
              <div className="text-3xl font-bold text-white">
                {dailyUsage} <span className="text-lg text-slate-400">/ {dailyLimit}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-violet-500 to-pink-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((dailyUsage / dailyLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatsCard
            title="Total Tracks"
            value={stats.totalTracks}
            icon={Music}
            iconClassName="bg-violet-500/20"
          />
          <StatsCard
            title="Public Tracks"
            value={stats.publicTracks}
            icon={TrendingUp}
            iconClassName="bg-green-500/20"
          />
          <StatsCard
            title="Total Plays"
            value={stats.totalPlays}
            icon={Zap}
            iconClassName="bg-pink-500/20"
          />
          <StatsCard
            title="This Month"
            value={stats.monthlyUsage}
            icon={Calendar}
            iconClassName="bg-blue-500/20"
          />
        </motion.div>

        {/* Plan Info */}
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-violet-500/20 to-pink-500/20 backdrop-blur-xl rounded-2xl border border-violet-500/30 p-6 mb-8"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-400" />
                  {plan.name} Plan
                </h3>
                <p className="text-slate-300 mt-1">{plan.description || `${plan.daily_limit} generations/day • ${plan.monthly_limit} generations/month`}</p>
              </div>
              {plan.name !== 'Enterprise' && (
                <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20">
                  Upgrade Plan
                </Button>
              )}
            </div>
            {plan.features && plan.features.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {plan.features.map((feature, i) => (
                  <Badge key={i} className="bg-white/10 text-white border-0">
                    {feature}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tracks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Music className="h-5 w-5 text-violet-400" />
            My Tracks
          </h2>
          
          {tracks.length === 0 ? (
            <div className="bg-slate-800/30 rounded-2xl p-8 text-center border border-slate-700/50">
              <Music className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No tracks yet</h3>
              <p className="text-slate-400">Start creating to see your tracks here</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <AnimatePresence>
                {tracks.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <TrackCard
                      track={track}
                      onPlay={handlePlay}
                      onDelete={handleDelete}
                      onToggleVisibility={handleToggleVisibility}
                      isPlaying={playingTrack?.id === track.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
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
  );
}