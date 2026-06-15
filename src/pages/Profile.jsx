import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/exportClient';
import * as trackClient from '@/api/trackClient';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { createPageUrl } from '@/utils';
import {
  Award,
  Check,
  Crown,
  Heart,
  LogOut,
  Music,
  Image as ImageIcon,
  Save,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  User,
  Upload,
  Volume2,
  Zap,
  Trash2,
  Sliders,
} from 'lucide-react';
import SoundProfilePanel from '@/components/settings/SoundProfilePanel';

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'badges', label: 'Badges', icon: Award },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const DEFAULT_AUDIO = {
  defaultVolume: 70,
  playbackQuality: 'high',
  loudnessNormalization: true,
  autoplayNext: true,
  crossfadeSeconds: 0,
  visualizerIntensity: 65,
  preferredMastering: 'balanced',
};

const DEFAULT_UI = {
  compactLibrary: false,
  highContrastWaveforms: true,
  reducedMotion: false,
  mobileBottomSheets: true,
};

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return { ...fallback, ...value };
  try {
    return { ...fallback, ...JSON.parse(value) };
  } catch {
    return fallback;
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [profileForm, setProfileForm] = useState({ full_name: '', artist_name: '', avatar_url: '', banner_url: '', bio: '', profile_visibility: 'private', hide_email: false });
  const [audioSettings, setAudioSettings] = useState(DEFAULT_AUDIO);
  const [uiPreferences, setUiPreferences] = useState(DEFAULT_UI);
  const { changeVolume } = useAudioPlayer();

  useEffect(() => {
    base44.auth.me().then((currentUser) => {
      setUser(currentUser);
      setProfileForm({
        full_name: currentUser.full_name || '',
        artist_name: currentUser.artist_name || '',
        avatar_url: currentUser.avatar_url || '',
        banner_url: currentUser.banner_url || '',
        bio: currentUser.bio || '',
        profile_visibility: currentUser.profile_visibility || 'private',
        hide_email: currentUser.hide_email || false,
      });
      setAudioSettings(parseJson(currentUser.audio_settings, DEFAULT_AUDIO));
      setUiPreferences(parseJson(currentUser.ui_preferences, DEFAULT_UI));
    });
  }, []);

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => base44.entities.Plan.list(),
  });

  const { data: tracks = [] } = useQuery({
    queryKey: ['userTracks', user?.email],
    queryFn: () => trackClient.listTracks({ created_by: user.email }, '-created_date', 100),
    enabled: !!user?.email,
  });

  const plan = useMemo(() => {
    if (!plans.length) return null;
    return (user?.plan_id ? plans.find(p => p.id === user.plan_id) : null)
      || plans.find(p => p.name?.toLowerCase() === 'free')
      || plans[0];
  }, [plans, user?.plan_id]);

  const stats = useMemo(() => {
    const ready = tracks.filter(t => t.status === 'ready');
    const publicTracks = tracks.filter(t => t.is_public);
    const favorites = tracks.filter(t => t.is_favorite);
    return {
      total: tracks.length,
      ready: ready.length,
      public: publicTracks.length,
      favorites: favorites.length,
      daily: user?.last_usage_reset === new Date().toISOString().split('T')[0] ? (user?.daily_usage || 0) : 0,
      monthly: user?.monthly_usage || 0,
    };
  }, [tracks, user]);

  const badges = useMemo(() => ([
    { id: 'first-track', label: 'First Track', detail: 'Create 1 track', unlocked: stats.total >= 1, icon: Music },
    { id: 'ten-tracks', label: 'Catalog Builder', detail: 'Create 10 tracks', unlocked: stats.total >= 10, icon: Sparkles },
    { id: 'ready-25', label: 'Studio Regular', detail: '25 ready tracks', unlocked: stats.ready >= 25, icon: Zap },
    { id: 'public-5', label: 'Published Artist', detail: 'Publish 5 tracks', unlocked: stats.public >= 5, icon: Crown },
    { id: 'favorites-5', label: 'Curator', detail: 'Favorite 5 tracks', unlocked: stats.favorites >= 5, icon: Heart },
    { id: 'pro-plan', label: 'Pro Workflow', detail: 'Upgrade plan active', unlocked: !!plan && plan.name?.toLowerCase() !== 'free', icon: Award },
  ]), [plan, stats]);

  const avatarUrl = profileForm.avatar_url
    || user?.avatar_url
    || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profileForm.full_name || user?.email || 'User')}&backgroundColor=111827`;
  const bannerUrl = profileForm.banner_url || user?.banner_url || tracks.find(track => track.cover_image_url)?.cover_image_url || '';

  const uploadProfileAsset = async (file, field) => {
    if (!file) return;
    setSaving(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileForm(prev => ({ ...prev, [field]: file_url }));
      await base44.auth.updateMe({ [field]: file_url });
      setUser(prev => ({ ...prev, [field]: file_url }));
      toast.success(field === 'avatar_url' ? 'Profile image uploaded' : 'Banner uploaded');
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        full_name: profileForm.full_name.trim() || user.email.split('@')[0],
        artist_name: profileForm.artist_name.trim(),
        avatar_url: profileForm.avatar_url.trim(),
        banner_url: profileForm.banner_url.trim(),
        bio: profileForm.bio.trim(),
        profile_visibility: profileForm.profile_visibility,
        hide_email: profileForm.hide_email,
        audio_settings: JSON.stringify(audioSettings),
        ui_preferences: JSON.stringify(uiPreferences),
      };
      await base44.auth.updateMe(payload);
      setUser(prev => ({ ...prev, ...payload }));
      changeVolume(audioSettings.defaultVolume);
      haptics.success();
      toast.success('Settings saved');
    } catch (error) {
      haptics.error();
      toast.error(error.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    try {
      const userTracks = await trackClient.listTracks({ created_by: user.email }, '-created_date', 200);
      for (const t of userTracks) await trackClient.deleteTrack(t.id);
      await base44.auth.logout(createPageUrl('Home'));
    } catch (error) {
      toast.error('Could not delete account. Please contact support.');
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#09090f' }}>
        <div className="w-8 h-8 border-2 border-white/10 border-t-rose-500 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32" style={{ background: '#050507', color: '#fff' }}>
      <section className="relative border-b overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {bannerUrl && (
          <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" style={{ filter: 'saturate(1.25) contrast(1.12)' }} />
        )}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(251,113,133,0.18) 0%, rgba(5,5,7,0.55) 38%, #050507 100%)',
          backdropFilter: bannerUrl ? 'blur(2px)' : undefined,
        }} />
        <div className="relative w-full px-4 md:px-8 pt-24 md:pt-32 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative w-20 h-20 md:w-24 md:h-24 overflow-hidden border flex-shrink-0 rounded-lg" style={{ borderColor: 'rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)' }}>
                <img src={avatarUrl} alt={profileForm.full_name || user.email} className="w-full h-full object-cover" />
                <label className="absolute inset-x-0 bottom-0 py-1 flex items-center justify-center cursor-pointer" style={{ background: 'rgba(0,0,0,0.55)' }}>
                  <Upload className="h-3.5 w-3.5" />
                  <input type="file" accept="image/*" className="sr-only" onChange={event => uploadProfileAsset(event.target.files?.[0], 'avatar_url')} />
                </label>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-extrabold truncate">
                    {profileForm.artist_name || profileForm.full_name || user.email.split('@')[0]}
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase border" style={{ borderColor: 'rgba(251,113,133,0.35)', color: '#fb7185', background: 'rgba(225,29,72,0.12)' }}>
                    {plan?.name || 'Free'}
                  </span>
                </div>
                {!profileForm.hide_email && (
                  <p className="text-sm truncate mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{user.email}</p>
                )}
                {profileForm.bio && <p className="text-sm mt-2 max-w-2xl" style={{ color: 'rgba(255,255,255,0.64)' }}>{profileForm.bio}</p>}
              </div>
            </div>
            <div className="md:ml-auto flex gap-2">
              <label
                className="px-4 py-2.5 text-sm font-bold flex items-center gap-2 border cursor-pointer focus-within:ring-2 focus-within:ring-rose-400 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.78)' }}
              >
                <ImageIcon className="h-4 w-4" />
                Banner
                <input type="file" accept="image/*" className="sr-only" onChange={event => uploadProfileAsset(event.target.files?.[0], 'banner_url')} />
              </label>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="px-4 py-2.5 text-sm font-bold flex items-center gap-2 border focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-50 rounded-lg"
                style={{ background: '#e11d48', borderColor: '#e11d48', color: '#fff' }}
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => base44.auth.logout(createPageUrl('Home'))}
                className="px-4 py-2.5 text-sm font-bold flex items-center gap-2 border focus:outline-none focus:ring-2 focus:ring-rose-400 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.72)' }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full px-4 md:px-8 py-5">
        <div role="tablist" aria-label="Profile sections" className="grid grid-cols-4 border mb-5 rounded-lg overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => { setTab(id); haptics.selection(); }}
              className="py-3 text-xs md:text-sm font-bold flex items-center justify-center gap-2 border-r last:border-r-0 focus:outline-none focus:ring-1 focus:ring-rose-400"
              style={{
                borderColor: 'rgba(255,255,255,0.08)',
                background: tab === id ? 'rgba(225,29,72,0.18)' : 'transparent',
                color: tab === id ? '#fff' : 'rgba(255,255,255,0.45)',
              }}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-5">
            <Panel title="Profile">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Display Name" value={profileForm.full_name} onChange={value => setProfileForm(prev => ({ ...prev, full_name: value }))} />
                <Field label="Artist Name" placeholder="Your public artist name" value={profileForm.artist_name} onChange={value => setProfileForm(prev => ({ ...prev, artist_name: value }))} />
                <Field label="Avatar URL" value={profileForm.avatar_url} onChange={value => setProfileForm(prev => ({ ...prev, avatar_url: value }))} />
                <Field label="Banner URL" value={profileForm.banner_url} onChange={value => setProfileForm(prev => ({ ...prev, banner_url: value }))} />
                <SelectField label="Profile Visibility" value={profileForm.profile_visibility} onChange={value => setProfileForm(prev => ({ ...prev, profile_visibility: value }))} options={['private', 'followers', 'public']} />
                <Toggle label="Hide Email from Others" checked={profileForm.hide_email} onChange={checked => setProfileForm(prev => ({ ...prev, hide_email: checked }))} />
                <div className="md:col-span-2">
                  <Field label="Bio" value={profileForm.bio} onChange={value => setProfileForm(prev => ({ ...prev, bio: value }))} multiline />
                </div>
              </div>
            </Panel>
            <Panel title="Usage">
              <Usage label="Daily" value={stats.daily} max={plan?.daily_limit || 5} />
              <Usage label="Monthly" value={stats.monthly} max={plan?.monthly_limit || 50} />
              <div className="grid grid-cols-2 gap-px border mt-4" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.08)' }}>
                <Stat label="Total" value={stats.total} />
                <Stat label="Ready" value={stats.ready} />
                <Stat label="Public" value={stats.public} />
                <Stat label="Favorites" value={stats.favorites} />
              </div>
            </Panel>
          </div>
        )}

        {tab === 'badges' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.08)' }}>
            {badges.map(({ id, label, detail, unlocked, icon: Icon }) => (
              <div key={id} className="p-5 min-h-36" style={{ background: unlocked ? 'rgba(225,29,72,0.12)' : '#101016', color: unlocked ? '#fff' : 'rgba(255,255,255,0.35)' }}>
                <div className="flex items-center justify-between mb-5">
                  <Icon className="h-6 w-6" style={{ color: unlocked ? '#fb7185' : 'rgba(255,255,255,0.25)' }} />
                  {unlocked && <Check className="h-4 w-4" style={{ color: '#22c55e' }} />}
                </div>
                <p className="text-base font-extrabold">{label}</p>
                <p className="text-sm mt-1" style={{ color: unlocked ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.28)' }}>{detail}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'audio' && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-5">
            <Panel title="Playback">
              <Range label="Default Volume" value={audioSettings.defaultVolume} onChange={value => setAudioSettings(prev => ({ ...prev, defaultVolume: value }))} suffix="%" />
              <SelectField label="Playback Quality" value={audioSettings.playbackQuality} onChange={value => setAudioSettings(prev => ({ ...prev, playbackQuality: value }))} options={['standard', 'high', 'lossless']} />
              <Range label="Crossfade" value={audioSettings.crossfadeSeconds} min={0} max={12} onChange={value => setAudioSettings(prev => ({ ...prev, crossfadeSeconds: value }))} suffix="s" />
              <Range label="Visualizer Intensity" value={audioSettings.visualizerIntensity} onChange={value => setAudioSettings(prev => ({ ...prev, visualizerIntensity: value }))} suffix="%" />
            </Panel>
            <Panel title="Audio Defaults">
              <Toggle label="Loudness Normalization" checked={audioSettings.loudnessNormalization} onChange={checked => setAudioSettings(prev => ({ ...prev, loudnessNormalization: checked }))} />
              <Toggle label="Autoplay Next Track" checked={audioSettings.autoplayNext} onChange={checked => setAudioSettings(prev => ({ ...prev, autoplayNext: checked }))} />
              <SelectField label="Mastering Preset" value={audioSettings.preferredMastering} onChange={value => setAudioSettings(prev => ({ ...prev, preferredMastering: value }))} options={['balanced', 'warm', 'loud', 'streaming', 'wide']} />
            </Panel>
          </div>
        )}

        {tab === 'settings' && user?.role === 'admin' && (
          <section className="mb-5 border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0d0d13' }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Sliders className="h-4 w-4" style={{ color: '#fb7185' }} />
              <h2 className="text-sm font-extrabold uppercase tracking-wider">Default Sound Profile (Admin)</h2>
            </div>
            <div className="p-4">
              <SoundProfilePanel />
            </div>
          </section>
        )}

        {tab === 'settings' && (
          <div className="grid lg:grid-cols-2 gap-5">
            <Panel title="Privacy">
              <SelectField label="Profile Visibility" value={profileForm.profile_visibility} onChange={value => setProfileForm(prev => ({ ...prev, profile_visibility: value }))} options={['private', 'followers', 'public']} />
              <Toggle label="Public Library Publishing" checked={profileForm.profile_visibility === 'public'} onChange={checked => setProfileForm(prev => ({ ...prev, profile_visibility: checked ? 'public' : 'private' }))} />
              <Toggle label="Hide Email from Other Users" checked={profileForm.hide_email} onChange={checked => setProfileForm(prev => ({ ...prev, hide_email: checked }))} />
              <div className="flex items-start gap-3 border-t pt-4 mt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <Shield className="h-5 w-5 mt-0.5" style={{ color: '#fb7185' }} />
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
                  Privacy and audio defaults are stored on your authenticated user profile and applied when the app loads.
                </p>
              </div>
            </Panel>
            <div className="flex flex-col gap-5">
              <Panel title="Interface">
                <Toggle label="Compact Library Rows" checked={uiPreferences.compactLibrary} onChange={checked => setUiPreferences(prev => ({ ...prev, compactLibrary: checked }))} />
                <Toggle label="High Contrast Waveforms" checked={uiPreferences.highContrastWaveforms} onChange={checked => setUiPreferences(prev => ({ ...prev, highContrastWaveforms: checked }))} />
                <Toggle label="Reduced Motion" checked={uiPreferences.reducedMotion} onChange={checked => setUiPreferences(prev => ({ ...prev, reducedMotion: checked }))} />
                <Toggle label="Mobile Bottom Sheets" checked={uiPreferences.mobileBottomSheets} onChange={checked => setUiPreferences(prev => ({ ...prev, mobileBottomSheets: checked }))} />
              </Panel>

              {/* Danger Zone */}
              <section className="border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(239,68,68,0.25)', background: '#101016' }}>
                <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                  <Trash2 className="h-4 w-4" style={{ color: '#ef4444' }} />
                  <h2 className="text-sm font-extrabold uppercase tracking-wider" style={{ color: '#ef4444' }}>Danger Zone</h2>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.52)' }}>
                    Permanently delete your account and all your tracks. This action cannot be undone.
                  </p>
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 text-sm font-bold rounded-lg border transition-colors"
                      style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
                    >
                      Delete My Account
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
                        Type <span className="font-extrabold">DELETE</span> to confirm:
                      </p>
                      <input
                        value={deleteInput}
                        onChange={e => setDeleteInput(e.target.value)}
                        placeholder="DELETE"
                        className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
                        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', color: '#fff' }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDeleteAccount}
                          disabled={deleteInput !== 'DELETE'}
                          className="px-4 py-2 text-sm font-bold rounded-lg disabled:opacity-40 transition-opacity"
                          style={{ background: '#ef4444', color: '#fff' }}
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                          className="px-4 py-2 text-sm font-bold rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Panel({ title, children }) {
  return (
    <section className="border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#101016' }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <SlidersHorizontal className="h-4 w-4" style={{ color: '#fb7185' }} />
        <h2 className="text-sm font-extrabold uppercase tracking-wider">{title}</h2>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, multiline = false, placeholder = '' }) {
  const shared = {
    value,
    onChange: event => onChange(event.target.value),
    'aria-label': label,
    placeholder,
    className: 'w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 rounded-lg',
    style: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' },
  };
  return (
    <label className="block">
      <span className="block text-[10px] font-extrabold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      {multiline ? <textarea {...shared} rows={4} /> : <input {...shared} />}
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-extrabold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-label={label}
        className="w-full px-3 py-2.5 text-sm capitalize focus:outline-none focus:ring-1 focus:ring-rose-400 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
      >
        {options.map(option => <option key={option} value={option} style={{ background: '#111' }}>{option}</option>)}
      </select>
    </label>
  );
}

function Range({ label, value, onChange, min = 0, max = 100, suffix = '' }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
        <span className="text-xs font-bold tabular-nums" style={{ color: '#fb7185' }}>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        aria-label={label}
        className="w-full accent-rose-500"
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.76)' }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        aria-label={label}
        className="h-5 w-5 accent-rose-500"
      />
    </label>
  );
}

function Usage({ label, value, max }) {
  const pct = Math.min(100, max ? (value / max) * 100 : 0);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span style={{ color: 'rgba(255,255,255,0.58)' }}>{label}</span>
        <span className="font-bold tabular-nums">{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-lg" style={{ width: `${pct}%`, background: '#e11d48' }} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-4" style={{ background: '#101016' }}>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.42)' }}>{label}</p>
    </div>
  );
}