import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { haptics } from '@/components/utils/haptics';
import { Drum, Guitar, Save, Sparkles, SlidersHorizontal } from 'lucide-react';

const INTENSITY_OPTIONS = ['remove', 'reduce', 'balanced', 'increase'];

const DEFAULTS = {
  is_active: true,
  drum_style: 'natural acoustic drums, tight realistic kit',
  drum_intensity: 'balanced',
  guitar_style: 'warm clean guitars, organic tone',
  guitar_intensity: 'balanced',
  hq_vocal_instructions: 'clear vocal-forward mix, natural studio-quality vocals, crisp articulation, balanced compression, minimal reverb, no muddiness',
  hq_music_instructions: 'professional studio production, clean balanced mix, natural dynamics, wide clear stereo image, realistic acoustic instruments, no harsh shimmer, no excessive echo',
  global_avoid_tags: 'excessive reverb, heavy echo, metallic shimmer, muddy mix, buried vocals, clipped distortion, robotic vocals, over-compressed, low fidelity',
};

export default function SoundProfilePanel() {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.functions.invoke('getSoundProfile', {})
      .then((res) => {
        if (res?.data?.profile) setForm({ ...DEFAULTS, ...res.data.profile });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('saveSoundProfile', form);
      haptics.success();
      toast.success('Sound profile saved — applies to all new tracks');
    } catch (e) {
      haptics.error();
      toast.error(e?.response?.data?.error || 'Could not save sound profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-white/10 border-t-rose-500 animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-lg border" style={{ borderColor: 'rgba(251,113,133,0.25)', background: 'rgba(225,29,72,0.08)' }}>
        <Sparkles className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: '#fb7185' }} />
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
          These defaults are applied to every new generation across the platform to keep a consistent, professional sound. Drum & guitar steering always applies; HQ vocal & music instructions apply when users enable the <strong>HQ</strong> toggle.
        </p>
      </div>

      <SettingRow label="Profile Active">
        <Toggle checked={form.is_active} onChange={(v) => update('is_active', v)} />
      </SettingRow>

      <div className="grid md:grid-cols-2 gap-4">
        <SubPanel icon={Drum} title="Drums">
          <Field label="Drum Style" value={form.drum_style} onChange={(v) => update('drum_style', v)} placeholder="e.g. natural acoustic drums" />
          <SegPicker label="Intensity" value={form.drum_intensity} options={INTENSITY_OPTIONS} onChange={(v) => update('drum_intensity', v)} />
        </SubPanel>
        <SubPanel icon={Guitar} title="Guitars">
          <Field label="Guitar Style" value={form.guitar_style} onChange={(v) => update('guitar_style', v)} placeholder="e.g. warm clean guitars" />
          <SegPicker label="Intensity" value={form.guitar_intensity} options={INTENSITY_OPTIONS} onChange={(v) => update('guitar_intensity', v)} />
        </SubPanel>
      </div>

      <SubPanel icon={SlidersHorizontal} title="HQ Profile (applied with HQ toggle)">
        <Field label="HQ Vocal Instructions" value={form.hq_vocal_instructions} onChange={(v) => update('hq_vocal_instructions', v)} multiline />
        <Field label="HQ Music Instructions" value={form.hq_music_instructions} onChange={(v) => update('hq_music_instructions', v)} multiline />
        <Field label="Always Avoid (negative tags)" value={form.global_avoid_tags} onChange={(v) => update('global_avoid_tags', v)} multiline />
      </SubPanel>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="px-5 py-2.5 text-sm font-bold flex items-center gap-2 rounded-lg disabled:opacity-50"
        style={{ background: '#e11d48', color: '#fff' }}
      >
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" /> : <Save className="h-4 w-4" />}
        Save Sound Profile
      </button>
    </div>
  );
}

function SubPanel({ icon: Icon, title, children }) {
  return (
    <section className="border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#101016' }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Icon className="h-4 w-4" style={{ color: '#fb7185' }} />
        <h3 className="text-sm font-extrabold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, multiline = false, placeholder = '' }) {
  const shared = {
    value: value || '',
    onChange: (e) => onChange(e.target.value),
    'aria-label': label,
    placeholder,
    className: 'w-full px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-rose-400 rounded-lg',
    style: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' },
  };
  return (
    <label className="block">
      <span className="block text-[10px] font-extrabold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      {multiline ? <textarea {...shared} rows={3} /> : <input {...shared} />}
    </label>
  );
}

function SegPicker({ label, value, options, onChange }) {
  return (
    <div>
      <span className="block text-[10px] font-extrabold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
      <div className="grid grid-cols-4 gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all border"
            style={value === opt
              ? { background: 'rgba(225,29,72,0.2)', borderColor: 'rgba(225,29,72,0.4)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.45)' }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border rounded-lg" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#101016' }}>
      <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.78)' }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-rose-500" />
  );
}