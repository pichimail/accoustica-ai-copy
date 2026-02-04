import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, Music, TrendingUp, Calendar, Award, 
  Settings, Zap, Crown, Clock, Target, Heart, Video, Download, Share2, ExternalLink, Wand2, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('activity');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
      setEditedName(userData.full_name || '');
    };
    fetchUser();
  }, []);

  const handleSaveProfile = async () => {
    try {
      await base44.auth.updateMe({ full_name: editedName });
      setUser({ ...user, full_name: editedName });
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

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
      const freePlan = plans.find(p => p.name.toLowerCase() === 'free');
      setUserPlan(freePlan || plans[0]);
    }
  }, [user, plans]);

  // Fetch user's tracks for stats
  const { data: userTracks = [] } = useQuery({
    queryKey: ['userTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Track.filter({ created_by: user.email }, '-created_date', 100);
    },
    enabled: !!user?.email,
  });

  const { data: recentTracks = [] } = useQuery({
    queryKey: ['recentTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Track.filter(
        { created_by: user.email },
        '-created_date',
        10
      );
    },
    enabled: !!user?.email,
  });

  const { data: favoriteTracks = [] } = useQuery({
    queryKey: ['favoriteTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Track.filter(
        { created_by: user.email, is_favorite: true },
        '-updated_date',
        20
      );
    },
    enabled: !!user?.email,
  });

  const { data: masteredTracks = [] } = useQuery({
    queryKey: ['masteredTracks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Track.filter(
        { created_by: user.email },
        '-created_date',
        50
      ).then(tracks => tracks.filter(t => t.parent_track_id)); // Only mastered versions
    },
    enabled: !!user?.email,
  });

  const { data: userVideos = [] } = useQuery({
    queryKey: ['userVideos', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allVideos = await base44.entities.VideoGeneration.filter({ status: 'ready' });
      
      // Filter videos that belong to user's tracks
      const videoPromises = allVideos.map(async (video) => {
        try {
          const tracks = await base44.entities.Track.filter({ id: video.track_id });
          if (tracks.length > 0 && tracks[0].created_by === user.email) {
            return { ...video, track: tracks[0] };
          }
        } catch (e) {
          return null;
        }
        return null;
      });
      
      const videosWithTracks = await Promise.all(videoPromises);
      return videosWithTracks.filter(v => v !== null).sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
    },
    enabled: !!user?.email,
    refetchInterval: 10000,
  });

  const dailyUsage = user?.last_usage_reset === new Date().toISOString().split('T')[0] 
    ? (user?.daily_usage || 0) 
    : 0;
  const dailyLimit = userPlan?.daily_limit || 5;
  const monthlyUsage = user?.monthly_usage || 0;
  const monthlyLimit = userPlan?.monthly_limit || 50;
  const totalTracks = user?.total_tracks || 0;

  const stats = [
    {
      icon: Zap,
      label: 'Daily Usage',
      value: dailyUsage,
      max: dailyLimit,
      color: 'violet',
    },
    {
      icon: TrendingUp,
      label: 'Monthly Usage',
      value: monthlyUsage,
      max: monthlyLimit,
      color: 'blue',
    },
    {
      icon: Music,
      label: 'Total Tracks',
      value: totalTracks,
      color: 'pink',
    },
    {
      icon: Award,
      label: 'Ready Tracks',
      value: userTracks.filter(t => t.status === 'ready').length,
      color: 'green',
    },
  ];

  const recentActivity = userTracks
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10)
    .map(track => ({
      title: track.title,
      date: new Date(track.created_date).toLocaleDateString(),
      status: track.status,
    }));

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  const avatarUrl = user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 p-8"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="w-32 h-32 border-4 border-violet-500/50">
              <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" />
              <AvatarFallback className="bg-violet-500 text-white text-4xl">
                {user.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold text-white mb-2">{user.full_name}</h1>
              <p className="text-slate-400 mb-4">{user.email}</p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                  <Crown className="h-3 w-3 mr-1" />
                  {userPlan?.name || 'Free'} Plan
                </Badge>
                <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">
                  {user.role === 'admin' ? 'Admin' : 'User'}
                </Badge>
                <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">
                  <Calendar className="h-3 w-3 mr-1" />
                  Joined {new Date(user.created_date).toLocaleDateString()}
                </Badge>
              </div>
            </div>

            <Button 
              onClick={() => setIsEditing(!isEditing)}
              variant="outline" 
              className="border-slate-700 hover:bg-slate-800"
            >
              <Settings className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <stat.icon className={`h-8 w-8 text-${stat.color}-400`} />
                    {stat.max && (
                      <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">
                        {stat.value}/{stat.max}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {stat.value}
                  </h3>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  {stat.max && (
                    <div className="mt-3 bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r from-${stat.color}-500 to-${stat.color}-400 transition-all duration-300`}
                        style={{ width: `${(stat.value / stat.max) * 100}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Tabs defaultValue="activity" className="space-y-6">
            <TabsList className="bg-slate-900/50 border border-slate-800">
              <TabsTrigger value="activity" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <Clock className="h-4 w-4 mr-2" />
                Recent Activity
              </TabsTrigger>
              <TabsTrigger value="favorites" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <Heart className="h-4 w-4 mr-2" />
                Favorites
              </TabsTrigger>
              <TabsTrigger value="mastered" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <Wand2 className="h-4 w-4 mr-2" />
                Mastered
              </TabsTrigger>
              <TabsTrigger value="videos" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <Video className="h-4 w-4 mr-2" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="achievements" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <Award className="h-4 w-4 mr-2" />
                Achievements
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentTracks.length === 0 ? (
                      <p className="text-slate-400 text-center py-8">No activity yet</p>
                    ) : (
                      recentTracks.map((track) => (
                        <Link key={track.id} to={createPageUrl('TrackView') + `?id=${track.id}`}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-violet-500/50 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                                <img 
                                  src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'} 
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white truncate">{track.title}</h4>
                                <p className="text-sm text-slate-400">{track.style}</p>
                              </div>
                              <Badge className={cn(
                                track.status === 'ready' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              )}>
                                {track.status}
                              </Badge>
                            </div>
                          </motion.div>
                        </Link>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="favorites">
              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Favorite Tracks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {favoriteTracks.length === 0 ? (
                      <div className="text-center py-12">
                        <Heart className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No favorite tracks yet</p>
                        <p className="text-sm text-slate-500 mt-2">Mark tracks as favorites to see them here</p>
                      </div>
                    ) : (
                      favoriteTracks.map((track) => (
                        <Link key={track.id} to={createPageUrl('TrackView') + `?id=${track.id}`}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-violet-500/50 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                                <img 
                                  src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'} 
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                                  <h4 className="font-medium text-white truncate">{track.title}</h4>
                                </div>
                                <p className="text-sm text-slate-400">{track.style}</p>
                              </div>
                              <div className="text-sm text-slate-400">
                                {track.plays || 0} plays
                              </div>
                            </div>
                          </motion.div>
                        </Link>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mastered">
              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-purple-400" />
                    Mastered Tracks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {masteredTracks.length === 0 ? (
                    <div className="text-center py-12">
                      <Wand2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No mastered tracks yet</p>
                      <p className="text-sm text-slate-500 mt-2">Use the AI Mastering Studio on your tracks</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {masteredTracks.map((track) => (
                        <Link key={track.id} to={createPageUrl('TrackView') + `?id=${track.id}`}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                                <Wand2 className="h-6 w-6 text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white truncate">{track.title}</h4>
                                <p className="text-sm text-slate-400">{track.style}</p>
                              </div>
                              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                Mastered
                              </Badge>
                            </div>
                          </motion.div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="videos">
              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Music Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  {userVideos.length === 0 ? (
                    <div className="text-center py-12">
                      <Video className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No music videos yet</p>
                      <p className="text-sm text-slate-500 mt-2">Generate videos from your tracks to see them here</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userVideos.map((video) => (
                        <motion.div
                          key={video.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden hover:border-violet-500/50 transition-all"
                        >
                          <div className="relative aspect-video bg-slate-900">
                            <video 
                              src={video.video_url} 
                              controls 
                              poster={video.track?.cover_image_url}
                              className="w-full h-full object-cover"
                            >
                              Your browser does not support video.
                            </video>
                          </div>

                          <div className="p-4">
                            <h3 className="font-semibold text-white mb-1 truncate">{video.track?.title || 'Untitled'}</h3>
                            <p className="text-sm text-slate-400 mb-3 truncate">{video.track?.style || 'Unknown'}</p>
                            
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                              <Calendar className="h-3 w-3" />
                              {new Date(video.created_date).toLocaleDateString()}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = video.video_url;
                                  a.download = `${video.track?.title || 'video'}.mp4`;
                                  a.click();
                                }}
                                className="flex-1 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(video.video_url);
                                  toast.success('Video link copied!');
                                }}
                                className="flex-1 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700"
                              >
                                <Share2 className="h-3 w-3 mr-1" />
                                Share
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(video.video_url, '_blank')}
                                className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg border-2 ${totalTracks >= 1 ? 'bg-violet-500/10 border-violet-500/30' : 'bg-slate-800/30 border-slate-700 opacity-50'}`}>
                      <Award className={`h-8 w-8 mb-2 ${totalTracks >= 1 ? 'text-violet-400' : 'text-slate-600'}`} />
                      <h4 className="text-white font-semibold mb-1">First Track</h4>
                      <p className="text-sm text-slate-400">Create your first track</p>
                    </div>
                    <div className={`p-4 rounded-lg border-2 ${totalTracks >= 10 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-800/30 border-slate-700 opacity-50'}`}>
                      <Target className={`h-8 w-8 mb-2 ${totalTracks >= 10 ? 'text-blue-400' : 'text-slate-600'}`} />
                      <h4 className="text-white font-semibold mb-1">10 Tracks</h4>
                      <p className="text-sm text-slate-400">Create 10 tracks</p>
                    </div>
                    <div className={`p-4 rounded-lg border-2 ${totalTracks >= 50 ? 'bg-pink-500/10 border-pink-500/30' : 'bg-slate-800/30 border-slate-700 opacity-50'}`}>
                      <Zap className={`h-8 w-8 mb-2 ${totalTracks >= 50 ? 'text-pink-400' : 'text-slate-600'}`} />
                      <h4 className="text-white font-semibold mb-1">50 Tracks</h4>
                      <p className="text-sm text-slate-400">Create 50 tracks</p>
                    </div>
                    <div className={`p-4 rounded-lg border-2 ${totalTracks >= 100 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/30 border-slate-700 opacity-50'}`}>
                      <Crown className={`h-8 w-8 mb-2 ${totalTracks >= 100 ? 'text-amber-400' : 'text-slate-600'}`} />
                      <h4 className="text-white font-semibold mb-1">100 Tracks</h4>
                      <p className="text-sm text-slate-400">Create 100 tracks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Full Name</Label>
                    <Input 
                      value={editedName} 
                      onChange={(e) => setEditedName(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Email</Label>
                    <Input 
                      value={user.email} 
                      disabled
                      className="bg-slate-800 border-slate-700 text-slate-400"
                    />
                  </div>
                  <Button 
                    onClick={handleSaveProfile}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}