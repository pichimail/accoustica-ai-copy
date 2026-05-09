// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Shield, Users, Music, Wand2,
  GitBranch, Volume2, Crown, Save, RefreshCw, Search, ArrowLeft
} from 'lucide-react';

const DEFAULT_FLAGS = [
  { id: 'song_editor', name: 'Song Editor', description: 'Full DAW-style song editing with section replace, extend, crop, fade', category: 'studio', icon: Music, defaultOn: true, roles: ['admin', 'user'] },
  { id: 'remix_studio', name: 'Remix Studio', description: 'AI stem separation + per-stem style re-styling', category: 'studio', icon: GitBranch, defaultOn: true, roles: ['admin', 'user'] },
  { id: 'mastering_studio', name: 'Mastering Studio', description: 'Professional loudness, EQ, stereo width mastering', category: 'studio', icon: Volume2, defaultOn: true, roles: ['admin', 'user'] },
  { id: 'voice_clone', name: 'Voice Clone', description: 'AI persona creation from uploaded audio samples', category: 'generation', icon: Wand2, defaultOn: false, roles: ['admin'] },
  { id: 'advanced_generation', name: 'Advanced Generation', description: 'Custom lyrics, style weights, multi-model access', category: 'generation', icon: Music, defaultOn: true, roles: ['admin', 'user'] },
  { id: 'mashup_mode', name: 'Mashup Mode', description: 'Combine multiple tracks into AI mashups', category: 'generation', icon: Wand2, defaultOn: false, roles: ['admin'] },
  { id: 'public_library', name: 'Public Library', description: 'Ability to publish tracks to the public discover feed', category: 'social', icon: Users, defaultOn: true, roles: ['admin', 'user'] },
  { id: 'collaborative_studio', name: 'Collaborative Studio', description: 'Real-time multi-user track editing sessions', category: 'social', icon: Users, defaultOn: false, roles: ['admin'] },
  { id: 'social_feed', name: 'Social Feed', description: 'Comment and like tracks from other users', category: 'social', icon: Users, defaultOn: true, roles: ['admin', 'user'] },
  { id: 'stem_separation', name: 'Stem Separation', description: 'Isolate vocals, drums, bass and other stems', category: 'audio', icon: GitBranch, defaultOn: true, roles: ['admin', 'user'] },
  { id: 'video_generation', name: 'Music Video Generation', description: 'Auto-generate synced music videos with AI visuals', category: 'audio', icon: Music, defaultOn: false, roles: ['admin'] },
  { id: 'lyrics_generation', name: 'Lyrics Generation', description: 'AI-powered lyrics writing assistant', category: 'generation', icon: Wand2, defaultOn: true, roles: ['admin', 'user'] },
  { id: 'midi_export', name: 'MIDI Export', description: 'Export generated tracks as MIDI files', category: 'audio', icon: Music, defaultOn: false, roles: ['admin'] },
  { id: 'unlimited_generations', name: 'Unlimited Generations', description: 'Remove daily/monthly generation limits', category: 'limits', icon: Crown, defaultOn: false, roles: ['admin'] },
  { id: 'api_access', name: 'API Access', description: 'Allow users to access platform via REST API', category: 'limits', icon: Shield, defaultOn: false, roles: ['admin'] },
];

const CATEGORIES = ['all', 'studio', 'generation', 'social', 'audio', 'limits'];
const CATEGORY_COLORS = { studio: '#8b5cf6', generation: '#ec4899', social: '#06b6d4', audio: '#22c55e', limits: '#f97316' };

function ToggleSwitch({ enabled, onChange, disabled = false }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={cn('relative w-12 h-6 rounded-full transition-all flex-shrink-0', disabled && 'opacity-40 cursor-not-allowed')}
      style={{ background: enabled ? '#22c55e' : 'rgba(255,255,255,0.12)' }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all"
        style={{ left: enabled ? '26px' : '2px' }}
      />
    </button>
  );
}

export default function AdminFeatureFlagsPage() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [flags, setFlags] = useState(() => {
    try {
      const saved = localStorage.getItem('feature_flags');
      if (saved) return JSON.parse(saved);
    } catch {}
    const init = {};
    DEFAULT_FLAGS.forEach(f => { init[f.id] = { enabled: f.defaultOn, roles: f.roles }; });
    return init;
  });
  const [userOverrides, setUserOverrides] = useState({});
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const u = await base44.auth.me();
      if (u?.role !== 'admin') { navigate(createPageUrl('Home')); return; }
      setUser(u);
    };
    fetchUser();
  }, [navigate]);

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const handleSave = async () => {
    setSaving(true);
    haptics.medium();
    try {
      localStorage.setItem('feature_flags', JSON.stringify(flags));
      toast.success('Feature flags saved successfully!');
    } catch {
      toast.error('Failed to save flags');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const init = {};
    DEFAULT_FLAGS.forEach(f => { init[f.id] = { enabled: f.defaultOn, roles: f.roles }; });
    setFlags(init);
    localStorage.removeItem('feature_flags');
    toast.success('Flags reset to defaults');
    haptics.light();
  };

  const toggleFlag = (flagId) => {
    setFlags(prev => ({ ...prev, [flagId]: { ...prev[flagId], enabled: !prev[flagId]?.enabled } }));
    haptics.selection();
  };

  const toggleUserOverride = (userId, flagId) => {
    setUserOverrides(prev => {
      const key = `${userId}_${flagId}`;
      return { ...prev, [key]: !prev[key] };
    });
    haptics.selection();
  };

  const filteredFlags = DEFAULT_FLAGS.filter(f => {
    const matchesCat = category === 'all' || f.category === category;
    const matchesSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const filteredUsers = users.filter(u => !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()) || u.full_name?.toLowerCase().includes(userSearch.toLowerCase()));

  const enabledCount = Object.values(flags).filter(f => f.enabled).length;

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
      <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen p-4 lg:p-8" style={{ background: 'linear-gradient(135deg, #0d0d18, #0a0a0f)' }} role="main" aria-label="Feature Flags Admin">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(createPageUrl('AdminDashboard'))} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors" aria-label="Back to admin">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)' }}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Feature Flags</h1>
              <p className="text-white/40 text-sm">Control platform features per role and per user</p>
            </div>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Enabled Features', value: enabledCount, color: '#22c55e' },
              { label: 'Total Flags', value: DEFAULT_FLAGS.length, color: '#8b5cf6' },
              { label: 'Managed Users', value: users.length, color: '#06b6d4' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-2 h-8 rounded-full" style={{ background: s.color }} />
                <div>
                  <p className="text-xl font-extrabold text-white">{s.value}</p>
                  <p className="text-[10px] text-white/40">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* FLAGS PANEL */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Toolbar */}
              <div className="p-4 border-b flex flex-col sm:flex-row gap-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search flags..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                    aria-label="Search feature flags"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCategory(cat); haptics.selection(); }}
                      className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all', category === cat ? 'text-white' : 'text-white/40 hover:text-white/70')}
                      style={category === cat ? { background: CATEGORY_COLORS[cat] || '#8b5cf6' } : { background: 'rgba(255,255,255,0.05)' }}
                      aria-pressed={category === cat}
                    >{cat}</button>
                  ))}
                </div>
              </div>
              {/* Flag list */}
              <div className="divide-y" style={{ divideColor: 'rgba(255,255,255,0.05)' }}>
                {filteredFlags.map((flag, i) => {
                  const Icon = flag.icon;
                  const state = flags[flag.id] || { enabled: flag.defaultOn };
                  const catColor = CATEGORY_COLORS[flag.category] || '#6b7280';
                  return (
                    <motion.div
                      key={flag.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-white/3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: catColor + '22' }}>
                        <Icon className="h-4 w-4" style={{ color: catColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">{flag.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ background: catColor + '22', color: catColor }}>{flag.category}</span>
                          {flag.roles.includes('user') ? (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>All Users</span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>Admin Only</span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/35 mt-0.5">{flag.description}</p>
                      </div>
                      <ToggleSwitch enabled={!!state.enabled} onChange={() => toggleFlag(flag.id)} />
                    </motion.div>
                  );
                })}
              </div>
              {/* Save/Reset */}
              <div className="p-4 border-t flex gap-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: '#22c55e', color: '#fff' }}
                  aria-label="Save feature flags"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/50 border border-white/10 hover:bg-white/5 transition-all"
                  aria-label="Reset to defaults"
                >Reset to Defaults</button>
              </div>
            </div>
          </div>

          {/* USER OVERRIDES */}
          <div>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-cyan-400" /> Per-User Overrides
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                    aria-label="Search users for override"
                  />
                </div>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto" style={{ divideColor: 'rgba(255,255,255,0.05)' }}>
                {filteredUsers.slice(0, 15).map(u => (
                  <div key={u.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${u.full_name || u.email}`} alt="" className="w-full h-full" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{u.full_name || u.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-white/30 truncate">{u.email}</p>
                      </div>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-bold ml-auto flex-shrink-0', u.role === 'admin' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-white/40')}>
                        {u.role || 'user'}
                      </span>
                    </div>
                    {/* Per-user flag toggles for key flags */}
                    <div className="space-y-1">
                      {DEFAULT_FLAGS.filter(f => f.category === 'studio' || f.id === 'unlimited_generations').map(flag => {
                        const key = `${u.id}_${flag.id}`;
                        const globalEnabled = flags[flag.id]?.enabled;
                        const override = userOverrides[key];
                        const effective = override !== undefined ? override : globalEnabled;
                        return (
                          <div key={flag.id} className="flex items-center justify-between">
                            <span className="text-[10px] text-white/40 truncate">{flag.name}</span>
                            <ToggleSwitch enabled={effective} onChange={() => toggleUserOverride(u.id, flag.id)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="p-6 text-center">
                    <Users className="h-8 w-8 text-white/10 mx-auto mb-2" />
                    <p className="text-xs text-white/25">No users found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}