import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Trash2, Star, Users, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COMMUNITY_PRESETS = [
  { name: 'Chill Lo-Fi Study', prompt: 'Relaxing lo-fi hip hop for studying, rain sounds, soft piano', styles: 'lo-fi, chill, piano, ambient', tags: ['chill', 'study', 'focus'] },
  { name: 'Epic Cinematic', prompt: 'Powerful orchestral cinematic music, building tension, dramatic', styles: 'cinematic, orchestral, epic, dramatic', tags: ['cinematic', 'epic', 'film'] },
  { name: 'Dark Trap Banger', prompt: 'Hard-hitting trap with heavy 808s, dark atmosphere, menacing', styles: 'trap, dark, 808, bass', tags: ['trap', 'dark', 'club'] },
  { name: 'Indie Folk Ballad', prompt: 'Heartfelt indie folk ballad, acoustic guitar, emotional vocals', styles: 'folk, indie, acoustic, emotional', tags: ['folk', 'indie', 'emotional'] },
  { name: 'Synthwave Retro', prompt: '80s synth-driven retro wave, neon nights, driving beat', styles: 'synthwave, retro, 80s, electronic', tags: ['synthwave', 'retro', '80s'] },
  { name: 'Jazz Café Vibes', prompt: 'Smooth jazz for a late-night café, saxophone, brushed drums', styles: 'jazz, smooth, saxophone, lounge', tags: ['jazz', 'lounge', 'smooth'] },
  { name: 'House Party Anthem', prompt: 'High-energy dance track, four-on-the-floor, euphoric drops', styles: 'house, dance, electronic, club', tags: ['house', 'dance', 'club'] },
  { name: 'Peaceful Meditation', prompt: 'Soft healing meditation music, binaural, gentle drones', styles: 'ambient, meditation, healing, drone', tags: ['meditation', 'calm', 'healing'] },
  { name: 'Hitchhiker Cosmic Folk', prompt: 'Surreal hitchhiker-style cosmic folk tale, witty narration, starlit harmonies, warm analog guitars', styles: 'hitchhiker-style cosmic folk, surreal, warm analog, witty', tags: ['hitchhiker', 'cosmic', 'folk'] },
  { name: 'Hitchhiker Neon Lounge', prompt: 'Absurd galactic lounge groove with talk-sung hooks, neon bass, and playful interstellar textures', styles: 'hitchhiker-style galactic lounge, neon, quirky, synth', tags: ['hitchhiker', 'lounge', 'neon'] },
  { name: 'Raaga Yaman Sitar Flow', prompt: 'Indian classical journey in Raaga Yaman, expressive sitar lead, tabla pulse, cinematic depth', styles: 'indian classical, sitar, raaga yaman, tabla, cinematic', tags: ['india', 'raaga', 'sitar'] },
  { name: 'Raaga Bhairavi Devotional', prompt: 'Devotional Bhairavi mood with tanpura drone, bansuri responses, temple-bell accents and serene choir', styles: 'devotional, raaga bhairavi, tanpura, bansuri, spiritual', tags: ['devotional', 'bhairavi', 'indian'] },
  { name: 'Telugu Golden Era Ballad', prompt: '1970s Telugu-inspired orchestral ballad with vintage keys, heartfelt melody and nostalgic romance', styles: 'telugu70s, retro, orchestral, melodic, nostalgic', tags: ['telugu', 'retro', 'classic'] },
];

const fieldStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' };
const fieldClass = 'w-full px-3 py-2 rounded-lg text-xs placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-rose-400';

export default function PresetPromptsPanel({ onApply, onClose }) {
  const [tab, setTab] = useState('my'); // 'my' | 'community'
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newStyles, setNewStyles] = useState('');
  const queryClient = useQueryClient();

  const { data: myPresets = [] } = useQuery({
    queryKey: ['presets'],
    queryFn: () => base44.entities.PresetPrompt.filter({ is_community: false }, '-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.PresetPrompt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] });
      setShowSaveForm(false);
      setNewName(''); setNewPrompt(''); setNewStyles('');
      toast.success('Preset saved!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PresetPrompt.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['presets'] }),
  });

  const handleSave = () => {
    if (!newName.trim() || !newPrompt.trim()) { toast.error('Name and prompt are required'); return; }
    saveMutation.mutate({ name: newName.trim(), prompt: newPrompt.trim(), styles: newStyles.trim(), is_community: false });
  };

  const handleApply = (preset) => {
    onApply({ prompt: preset.prompt, styles: preset.styles || '' });
    onClose();
    toast.success(`Preset "${preset.name}" applied!`);
  };

  const list = tab === 'my' ? myPresets : COMMUNITY_PRESETS;

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgba(10,10,16,0.99)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-rose-400" />
          <span className="text-xs font-extrabold uppercase tracking-widest text-white/80">Presets</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/5 rounded transition-colors">
          <X className="h-4 w-4 text-white/30" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {[['my', 'My Presets'], ['community', 'Community']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-all')}
            style={tab === id ? { color: '#fff', borderBottom: '2px solid #e11d48' } : { color: 'rgba(255,255,255,0.3)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Save new preset button (my tab) */}
      {tab === 'my' && (
        <div className="flex-shrink-0 px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={() => setShowSaveForm(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold transition-all border"
            style={{ background: 'rgba(225,29,72,0.1)', borderColor: 'rgba(225,29,72,0.25)', color: '#fb7185' }}>
            <Plus className="h-3 w-3" /> Save New Preset
          </button>
          {showSaveForm && (
            <div className="mt-2 space-y-2">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Preset name..." className={fieldClass} style={fieldStyle} />
              <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="Prompt..." rows={2} className={cn(fieldClass, 'resize-none')} style={fieldStyle} />
              <input value={newStyles} onChange={e => setNewStyles(e.target.value)} placeholder="Styles (lo-fi, ambient...)" className={fieldClass} style={fieldStyle} />
              <button onClick={handleSave} disabled={saveMutation.isPending}
                className="w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all"
                style={{ background: 'rgba(225,29,72,0.8)', color: '#fff' }}>
                <Save className="h-3 w-3" /> {saveMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {list.length === 0 && (
          <div className="py-8 text-center">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-white/10" />
            <p className="text-xs text-white/25">No presets yet. Save one above!</p>
          </div>
        )}
        {list.map((preset, i) => (
          <div key={preset.id || preset.name}
            className="group flex items-start gap-2 p-2.5 rounded-lg border transition-all cursor-pointer hover:border-rose-500/30"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
            onClick={() => handleApply(preset)}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-white/85">{preset.name}</p>
              <p className="text-[10px] text-white/35 truncate mt-0.5">{preset.prompt}</p>
              {preset.styles && (
                <p className="text-[9px] text-rose-400/60 mt-0.5 truncate">{preset.styles}</p>
              )}
            </div>
            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {tab === 'my' && (
                <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(preset.id); }}
                  className="p-1 hover:bg-red-500/20 rounded transition-colors">
                  <Trash2 className="h-3 w-3 text-red-400/60" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
