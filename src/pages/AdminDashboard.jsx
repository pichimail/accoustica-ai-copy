// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import StatsCard from '@/components/ui/StatsCard';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Music, TrendingUp, Zap, Crown, ArrowRight,
  BarChart3, Clock, CheckCircle2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

export default function AdminDashboardPage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await base44.auth.me();
      if (userData.role !== 'admin') {
        navigate(createPageUrl('Home'));
        return;
      }
      setUser(userData);
    };
    fetchUser();
  }, [navigate]);

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['allTracks'],
    queryFn: () => base44.entities.Track.list('-created_date', 100),
    enabled: !!user,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['allPlans'],
    queryFn: () => base44.entities.Plan.list(),
    enabled: !!user,
  });

  // Calculate stats
  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.account_status !== 'suspended').length,
    totalTracks: tracks.length,
    publicTracks: tracks.filter(t => t.is_public).length,
    readyTracks: tracks.filter(t => t.status === 'ready').length,
    generatingTracks: tracks.filter(t => t.status === 'generating' || t.status === 'queued').length,
  };

  // Generate chart data (mock data for demo)
  const generateChartData = () => {
    const days = 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        tracks: Math.floor(Math.random() * 50) + 10,
        users: Math.floor(Math.random() * 10) + 2,
      });
    }
    return data;
  };

  const chartData = generateChartData();

  // Plan distribution
  const planDistribution = plans.map(plan => {
    const count = users.filter(u => u.plan_id === plan.id).length || 
                  (plan.name === 'Free' ? users.filter(u => !u.plan_id).length : 0);
    return {
      name: plan.name,
      value: count,
    };
  }).filter(p => p.value > 0);

  // Recent activity
  const recentTracks = tracks.slice(0, 5);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p className="text-slate-400">Overview of your platform</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
            iconClassName="bg-blue-500/20"
          />
          <StatsCard
            title="Active Users"
            value={stats.activeUsers}
            icon={CheckCircle2}
            iconClassName="bg-green-500/20"
          />
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
            iconClassName="bg-pink-500/20"
          />
        </motion.div>

        {/* Charts Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-8"
        >
          {/* Activity Chart */}
          <Card className="md:col-span-2 bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-400" />
                Activity (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="tracks"
                    stroke="#8b5cf6"
                    fill="url(#colorTracks)"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="colorTracks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {planDistribution.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-slate-400">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions & Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Quick Actions */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={createPageUrl('AdminUsers')}>
                <Button variant="outline" className="w-full justify-between bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Manage Users
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={createPageUrl('AdminPlans')}>
                <Button variant="outline" className="w-full justify-between bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700">
                  <span className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Manage Plans
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={createPageUrl('AdminTracks')}>
                <Button variant="outline" className="w-full justify-between bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700">
                  <span className="flex items-center gap-2">
                    <Music className="h-4 w-4" />
                    View All Tracks
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={createPageUrl('AdminFeatureFlags')}>
                <Button variant="outline" className="w-full justify-between bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    Feature Flags
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Tracks */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-400" />
                Recent Tracks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTracks.map((track) => (
                  <div key={track.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop'}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{track.title}</p>
                      <p className="text-xs text-slate-400">{track.created_by}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      track.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                      track.status === 'generating' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {track.status}
                    </span>
                  </div>
                ))}
                {recentTracks.length === 0 && (
                  <p className="text-slate-400 text-center py-4">No tracks yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}