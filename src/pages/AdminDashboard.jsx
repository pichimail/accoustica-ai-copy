// @ts-nocheck
/**
 * Accoustica AI — Unified Admin Console
 * Theme: #0a0a0f bg, rose/pink #e11d48 accent, green #22c55e — matches /Library and /Create pages strictly.
 * Single page, 7-tab nav: Overview · Users · Tracks · Plans · Feature Flags · Insights · System
 */

import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Music, Crown, Settings,
  Search, Plus, Trash2, Edit2, Eye, EyeOff, Ban, CheckCircle2,
  Loader2, RefreshCw, Save, X, ChevronDown, Zap, Globe, Lock, Play, Pause, BarChart3, Clock, Activity, Star, Download, Bell,
  AlertTriangle, XSquare, Server,
  GitBranch, Volume2, Wand2, Mic2, Film, UserCheck, SortAsc, Hash, DollarSign, Layers, Sparkles, Radio, HardDrive, Terminal, Flag, Boxes
} from 'lucide-react';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ─────────────────────────────────────────────
// Theme constants (Library/Create page theme)
// ─────────────────────────────────────────────
const BG    = '#0a0a0f';
const BG2   = '#111118';
const BORD  = 'rgba(255,255,255,0.07)';
const BORD2 = 'rgba(255,255,255,0.04)';
const ROSE  = '#e11d48';
const GREEN = '#22c55e';
const PURPLE= '#a78bfa';
const BLUE  = '#38bdf8';
const AMBER = '#fbbf24';
const TEXT  = 'rgba(255,255,255,0.85)';
const TEXT2 = 'rgba(255,255,255,0.45)';
const TEXT3 = 'rgba(255,255,255,0.22)';
const CHART_COLORS = [ROSE, GREEN, PURPLE, BLUE, AMBER];

// ─────────────────────────────────────────────
// Feature flags definitions
// ─────────────────────────────────────────────
const DEFAULT_FLAGS = [
  { id: 'song_editor',           name: 'Song Editor',           desc: 'Full DAW-style song editing — section replace, extend, crop, fade',     category: 'studio',     icon: Edit2,       defaultOn: true  },
  { id: 'remix_studio',          name: 'Remix Studio',          desc: 'AI stem separation + per-stem style re-styling',                         category: 'studio',     icon: GitBranch,   defaultOn: true  },
  { id: 'mastering_studio',      name: 'Mastering Studio',      desc: 'Professional loudness, EQ, stereo width mastering chains',              category: 'studio',     icon: Volume2,     defaultOn: true  },
  { id: 'video_generation',      name: 'Video Generation',      desc: 'Auto-generate synced music videos with AI visuals',                     category: 'studio',     icon: Film,        defaultOn: false },
  { id: 'advanced_generation',   name: 'Advanced Generation',   desc: 'Custom lyrics, style weights, negative tags, multi-model access',       category: 'generation', icon: Sparkles,    defaultOn: true  },
  { id: 'voice_clone',           name: 'Voice Clone',           desc: 'AI persona creation from uploaded audio samples',                        category: 'generation', icon: Mic2,        defaultOn: false },
  { id: 'mashup_mode',           name: 'Mashup Mode',           desc: 'Combine multiple tracks into AI mashups',                                category: 'generation', icon: Wand2,       defaultOn: false },
  { id: 'lyrics_generation',     name: 'Lyrics Generation',     desc: 'AI-powered lyrics writing assistant',                                    category: 'generation', icon: Music,       defaultOn: true  },
  { id: 'midi_export',           name: 'MIDI Export',           desc: 'Export generated tracks as MIDI files',                                  category: 'generation', icon: Download,    defaultOn: false },
  { id: 'public_library',        name: 'Public Library',        desc: 'Publish tracks to the public discover feed',                            category: 'social',     icon: Globe,       defaultOn: true  },
  { id: 'social_feed',           name: 'Social Feed',           desc: 'Comment, like and follow other creators',                                category: 'social',     icon: Radio,       defaultOn: true  },
  { id: 'collaborative_studio',  name: 'Collaborative Studio',  desc: 'Real-time multi-user track editing sessions',                           category: 'social',     icon: Users,       defaultOn: false },
  { id: 'stem_separation',       name: 'Stem Separation',       desc: 'Isolate vocals, drums, bass and other stems',                           category: 'audio',      icon: Layers,      defaultOn: true  },
  { id: 'unlimited_generations', name: 'Unlimited Generations', desc: 'Remove daily/monthly generation limits for eligible plans',             category: 'limits',     icon: Zap,         defaultOn: false },
  { id: 'api_access',            name: 'API Access',            desc: 'Allow users to access platform via REST API',                           category: 'limits',     icon: Terminal,    defaultOn: false },
  { id: 'early_access',          name: 'Early Access Features', desc: 'Opt in to experimental unreleased features',                           category: 'limits',     icon: Flag,        defaultOn: false },
  { id: 'analytics',             name: 'Creator Analytics',     desc: 'Detailed playback, share and engagement insights per track',            category: 'limits',     icon: BarChart3,   defaultOn: true  },
];

const FLAG_CATEGORIES = ['all', 'studio', 'generation', 'social', 'audio', 'limits'];
const FLAG_CAT_COLORS = { studio: ROSE, generation: PURPLE, social: BLUE, audio: GREEN, limits: AMBER };

// Default plans seeded on first load if none exist
const SEED_PLANS = [
  {
    name: 'Free', description: 'Get started with AI music generation at no cost.',
    price_monthly: 0, daily_limit: 3, monthly_limit: 30, max_duration: 2,
    concurrent_jobs: 1, model_access: ['V4'],
    features: ['3 generations/day', 'Basic styles', 'Public library', 'Standard quality'],
    is_active: true, priority: 10,
  },
  {
    name: 'Pro', description: 'Unlock advanced generation, mastering, and stem separation.',
    price_monthly: 19, daily_limit: 25, monthly_limit: 300, max_duration: 4,
    concurrent_jobs: 3, model_access: ['V4', 'V4_5'],
    features: ['25 generations/day', 'Advanced mode', 'Mastering Studio', 'Stem separation', 'Voice clone', 'Priority queue', 'HD quality'],
    is_active: true, priority: 20,
  },
  {
    name: 'Ultra', description: 'Unlimited power for serious music creators and studios.',
    price_monthly: 49, daily_limit: 9999, monthly_limit: 9999, max_duration: 8,
    concurrent_jobs: 10, model_access: ['V4', 'V4_5', 'V4_TURBO'],
    features: ['Unlimited generations', 'All features', 'API access', 'Ultra quality', 'Remix + video generation', 'Early access', 'Dedicated support'],
    is_active: true, priority: 30,
  },
];

// ─────────────────────────────────────────────
// Shared small atoms
// ─────────────────────────────────────────────
function Pill({ children, color = ROSE }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: color + '22', color, border: '1px solid ' + color + '44' }}>
      {children}
    </span>
  );
}

function ToggleSwitch({ enabled, onChange, disabled = false }) {
  return (
    <button role="switch" aria-checked={enabled} disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={cn('relative w-11 h-6 rounded-full transition-all flex-shrink-0 focus:outline-none', disabled && 'opacity-40 cursor-not-allowed')}
      style={{ background: enabled ? GREEN : 'rgba(255,255,255,0.1)' }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: enabled ? '23px' : '2px' }} />
    </button>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent = ROSE }) {
  return (
    <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: BG2, border: '1px solid ' + BORD }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent + '18' }}>
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-white tabular-nums">{value}</p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: TEXT2 }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: TEXT3 }}>{sub}</p>}
      </div>
    </div>
  );
}

function DarkInput({ value, onChange, placeholder, className = '', ...rest }) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder}
      className={'w-full px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 ' + className}
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid ' + BORD, color: TEXT, caretColor: ROSE }}
      {...rest} />
  );
}

function DarkSelect({ value, onChange, options, className = '' }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={'px-3 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 ' + className}
      style={{ background: BG2, border: '1px solid ' + BORD, color: TEXT }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function TableHead({ children, onClick, sorted }) {
  return (
    <th onClick={onClick}
      className={cn('px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest select-none', onClick && 'cursor-pointer')}
      style={{ color: TEXT3, borderBottom: '1px solid ' + BORD }}>
      <span className="flex items-center gap-1">{children}{sorted && <SortAsc className="h-3 w-3" />}</span>
    </th>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <Icon className="h-6 w-6" style={{ color: TEXT3 }} />
      </div>
      <p className="text-sm" style={{ color: TEXT3 }}>{message}</p>
    </div>
  );
}

function ModalShell({ open, onClose, title, children, width = 'max-w-xl' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
        className={'w-full ' + width + ' rounded-2xl overflow-hidden shadow-2xl'} style={{ background: BG2, border: '1px solid ' + BORD }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid ' + BORD }}>
          <p className="font-bold text-white">{title}</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10">
            <X className="h-4 w-4" style={{ color: TEXT2 }} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[80vh]">{children}</div>
      </motion.div>
    </div>
  );
}

function useAdminGuard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== 'admin') { navigate(createPageUrl('Home')); return; }
      setUser(u);
    }).catch(() => navigate(createPageUrl('Home'))).finally(() => setLoading(false));
  }, [navigate]);
  return { user, loading };
}

const TTSTYLE = {
  contentStyle: { background: BG2, border: '1px solid ' + BORD, borderRadius: 12, color: TEXT, fontSize: 12 },
  labelStyle: { color: TEXT2 },
};

// ─────────────────────────────────────────────
// Overview Tab
// ─────────────────────────────────────────────
function OverviewTab({ users, tracks, plans }) {
  const activeUsers  = users.filter(u => u.account_status !== 'suspended').length;
  const publicTracks = tracks.filter(t => t.is_public).length;
  const genTracks    = tracks.filter(t => t.status === 'generating' || t.status === 'queued').length;
  const totalRevenue = users.reduce((acc, u) => {
    const plan = plans.find(p => p.id === u.plan_id);
    return acc + (plan?.price_monthly || 0);
  }, 0);

  const chartData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short' }),
      tracks: tracks.filter(t => t.created_date?.startsWith(key)).length,
      users:  users.filter(u  => u.created_date?.startsWith(key)).length,
    };
  }), [tracks, users]);

  const planDist = useMemo(() => [
    ...plans.map(p => ({ name: p.name, value: users.filter(u => u.plan_id === p.id).length })),
    { name: 'Free (no plan)', value: users.filter(u => !u.plan_id).length },
  ].filter(p => p.value > 0), [plans, users]);

  const statusDist = useMemo(() => [
    { name: 'Ready',      value: tracks.filter(t => t.status === 'ready').length },
    { name: 'Generating', value: tracks.filter(t => t.status === 'generating').length },
    { name: 'Queued',     value: tracks.filter(t => t.status === 'queued').length },
    { name: 'Failed',     value: tracks.filter(t => t.status === 'failed').length },
  ].filter(s => s.value > 0), [tracks]);

  const recentTracks = useMemo(() => [...tracks].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 6), [tracks]);
  const recentUsers  = useMemo(() => [...users ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5), [users]);
  const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Users"   value={users.length}       sub={activeUsers + ' active'}                          icon={Users}      accent={BLUE}   />
        <StatCard label="Total Tracks"  value={tracks.length}      sub={publicTracks + ' public · ' + genTracks + ' live'} icon={Music}      accent={ROSE}   />
        <StatCard label="Ready Tracks"  value={tracks.filter(t => t.status === 'ready').length} sub={Math.round(tracks.filter(t => t.status === 'ready').length / Math.max(1, tracks.length) * 100) + '% success rate'} icon={CheckCircle2} accent={GREEN} />
        <StatCard label="Est. MRR"      value={'$' + totalRevenue} sub={plans.length + ' active plans'}                   icon={DollarSign} accent={AMBER}  />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-4" style={{ background: BG2, border: '1px solid ' + BORD }}>
          <p className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: TEXT }}>
            <Activity className="h-4 w-4" style={{ color: ROSE }} /> Activity — Last 7 Days
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={ROSE}  stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ROSE}  stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREEN} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke={TEXT3} tick={{ fontSize: 11, fill: TEXT3 }} />
              <YAxis stroke={TEXT3} tick={{ fontSize: 11, fill: TEXT3 }} />
              <Tooltip {...TTSTYLE} />
              <Area type="monotone" dataKey="tracks" name="Tracks" stroke={ROSE}  fill="url(#gt)" strokeWidth={2} />
              <Area type="monotone" dataKey="users"  name="Users"  stroke={GREEN} fill="url(#gu)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-4" style={{ background: BG2, border: '1px solid ' + BORD }}>
          <p className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: TEXT }}>
            <Crown className="h-4 w-4" style={{ color: AMBER }} /> Plan Distribution
          </p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={planDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {planDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip {...TTSTYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {planDist.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span style={{ color: TEXT2 }}>{p.name}</span>
                </div>
                <span style={{ color: TEXT }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: BG2, border: '1px solid ' + BORD }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid ' + BORD }}>
            <p className="font-semibold text-sm" style={{ color: TEXT }}>Recent Tracks</p>
            <Pill color={ROSE}>{tracks.length}</Pill>
          </div>
          {recentTracks.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors" style={{ borderBottom: '1px solid ' + BORD2 }}>
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                {t.cover_image_url ? <img src={t.cover_image_url} className="w-full h-full object-cover" alt="" /> : <Music className="h-3.5 w-3.5 m-auto mt-2" style={{ color: TEXT3 }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>{t.title}</p>
                <p className="text-[10px]" style={{ color: TEXT3 }}>{t.created_by?.split('@')[0]} · {fmt(t.created_date)}</p>
              </div>
              <Pill color={t.status === 'ready' ? GREEN : t.status === 'failed' ? ROSE : AMBER}>{t.status}</Pill>
            </div>
          ))}
          {recentTracks.length === 0 && <EmptyState icon={Music} message="No tracks yet" />}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: BG2, border: '1px solid ' + BORD }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid ' + BORD }}>
            <p className="font-semibold text-sm" style={{ color: TEXT }}>Recent Signups</p>
            <Pill color={BLUE}>{users.length}</Pill>
          </div>
          {recentUsers.map(u => {
            const plan = plans.find(p => p.id === u.plan_id);
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors" style={{ borderBottom: '1px solid ' + BORD2 }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: BLUE + '22', color: BLUE }}>
                  {(u.full_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>{u.full_name || u.email}</p>
                  <p className="text-[10px]" style={{ color: TEXT3 }}>{fmt(u.created_date)}</p>
                </div>
                <Pill color={AMBER}>{plan?.name || 'Free'}</Pill>
              </div>
            );
          })}
          {recentUsers.length === 0 && <EmptyState icon={Users} message="No users yet" />}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: BG2, border: '1px solid ' + BORD }}>
        <p className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: TEXT }}>
          <BarChart3 className="h-4 w-4" style={{ color: PURPLE }} /> Track Status Breakdown
        </p>
        <div className="flex rounded-xl overflow-hidden h-4">
          {statusDist.map((s, i) => (
            <div key={s.name} title={s.name + ': ' + s.value} style={{ width: (s.value / Math.max(1, tracks.length) * 100) + '%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {statusDist.map((s, i) => (
            <div key={s.name} className="flex items-center gap-1 text-[11px]">
              <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span style={{ color: TEXT2 }}>{s.name}</span>
              <span className="font-bold" style={{ color: TEXT }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Users Tab
// ─────────────────────────────────────────────
function UsersTab({ users, plans, isLoading }) {
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [planFilter, setPlan]     = useState('all');
  const [sort, setSort]           = useState('created_date');
  const [sortDir, setSortDir]     = useState('desc');
  const [selected, setSelected]   = useState(null);
  const [editOpen, setEditOpen]   = useState(false);
  const [editData, setEditData]   = useState({});

  const updateUser = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); toast.success('User updated'); setEditOpen(false); },
    onError: () => toast.error('Update failed'),
  });

  const filtered = useMemo(() => {
    let r = users.filter(u => {
      const q = search.toLowerCase();
      return (!q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
          && (statusFilter === 'all' || u.account_status === statusFilter)
          && (planFilter === 'all' || u.plan_id === planFilter || (planFilter === 'free' && !u.plan_id));
    });
    return [...r].sort((a, b) => {
      let av = a[sort], bv = b[sort];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [users, search, statusFilter, planFilter, sort, sortDir]);

  const toggleSort = col => { if (sort === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSort(col); setSortDir('desc'); } };
  const openEdit = u => { setSelected(u); setEditData({ full_name: u.full_name || '', role: u.role || 'user', account_status: u.account_status || 'active', plan_id: u.plan_id || '', daily_usage: u.daily_usage || 0, monthly_usage: u.monthly_usage || 0 }); setEditOpen(true); };
  const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: TEXT3 }} />
          <DarkInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
        </div>
        <DarkSelect value={statusFilter} onChange={setStatus} options={[{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        <DarkSelect value={planFilter} onChange={setPlan} options={[{ value: 'all', label: 'All plans' }, { value: 'free', label: 'Free' }, ...plans.map(p => ({ value: p.id, label: p.name }))]} />
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid ' + BORD, color: TEXT2 }}>
          <Users className="h-4 w-4" /> {filtered.length}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid ' + BORD }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: ROSE }} /></div>
        ) : filtered.length === 0 ? <EmptyState icon={Users} message="No users match filters" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <TableHead onClick={() => toggleSort('full_name')} sorted={sort === 'full_name'}>User</TableHead>
                  <TableHead onClick={() => toggleSort('created_date')} sorted={sort === 'created_date'}>Joined</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead onClick={() => toggleSort('daily_usage')} sorted={sort === 'daily_usage'}>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const plan = plans.find(p => p.id === u.plan_id);
                  const limit = plan?.daily_limit || 3;
                  const pct = Math.min(100, ((u.daily_usage || 0) / limit) * 100);
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.025] transition-colors" style={{ borderTop: '1px solid ' + BORD2 }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: BLUE + '22', color: BLUE }}>
                            {(u.full_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>{u.full_name || '—'}</p>
                            <p className="text-[10px] truncate" style={{ color: TEXT3 }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: TEXT2 }}>{fmt(u.created_date)}</td>
                      <td className="px-4 py-3"><Pill color={plan ? AMBER : TEXT3}>{plan?.name || 'Free'}</Pill></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div className="h-full rounded-full" style={{ width: pct + '%', background: pct > 80 ? ROSE : GREEN }} />
                          </div>
                          <span className="text-[10px] tabular-nums" style={{ color: TEXT3 }}>{u.daily_usage || 0}/{limit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Pill color={u.account_status === 'suspended' ? ROSE : GREEN}>{u.account_status === 'suspended' ? 'Suspended' : 'Active'}</Pill></td>
                      <td className="px-4 py-3"><Pill color={u.role === 'admin' ? AMBER : TEXT3}>{u.role || 'user'}</Pill></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(u)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="Edit"><Edit2 className="h-3.5 w-3.5" style={{ color: TEXT2 }} /></button>
                          <button onClick={() => updateUser.mutate({ id: u.id, data: { account_status: u.account_status === 'suspended' ? 'active' : 'suspended' } })} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="Toggle suspend">
                            {u.account_status === 'suspended' ? <CheckCircle2 className="h-3.5 w-3.5" style={{ color: GREEN }} /> : <Ban className="h-3.5 w-3.5" style={{ color: ROSE }} />}
                          </button>
                          <button onClick={() => updateUser.mutate({ id: u.id, data: { daily_usage: 0, monthly_usage: 0 } })} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="Reset usage"><RefreshCw className="h-3.5 w-3.5" style={{ color: TEXT2 }} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editOpen && selected && (
          <ModalShell open={editOpen} onClose={() => setEditOpen(false)} title={'Edit — ' + selected.email}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Full Name</label>
                <DarkInput value={editData.full_name} onChange={e => setEditData(d => ({ ...d, full_name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Role</label>
                  <DarkSelect value={editData.role} onChange={v => setEditData(d => ({ ...d, role: v }))} options={[{ value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }]} className="w-full" />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Status</label>
                  <DarkSelect value={editData.account_status} onChange={v => setEditData(d => ({ ...d, account_status: v }))} options={[{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} className="w-full" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Plan</label>
                <DarkSelect value={editData.plan_id} onChange={v => setEditData(d => ({ ...d, plan_id: v }))} options={[{ value: '', label: 'Free (no plan)' }, ...plans.map(p => ({ value: p.id, label: p.name }))]} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Daily Usage</label>
                  <DarkInput type="number" value={editData.daily_usage} onChange={e => setEditData(d => ({ ...d, daily_usage: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Monthly Usage</label>
                  <DarkInput type="number" value={editData.monthly_usage} onChange={e => setEditData(d => ({ ...d, monthly_usage: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: TEXT2 }}>Cancel</button>
                <button onClick={() => updateUser.mutate({ id: selected.id, data: editData })} disabled={updateUser.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: ROSE, color: '#fff' }}>
                  {updateUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tracks Tab
// ─────────────────────────────────────────────
function TracksTab({ tracks, isLoading }) {
  const queryClient = useQueryClient();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState('all');
  const [vis, setVis]               = useState('all');
  const [sort, setSort]             = useState('created_date');
  const [sortDir, setSortDir]       = useState('desc');
  const [confirmId, setConfirmId]   = useState(null);

  const deleteTrack = useMutation({
    mutationFn: id => base44.entities.Track.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminTracks'] }); toast.success('Track deleted'); setConfirmId(null); },
    onError: () => toast.error('Delete failed'),
  });
  const toggleVis = useMutation({
    mutationFn: ({ id, is_public }) => base44.entities.Track.update(id, { is_public: !is_public }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminTracks'] }),
  });

  const filtered = useMemo(() => {
    let r = tracks.filter(t => {
      const q = search.toLowerCase();
      return (!q || t.title?.toLowerCase().includes(q) || t.created_by?.toLowerCase().includes(q) || t.style?.toLowerCase().includes(q))
          && (status === 'all' || t.status === status)
          && (vis === 'all' || (vis === 'public' && t.is_public) || (vis === 'private' && !t.is_public));
    });
    return [...r].sort((a, b) => {
      let av = a[sort], bv = b[sort];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }, [tracks, search, status, vis, sort, sortDir]);

  const toggleSort = col => { if (sort === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSort(col); setSortDir('desc'); } };
  const fmt = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—';
  const dur = s => s ? Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2, '0') : '—';
  const statusColor = { ready: GREEN, generating: BLUE, queued: AMBER, failed: ROSE };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: TEXT3 }} />
          <DarkInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, creator, style…" className="pl-9" />
        </div>
        <DarkSelect value={status} onChange={setStatus} options={[{ value: 'all', label: 'All status' }, { value: 'ready', label: 'Ready' }, { value: 'generating', label: 'Generating' }, { value: 'queued', label: 'Queued' }, { value: 'failed', label: 'Failed' }]} />
        <DarkSelect value={vis} onChange={setVis} options={[{ value: 'all', label: 'All visibility' }, { value: 'public', label: 'Public' }, { value: 'private', label: 'Private' }]} />
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid ' + BORD, color: TEXT2 }}>
          <Music className="h-4 w-4" /> {filtered.length}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid ' + BORD }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: ROSE }} /></div>
        ) : filtered.length === 0 ? <EmptyState icon={Music} message="No tracks match filters" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <TableHead onClick={() => toggleSort('title')} sorted={sort === 'title'}>Track</TableHead>
                  <TableHead onClick={() => toggleSort('created_by')} sorted={sort === 'created_by'}>Creator</TableHead>
                  <TableHead onClick={() => toggleSort('created_date')} sorted={sort === 'created_date'}>Date</TableHead>
                  <TableHead>Dur.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Visibility</TableHead>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-white/[0.025] transition-colors" style={{ borderTop: '1px solid ' + BORD2 }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {t.cover_image_url ? <img src={t.cover_image_url} className="w-full h-full object-cover" alt="" /> : <Music className="h-3.5 w-3.5 m-2.5" style={{ color: TEXT3 }} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>{t.title}</p>
                          <p className="text-[10px] truncate" style={{ color: TEXT3 }}>{t.style || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs truncate max-w-32" style={{ color: TEXT2 }}>{t.created_by?.split('@')[0] || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: TEXT2 }}>{fmt(t.created_date)}</td>
                    <td className="px-4 py-3 text-xs tabular-nums" style={{ color: TEXT2 }}>{dur(t.duration)}</td>
                    <td className="px-4 py-3"><Pill color={statusColor[t.status] || TEXT3}>{t.status}</Pill></td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: t.is_public ? GREEN : TEXT3 }}>
                        {t.is_public ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        {t.is_public ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {(t.audio_url || t.stream_audio_url) && (
                          <button onClick={() => playTrack(t)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10" title="Play">
                            {currentTrack?.id === t.id && isPlaying ? <Pause className="h-3.5 w-3.5" style={{ color: GREEN }} /> : <Play className="h-3.5 w-3.5" style={{ color: TEXT2 }} />}
                          </button>
                        )}
                        <button onClick={() => toggleVis.mutate({ id: t.id, is_public: t.is_public })} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10">
                          {t.is_public ? <EyeOff className="h-3.5 w-3.5" style={{ color: TEXT2 }} /> : <Eye className="h-3.5 w-3.5" style={{ color: TEXT2 }} />}
                        </button>
                        <button onClick={() => setConfirmId(t.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10">
                          <Trash2 className="h-3.5 w-3.5" style={{ color: ROSE }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmId && (
          <ModalShell open={!!confirmId} onClose={() => setConfirmId(null)} title="Delete Track" width="max-w-sm">
            <p className="text-sm mb-5" style={{ color: TEXT2 }}>This will permanently delete the track and cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmId(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: TEXT2 }}>Cancel</button>
              <button onClick={() => deleteTrack.mutate(confirmId)} disabled={deleteTrack.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: ROSE, color: '#fff' }}>
                {deleteTrack.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Delete
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// Plans Tab
// ─────────────────────────────────────────────
function PlansTab({ plans, users, isLoading }) {
  const queryClient = useQueryClient();
  const [planOpen, setPlanOpen]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [form, setForm]             = useState({});
  const [newFeature, setNewFeature] = useState('');
  const [seeding, setSeeding]       = useState(false);

  const blankForm = { name: '', description: '', price_monthly: 0, daily_limit: 5, monthly_limit: 100, max_duration: 4, concurrent_jobs: 1, model_access: ['V4'], features: [], is_active: true, priority: 10 };
  const openCreate = () => { setEditing(null); setForm(blankForm); setPlanOpen(true); };
  const openEdit   = p  => { setEditing(p); setForm({ ...p, features: p.features || [], model_access: p.model_access || ['V4'] }); setPlanOpen(true); };

  const savePlan = useMutation({
    mutationFn: data => editing ? base44.entities.Plan.update(editing.id, data) : base44.entities.Plan.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminPlans'] }); setPlanOpen(false); toast.success(editing ? 'Plan updated' : 'Plan created'); },
    onError: () => toast.error('Save failed'),
  });
  const deletePlan = useMutation({
    mutationFn: id => base44.entities.Plan.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminPlans'] }); toast.success('Plan deleted'); setConfirmDel(null); },
    onError: () => toast.error('Delete failed'),
  });
  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Plan.update(id, { is_active: !is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminPlans'] }),
  });

  const seedPlans = async () => {
    setSeeding(true);
    try {
      for (const p of SEED_PLANS) {
        if (!plans.find(x => x.name === p.name)) await base44.entities.Plan.create(p);
      }
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      toast.success('Default plans seeded!');
    } catch { toast.error('Seed failed'); }
    finally { setSeeding(false); }
  };

  const addFeature = () => {
    const t = newFeature.trim();
    if (!t || form.features?.includes(t)) return;
    setForm(f => ({ ...f, features: [...(f.features || []), t] }));
    setNewFeature('');
  };

  const MODEL_OPTIONS = ['V4', 'V4_5', 'V4_TURBO', 'CHIRP_3_0', 'CHIRP_3_5'];
  const planAccents = { Free: TEXT2, Pro: BLUE, Ultra: AMBER };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: ROSE, color: '#fff' }}>
          <Plus className="h-4 w-4" /> New Plan
        </button>
        {plans.length === 0 && (
          <button onClick={seedPlans} disabled={seeding} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid ' + BORD, color: TEXT2 }}>
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Boxes className="h-4 w-4" />} Seed Default Plans
          </button>
        )}
        <div className="ml-auto text-xs" style={{ color: TEXT3 }}>{plans.length} plans</div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: ROSE }} /></div>
      ) : plans.length === 0 ? (
        <EmptyState icon={Crown} message="No plans yet — seed default plans to start" />
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map(plan => {
            const planUsers = users.filter(u => u.plan_id === plan.id).length;
            const accent = planAccents[plan.name] || PURPLE;
            return (
              <div key={plan.id} className="rounded-2xl overflow-hidden" style={{ background: BG2, border: '1px solid ' + (plan.is_active ? accent + '44' : BORD) }}>
                <div className="p-4" style={{ borderBottom: '1px solid ' + BORD }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-extrabold text-lg" style={{ color: accent }}>{plan.name}</p>
                        {!plan.is_active && <Pill color={TEXT3}>Inactive</Pill>}
                      </div>
                      <p className="text-xs" style={{ color: TEXT2 }}>{plan.description}</p>
                    </div>
                    <p className="text-2xl font-extrabold flex-shrink-0" style={{ color: TEXT }}>
                      {plan.price_monthly === 0 ? 'Free' : '$' + plan.price_monthly}
                      {plan.price_monthly > 0 && <span className="text-xs font-normal ml-0.5" style={{ color: TEXT3 }}>/mo</span>}
                    </p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: 'Daily', value: plan.daily_limit >= 9999 ? '∞' : plan.daily_limit },
                      { label: 'Monthly', value: plan.monthly_limit >= 9999 ? '∞' : plan.monthly_limit },
                      { label: 'Max duration', value: plan.max_duration + 'min' },
                      { label: 'Concurrent', value: plan.concurrent_jobs },
                      { label: 'Users', value: planUsers },
                      { label: 'Priority', value: plan.priority },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <span style={{ color: TEXT3 }}>{s.label}</span>
                        <span className="font-bold tabular-nums" style={{ color: TEXT }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(plan.features || []).slice(0, 4).map((f, i) => <Pill key={i} color={accent}>{f}</Pill>)}
                    {(plan.features || []).length > 4 && <Pill color={TEXT3}>+{(plan.features || []).length - 4}</Pill>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(plan.model_access || []).map(m => <Pill key={m} color={BLUE}>{m}</Pill>)}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openEdit(plan)} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: 'rgba(255,255,255,0.07)', color: TEXT2 }}>
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button onClick={() => toggleActive.mutate({ id: plan.id, is_active: plan.is_active })} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: plan.is_active ? GREEN + '22' : 'rgba(255,255,255,0.07)', color: plan.is_active ? GREEN : TEXT2 }}>
                      {plan.is_active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XSquare className="h-3.5 w-3.5" />}
                      {plan.is_active ? 'Active' : 'Disabled'}
                    </button>
                    <button onClick={() => setConfirmDel(plan.id)} className="w-8 py-2 rounded-xl flex items-center justify-center hover:bg-rose-500/20" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <Trash2 className="h-3.5 w-3.5" style={{ color: ROSE }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {planOpen && (
          <ModalShell open={planOpen} onClose={() => setPlanOpen(false)} title={editing ? 'Edit — ' + editing.name : 'New Plan'} width="max-w-2xl">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Plan Name</label>
                <DarkInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Pro" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Description</label>
                <DarkInput value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
              </div>
              {[{ key: 'price_monthly', label: 'Monthly Price ($)' }, { key: 'daily_limit', label: 'Daily Limit' }, { key: 'monthly_limit', label: 'Monthly Limit' }, { key: 'max_duration', label: 'Max Duration (min)' }, { key: 'concurrent_jobs', label: 'Concurrent Jobs' }, { key: 'priority', label: 'Priority' }].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>{label}</label>
                  <DarkInput type="number" value={form[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Model Access</label>
                <div className="flex flex-wrap gap-2">
                  {MODEL_OPTIONS.map(m => {
                    const active = (form.model_access || []).includes(m);
                    return (
                      <button key={m} onClick={() => setForm(f => { const cur = f.model_access || []; return { ...f, model_access: cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m] }; })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: active ? BLUE + '33' : 'rgba(255,255,255,0.05)', color: active ? BLUE : TEXT3, border: '1px solid ' + (active ? BLUE + '55' : BORD) }}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Features</label>
                <div className="flex gap-2 mb-2">
                  <DarkInput value={newFeature} onChange={e => setNewFeature(e.target.value)} placeholder="Add feature…" onKeyDown={e => e.key === 'Enter' && addFeature()} className="flex-1" />
                  <button onClick={addFeature} className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: ROSE + '22', color: ROSE }}>Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(form.features || []).map((f, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: ROSE + '18', color: ROSE, border: '1px solid ' + ROSE + '33' }}>
                      {f} <button onClick={() => setForm(fd => ({ ...fd, features: fd.features.filter((_, j) => j !== i) }))}><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ToggleSwitch enabled={!!form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <span className="text-xs font-semibold" style={{ color: TEXT2 }}>Active</span>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setPlanOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: TEXT2 }}>Cancel</button>
              <button onClick={() => savePlan.mutate(form)} disabled={savePlan.isPending || !form.name} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: ROSE, color: '#fff' }}>
                {savePlan.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </ModalShell>
        )}
        {confirmDel && (
          <ModalShell open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete Plan" width="max-w-sm">
            <p className="text-sm mb-5" style={{ color: TEXT2 }}>Users on this plan will revert to Free tier. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: TEXT2 }}>Cancel</button>
              <button onClick={() => deletePlan.mutate(confirmDel)} disabled={deletePlan.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: ROSE, color: '#fff' }}>
                {deletePlan.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Delete
              </button>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// Feature Flags Tab
// ─────────────────────────────────────────────
function FeatureFlagsTab({ users }) {
  const [flags, setFlags] = useState(() => {
    try { const s = localStorage.getItem('admin_feature_flags'); if (s) return JSON.parse(s); } catch {}
    const init = {};
    DEFAULT_FLAGS.forEach(f => { init[f.id] = { enabled: f.defaultOn, roles: ['admin', 'user'] }; });
    return init;
  });
  const [category, setCategory]   = useState('all');
  const [search, setSearch]       = useState('');
  const [saving, setSaving]       = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userFlagUser, setUserFlagUser] = useState(null);
  const [userOverrides, setUserOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_flag_overrides') || '{}'); } catch { return {}; }
  });

  const saveFlags = async () => {
    setSaving(true);
    try {
      localStorage.setItem('admin_feature_flags', JSON.stringify(flags));
      localStorage.setItem('admin_flag_overrides', JSON.stringify(userOverrides));
      toast.success('Feature flags saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const resetFlags = () => {
    const init = {};
    DEFAULT_FLAGS.forEach(f => { init[f.id] = { enabled: f.defaultOn, roles: ['admin', 'user'] }; });
    setFlags(init);
    localStorage.removeItem('admin_feature_flags');
    toast.success('Reset to defaults');
  };

  const toggleFlag = id => setFlags(p => ({ ...p, [id]: { ...p[id], enabled: !p[id]?.enabled } }));
  const toggleRole = (id, role) => setFlags(p => {
    const cur = p[id]?.roles || [];
    return { ...p, [id]: { ...p[id], roles: cur.includes(role) ? cur.filter(r => r !== role) : [...cur, role] } };
  });
  const toggleUserOverride = (userId, flagId) => {
    const key = userId + '__' + flagId;
    setUserOverrides(p => ({ ...p, [key]: !p[key] }));
  };

  const filteredFlags = DEFAULT_FLAGS.filter(f => {
    const mC = category === 'all' || f.category === category;
    const mS = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.desc.toLowerCase().includes(search.toLowerCase());
    return mC && mS;
  });
  const enabledCount = Object.values(flags).filter(f => f.enabled).length;
  const filteredUsers = users.filter(u => !userSearch || u.email?.toLowerCase().includes(userSearch.toLowerCase()) || u.full_name?.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: GREEN + '18', color: GREEN, border: '1px solid ' + GREEN + '33' }}>
          <CheckCircle2 className="h-3.5 w-3.5" /> {enabledCount} enabled
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(255,255,255,0.05)', color: TEXT2, border: '1px solid ' + BORD }}>
          <Flag className="h-3.5 w-3.5" /> {DEFAULT_FLAGS.length} total
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={resetFlags} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-white/10" style={{ color: TEXT2 }}>
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </button>
          <button onClick={saveFlags} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold" style={{ background: ROSE, color: '#fff' }}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save All
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: TEXT3 }} />
          <DarkInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search flags…" className="pl-9" />
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORD }}>
          {FLAG_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors"
              style={{ background: category === c ? (FLAG_CAT_COLORS[c] || ROSE) + '33' : 'transparent', color: category === c ? (FLAG_CAT_COLORS[c] || ROSE) : TEXT2 }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2">
        {filteredFlags.map(flag => {
          const state = flags[flag.id] || { enabled: flag.defaultOn, roles: ['admin', 'user'] };
          const catColor = FLAG_CAT_COLORS[flag.category] || PURPLE;
          const Icon = flag.icon;
          return (
            <div key={flag.id} className="rounded-2xl p-4 transition-all" style={{ background: BG2, border: '1px solid ' + (state.enabled ? catColor + '30' : BORD) }}>
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: catColor + '18' }}>
                  <Icon className="h-4 w-4" style={{ color: catColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-0.5">
                    <p className="text-sm font-bold" style={{ color: state.enabled ? TEXT : TEXT2 }}>{flag.name}</p>
                    <ToggleSwitch enabled={state.enabled} onChange={() => toggleFlag(flag.id)} />
                  </div>
                  <p className="text-xs mb-2" style={{ color: TEXT3 }}>{flag.desc}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill color={catColor}>{flag.category}</Pill>
                    {['admin', 'user'].map(role => {
                      const active = (state.roles || []).includes(role);
                      return (
                        <button key={role} onClick={() => state.enabled && toggleRole(flag.id, role)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors"
                          style={{ background: active ? catColor + '22' : 'rgba(255,255,255,0.05)', color: active ? catColor : TEXT3, border: '1px solid ' + (active ? catColor + '44' : BORD), opacity: state.enabled ? 1 : 0.5, cursor: state.enabled ? 'pointer' : 'default' }}>
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid ' + BORD }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid ' + BORD, background: 'rgba(255,255,255,0.02)' }}>
          <p className="font-semibold text-sm flex items-center gap-2" style={{ color: TEXT }}>
            <UserCheck className="h-4 w-4" style={{ color: PURPLE }} /> Per-User Overrides
          </p>
        </div>
        <div className="p-4 space-y-3">
          <DarkInput value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserFlagUser(null); }} placeholder="Search user…" />
          {userFlagUser ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: BLUE + '22', color: BLUE }}>
                  {(userFlagUser.full_name?.[0] || userFlagUser.email?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: TEXT }}>{userFlagUser.full_name || userFlagUser.email}</p>
                  <p className="text-[10px]" style={{ color: TEXT3 }}>{userFlagUser.email}</p>
                </div>
                <button onClick={() => setUserFlagUser(null)} className="ml-auto p-1 hover:bg-white/10 rounded-lg"><X className="h-3.5 w-3.5" style={{ color: TEXT3 }} /></button>
              </div>
              <div className="grid gap-1.5 max-h-64 overflow-y-auto">
                {DEFAULT_FLAGS.map(flag => {
                  const key = userFlagUser.id + '__' + flag.id;
                  const globalEnabled = flags[flag.id]?.enabled ?? flag.defaultOn;
                  const overrideVal = userOverrides[key];
                  const effective = overrideVal !== undefined ? overrideVal : globalEnabled;
                  return (
                    <div key={flag.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD2 }}>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: TEXT }}>{flag.name}</p>
                        <p className="text-[10px]" style={{ color: TEXT3 }}>Global: {globalEnabled ? 'on' : 'off'}{overrideVal !== undefined ? ' · overridden' : ''}</p>
                      </div>
                      <ToggleSwitch enabled={effective} onChange={() => toggleUserOverride(userFlagUser.id, flag.id)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid gap-1.5 max-h-56 overflow-y-auto">
              {filteredUsers.slice(0, 20).map(u => (
                <button key={u.id} onClick={() => setUserFlagUser(u)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.04] transition-colors"
                  style={{ border: '1px solid ' + BORD2 }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: BLUE + '22', color: BLUE }}>
                    {(u.full_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>{u.full_name || u.email}</p>
                    <p className="text-[10px]" style={{ color: TEXT3 }}>{u.email}</p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 ml-auto -rotate-90 flex-shrink-0" style={{ color: TEXT3 }} />
                </button>
              ))}
              {filteredUsers.length === 0 && <p className="text-xs text-center py-4" style={{ color: TEXT3 }}>No users found</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Insights Tab
// ─────────────────────────────────────────────
function InsightsTab({ tracks, users }) {
  const topCreators = useMemo(() => {
    const map = {};
    tracks.forEach(t => { if (t.created_by) map[t.created_by] = (map[t.created_by] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([email, count]) => ({ email, count }));
  }, [tracks]);

  const styleFreq = useMemo(() => {
    const map = {};
    tracks.forEach(t => {
      (t.style || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).slice(0, 3).forEach(tag => { map[tag] = (map[tag] || 0) + 1; });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([style, count]) => ({ style, count }));
  }, [tracks]);

  const publicRatio = tracks.length > 0 ? Math.round(tracks.filter(t => t.is_public).length / tracks.length * 100) : 0;
  const instrRatio  = tracks.length > 0 ? Math.round(tracks.filter(t => t.is_instrumental).length / tracks.length * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Public Ratio"   value={publicRatio + '%'} sub="of all tracks"            icon={Globe}    accent={GREEN}  />
        <StatCard label="Instrumental"   value={instrRatio + '%'}  sub="no vocals"                icon={Music}    accent={PURPLE} />
        <StatCard label="Style Tags"     value={styleFreq.length}  sub="unique genres detected"   icon={Hash}     accent={BLUE}   />
        <StatCard label="Top Creator"    value={topCreators[0]?.count || 0} sub={topCreators[0]?.email?.split('@')[0] || '—'} icon={Star} accent={AMBER} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4" style={{ background: BG2, border: '1px solid ' + BORD }}>
          <p className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: TEXT }}>
            <Star className="h-4 w-4" style={{ color: AMBER }} /> Top Creators
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topCreators} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" stroke={TEXT3} tick={{ fontSize: 11, fill: TEXT3 }} />
              <YAxis type="category" dataKey="email" width={100} tickFormatter={v => v?.split('@')[0]} stroke={TEXT3} tick={{ fontSize: 11, fill: TEXT3 }} />
              <Tooltip {...TTSTYLE} formatter={v => [v, 'Tracks']} />
              <Bar dataKey="count" fill={ROSE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-4" style={{ background: BG2, border: '1px solid ' + BORD }}>
          <p className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: TEXT }}>
            <Music className="h-4 w-4" style={{ color: PURPLE }} /> Top Style Tags
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={styleFreq} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" stroke={TEXT3} tick={{ fontSize: 11, fill: TEXT3 }} />
              <YAxis type="category" dataKey="style" width={100} tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v} stroke={TEXT3} tick={{ fontSize: 11, fill: TEXT3 }} />
              <Tooltip {...TTSTYLE} formatter={v => [v, 'Tracks']} />
              <Bar dataKey="count" fill={PURPLE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: BG2, border: '1px solid ' + BORD }}>
        <p className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: TEXT }}>
          <Layers className="h-4 w-4" style={{ color: GREEN }} /> Library Composition
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: 'Public vs Private', a: { label: 'Public', val: tracks.filter(t => t.is_public).length, color: GREEN }, b: { label: 'Private', val: tracks.filter(t => !t.is_public).length, color: TEXT3 } },
            { label: 'Vocal vs Instrumental', a: { label: 'Vocal', val: tracks.filter(t => !t.is_instrumental).length, color: PURPLE }, b: { label: 'Instrumental', val: tracks.filter(t => t.is_instrumental).length, color: BLUE } },
            { label: 'Ready vs Processing', a: { label: 'Ready', val: tracks.filter(t => t.status === 'ready').length, color: GREEN }, b: { label: 'Other', val: tracks.filter(t => t.status !== 'ready').length, color: AMBER } },
          ].map(({ label, a, b }) => {
            const total = a.val + b.val;
            const pA = total > 0 ? Math.round(a.val / total * 100) : 0;
            return (
              <div key={label} className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: TEXT2 }}>{label}</p>
                <div className="flex rounded-lg overflow-hidden h-3">
                  <div style={{ width: pA + '%', background: a.color }} />
                  <div style={{ width: (100 - pA) + '%', background: 'rgba(255,255,255,0.08)' }} />
                </div>
                <div className="flex justify-between text-[11px]">
                  <span style={{ color: a.color }}>{a.label} {a.val}</span>
                  <span style={{ color: TEXT3 }}>{b.label} {b.val}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// System Tab
// ─────────────────────────────────────────────
function SystemTab({ tracks, users }) {
  const [maintenanceMode, setMaintenanceMode] = useState(() => localStorage.getItem('admin_maintenance') === 'true');
  const [rateLimit, setRateLimit]             = useState(() => Number(localStorage.getItem('admin_rate_limit') || 100));
  const [maxFileMB, setMaxFileMB]             = useState(() => Number(localStorage.getItem('admin_max_file_mb') || 50));
  const [saving, setSaving]                   = useState(false);
  const [announcements, setAnnouncements] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_announcements') || '[]'); } catch { return []; }
  });
  const [newAnnounce, setNewAnnounce] = useState('');
  const [announceType, setAnnounceType] = useState('info');

  const saveSystem = () => {
    setSaving(true);
    localStorage.setItem('admin_maintenance', String(maintenanceMode));
    localStorage.setItem('admin_rate_limit', String(rateLimit));
    localStorage.setItem('admin_max_file_mb', String(maxFileMB));
    localStorage.setItem('admin_announcements', JSON.stringify(announcements));
    setTimeout(() => { setSaving(false); toast.success('System settings saved'); }, 400);
  };

  const addAnnouncement = () => {
    if (!newAnnounce.trim()) return;
    setAnnouncements(a => [{ id: Date.now(), text: newAnnounce.trim(), type: announceType, createdAt: new Date().toISOString() }, ...a]);
    setNewAnnounce('');
  };

  const failedTracks   = tracks.filter(t => t.status === 'failed').length;
  const failRate       = tracks.length > 0 ? Math.round(failedTracks / tracks.length * 100) : 0;
  const suspendedUsers = users.filter(u => u.account_status === 'suspended').length;
  const avgDuration    = tracks.filter(t => t.duration).reduce((a, t) => a + t.duration, 0) / Math.max(1, tracks.filter(t => t.duration).length);
  const annColors      = { info: BLUE, warning: AMBER, error: ROSE, success: GREEN };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Generation Fail Rate" value={failRate + '%'}    sub={failedTracks + ' failed tracks'}      icon={AlertTriangle} accent={failRate > 10 ? ROSE : GREEN} />
        <StatCard label="Suspended Users"      value={suspendedUsers}    sub={'of ' + users.length + ' total'}      icon={Ban}           accent={suspendedUsers > 0 ? AMBER : GREEN} />
        <StatCard label="Avg Track Duration"   value={Math.round(avgDuration || 0) + 's'} sub="across ready tracks" icon={Clock}         accent={BLUE} />
        <StatCard label="System Status"        value={maintenanceMode ? 'Maintenance' : 'Live'} sub="current state"   icon={Server}        accent={maintenanceMode ? ROSE : GREEN} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 space-y-4" style={{ background: BG2, border: '1px solid ' + BORD }}>
          <p className="font-semibold text-sm flex items-center gap-2" style={{ color: TEXT }}>
            <Server className="h-4 w-4" style={{ color: ROSE }} /> Server Controls
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>Maintenance Mode</p>
              <p className="text-xs" style={{ color: TEXT3 }}>Blocks all new generation requests</p>
            </div>
            <ToggleSwitch enabled={maintenanceMode} onChange={setMaintenanceMode} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Global Rate Limit (req/min)</label>
            <DarkInput type="number" value={rateLimit} onChange={e => setRateLimit(Number(e.target.value))} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: TEXT2 }}>Max Upload File Size (MB)</label>
            <DarkInput type="number" value={maxFileMB} onChange={e => setMaxFileMB(Number(e.target.value))} />
          </div>
        </div>

        <div className="rounded-2xl p-4 space-y-3" style={{ background: BG2, border: '1px solid ' + BORD }}>
          <p className="font-semibold text-sm flex items-center gap-2" style={{ color: TEXT }}>
            <Bell className="h-4 w-4" style={{ color: AMBER }} /> Platform Announcements
          </p>
          <div className="flex gap-2">
            <DarkInput value={newAnnounce} onChange={e => setNewAnnounce(e.target.value)} placeholder="Announcement text…" className="flex-1" onKeyDown={e => e.key === 'Enter' && addAnnouncement()} />
            <DarkSelect value={announceType} onChange={setAnnounceType} options={[{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'error', label: 'Error' }, { value: 'success', label: 'Success' }]} />
            <button onClick={addAnnouncement} className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: ROSE, color: '#fff' }}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {announcements.length === 0 ? <p className="text-xs text-center py-4" style={{ color: TEXT3 }}>No announcements</p> : announcements.map(a => (
              <div key={a.id} className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ background: (annColors[a.type] || BLUE) + '14', border: '1px solid ' + (annColors[a.type] || BLUE) + '33' }}>
                <p className="text-xs flex-1" style={{ color: TEXT2 }}>{a.text}</p>
                <Pill color={annColors[a.type]}>{a.type}</Pill>
                <button onClick={() => setAnnouncements(x => x.filter(i => i.id !== a.id))}><X className="h-3.5 w-3.5" style={{ color: TEXT3 }} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: ROSE + '0a', border: '1px solid ' + ROSE + '33' }}>
        <p className="font-semibold text-sm flex items-center gap-2 mb-3" style={{ color: ROSE }}>
          <AlertTriangle className="h-4 w-4" /> Danger Zone
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { label: 'Flush Cache', desc: 'Clear server-side query caches', icon: HardDrive },
            { label: 'Reset All Usage', desc: 'Zero daily/monthly counters for all users', icon: RefreshCw },
            { label: 'Export Data', desc: 'Download platform data as JSON', icon: Download },
          ].map(({ label, desc, icon: Icon }) => (
            <button key={label}
              onClick={() => {
                if (label === 'Export Data') {
                  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), users: users.length, tracks: tracks.length }, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'accoustica-export.json'; a.click(); URL.revokeObjectURL(url);
                  toast.success('Export downloaded');
                } else {
                  toast.info(label + ' — connect to your backend API');
                }
              }}
              className="flex items-start gap-3 p-3 rounded-xl text-left hover:bg-rose-500/10 transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(225,29,72,0.2)' }}>
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: ROSE }} />
              <div>
                <p className="text-xs font-bold" style={{ color: TEXT }}>{label}</p>
                <p className="text-[10px]" style={{ color: TEXT3 }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={saveSystem} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: ROSE, color: '#fff' }}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save System Settings
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page export
// ─────────────────────────────────────────────
const PAGE_TABS = [
  { id: 'overview', label: 'Overview',      icon: LayoutDashboard },
  { id: 'users',    label: 'Users',         icon: Users           },
  { id: 'tracks',   label: 'Tracks',        icon: Music           },
  { id: 'plans',    label: 'Plans',         icon: Crown           },
  { id: 'flags',    label: 'Feature Flags', icon: Flag            },
  { id: 'insights', label: 'Insights',      icon: BarChart3       },
  { id: 'system',   label: 'System',        icon: Settings        },
];

export default function AdminDashboardPage() {
  const { user, loading } = useAdminGuard();
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  const { data: users  = [], isLoading: usersLoading  } = useQuery({ queryKey: ['adminUsers'],  queryFn: () => base44.entities.User.list(),                       enabled: !!user });
  const { data: tracks = [], isLoading: tracksLoading } = useQuery({ queryKey: ['adminTracks'], queryFn: () => base44.entities.Track.list('-created_date', 500), enabled: !!user });
  const { data: plans  = [], isLoading: plansLoading  } = useQuery({ queryKey: ['adminPlans'],  queryFn: () => base44.entities.Plan.list('priority'),            enabled: !!user });

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['adminUsers']  });
    queryClient.invalidateQueries({ queryKey: ['adminTracks'] });
    queryClient.invalidateQueries({ queryKey: ['adminPlans']  });
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: BG }}>
      <div className="w-10 h-10 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-5 py-3" style={{ background: BG + 'f5', borderBottom: '1px solid ' + BORD, backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ROSE + '22' }}>
            <Crown className="h-5 w-5" style={{ color: ROSE }} />
          </div>
          <div>
            <p className="font-extrabold text-base" style={{ color: TEXT }}>Admin Console</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT3 }}>Accoustica AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetchAll} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10" title="Refresh">
            <RefreshCw className="h-4 w-4" style={{ color: TEXT2 }} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: GREEN + '18', color: GREEN, border: '1px solid ' + GREEN + '33' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} /> Live
          </div>
          <p className="text-xs hidden md:block" style={{ color: TEXT3 }}>{user?.email}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab nav */}
        <div className="flex gap-1 p-1 rounded-2xl mb-6 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}>
          {PAGE_TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
                style={{ background: active ? ROSE + '22' : 'transparent', color: active ? ROSE : TEXT2, border: '1px solid ' + (active ? ROSE + '44' : 'transparent') }}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
            {activeTab === 'overview' && <OverviewTab users={users} tracks={tracks} plans={plans} />}
            {activeTab === 'users'    && <UsersTab    users={users} plans={plans} isLoading={usersLoading} />}
            {activeTab === 'tracks'   && <TracksTab   tracks={tracks} isLoading={tracksLoading} />}
            {activeTab === 'plans'    && <PlansTab    plans={plans} users={users} isLoading={plansLoading} />}
            {activeTab === 'flags'    && <FeatureFlagsTab users={users} />}
            {activeTab === 'insights' && <InsightsTab tracks={tracks} users={users} />}
            {activeTab === 'system'   && <SystemTab   tracks={tracks} users={users} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
