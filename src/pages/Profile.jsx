import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { toast } from 'sonner';
import {
  User, Music, TrendingUp, Award, Settings,
  Zap, Crown, Clock, Heart, LogOut, ChevronRight,
  Edit3, Check, X, Camera
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { createPageUrl } from '@/utils';

const TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'activity', label: 'Activity' },
  { id: 'achievements', label: 'Badges' },
  { id: 'settings', label: 'Settings' },
];

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [tab, setTab] = useState('stats');
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setEditedName(u.full_name || ''); });
  }, []);

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.Plan.list(),
  });

  useEffect(() => {
    if (plans.length > 0) {
      const plan = user?.plan_id ? plans.find(p => p.id === user.plan_id) : null;
      setUserPlan(plan || plans.find(p => p.name?.toLowerCase() === 'free') || plans[0]);
    }
  }, [user, plans]);

  const { data: tracks = [] } = useQuery({
    queryKey: ['userTracks', user?.email],
    queryFn: () => base44.entities.Track.filter({ created_by: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const handleSave = async () => {
    await base44.auth.updateMe({ full_name: editedName });
    setUser(u => ({ ...u, full_name: editedName }));
    setIsEditing(false);
    haptics.success();
    toast.success('Profile updated!');
  };

  if (!user) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  const dailyUsage = user?.last_usage_reset === new Date().toISOString().split('T')[0] ? (user?.daily_usage || 0) : 0;
  const dailyLimit = userPlan?.daily_limit || 5;
  const totalTracks = tracks.length;
  const readyTracks = tracks.filter(t => t.status === 'ready').length;
  const favTracks = tracks.filter(t => t.is_favorite).length;
  const avatarUrl = user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}&backgroundColor=7c3aed`;

  const achievements = [
    { id: 'first', label: 'First Track', desc: 'Create 1 track', unlocked: totalTracks >= 1, icon: Music },
    { id: 'ten', label: 'Prolific Creator', desc: 'Create 10 tracks', unlocked: totalTracks >= 10, icon: Zap },
    { id: 'fifty', label: 'Music Machine', desc: 'Create 50 tracks', unlocked: totalTracks >= 50, icon: TrendingUp },
    { id: 'hundred', label: 'Legendary', desc: 'Create 100 tracks', unlocked: totalTracks >= 100, icon: Crown },
    { id: 'fav', label: 'Curator', desc: 'Favorite 5 tracks', unlocked: favTracks >= 5, icon: Heart },
    { id: 'award', label: 'Power User', desc: '50 ready tracks', unlocked: readyTracks >= 50, icon: Award },
  ];

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Hero */}
      <div className="relative px-4 pt-8 pb-6">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/40 to-black" />
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-violet-500/30">
              <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-violet-500 flex items-center justify-center">
              <Crown className="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                value={editedName}
                onChange={e => setEditedName(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-white text-lg font-bold text-center focus:outline-none"
                autoFocus
              />
              <button onClick={handleSave} className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setIsEditing(false)} className="w-8 h-8 rounded-lg bg-white/10 text-white/40 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setIsEditing(true); haptics.light(); }}
              className="flex items-center gap-1.5 mb-1 group"
            >
              <h2 className="text-2xl font-bold text-white">{user.full_name}</h2>
              <Edit3 className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
          )}
          <p className="text-sm text-white/40 mb-3">{user.email}</p>
          <div className="flex items-center gap-1.5 bg-violet-500/15 border border-violet-500/25 px-3 py-1.5 rounded-full">
            <Crown className="h-3 w-3 text-violet-400" />
            <span className="text-xs font-medium text-violet-300">{userPlan?.name || 'Free'} Plan</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 mb-4">
        {[
          { label: 'Total', value: totalTracks },
          { label: 'Ready', value: readyTracks },
          { label: 'Favorites', value: favTracks },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl py-3 text-center">
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 bg-white/5 rounded-xl p-1 mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); haptics.selection(); }}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-medium transition-all',
              tab === t.id ? 'bg-white/10 text-white' : 'text-white/40'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="px-4"
        >
          {tab === 'stats' && (
            <div className="space-y-3">
              <UsageMeter label="Daily Usage" used={dailyUsage} max={dailyLimit} color="from-violet-500 to-pink-500" />
              <UsageMeter label="Monthly Usage" used={user?.monthly_usage || 0} max={userPlan?.monthly_limit || 50} color="from-blue-500 to-cyan-500" />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total Tracks', value: totalTracks, color: 'text-violet-400' },
                  { label: 'Ready Tracks', value: readyTracks, color: 'text-emerald-400' },
                  { label: 'Favorites', value: favTracks, color: 'text-red-400' },
                  { label: 'Public', value: tracks.filter(t => t.is_public).length, color: 'text-blue-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl p-4">
                    <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                    <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-2">
              {tracks.slice(0, 15).map(track => (
                <div key={track.id} className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                    {track.cover_image_url ? <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" /> : <Music className="h-4 w-4 text-white/20 m-auto" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                    <p className="text-xs text-white/40">{new Date(track.created_date).toLocaleDateString()}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full',
                    track.status === 'ready' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400'
                  )}>
                    {track.status}
                  </span>
                </div>
              ))}
              {tracks.length === 0 && <p className="text-center text-white/30 py-12 text-sm">No activity yet</p>}
            </div>
          )}

          {tab === 'achievements' && (
            <div className="grid grid-cols-2 gap-3">
              {achievements.map(({ id, label, desc, unlocked, icon: Icon }) => (
                <div key={id} className={cn(
                  'p-4 rounded-xl border transition-all',
                  unlocked
                    ? 'bg-violet-500/10 border-violet-500/30'
                    : 'bg-white/3 border-white/8 opacity-40'
                )}>
                  <Icon className={cn('h-6 w-6 mb-2', unlocked ? 'text-violet-400' : 'text-white/20')} />
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/8 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Account</p>
                </div>
                <div className="divide-y divide-white/5">
                  <SettingsRow label="Full Name" value={user.full_name} onClick={() => setTab('_edit')} />
                  <SettingsRow label="Email" value={user.email} />
                  <SettingsRow label="Plan" value={userPlan?.name || 'Free'} badge />
                </div>
              </div>
              <button
                onClick={() => base44.auth.logout(createPageUrl('Home'))}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function UsageMeter({ label, used, max, color }) {
  const pct = Math.min(100, (used / max) * 100);
  return (
    <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-white/60">{label}</span>
        <span className="text-white font-medium">{used}/{max}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={cn('h-full bg-gradient-to-r rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SettingsRow({ label, value, onClick, badge }) {
  return (
    <button
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors text-left"
      onClick={onClick}
    >
      <span className="text-sm text-white/60">{label}</span>
      <div className="flex items-center gap-2">
        {badge ? (
          <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">{value}</span>
        ) : (
          <span className="text-sm text-white/40">{value}</span>
        )}
        {onClick && <ChevronRight className="h-4 w-4 text-white/20" />}
      </div>
    </button>
  );
}