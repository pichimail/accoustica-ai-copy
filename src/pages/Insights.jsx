// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/exportClient';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Disc3, Loader2, Music2, Sparkles, TrendingUp, Wand2 } from 'lucide-react';

export default function InsightsPage() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated()
      .then(ok => ok ? base44.auth.me().then(setUser) : null)
      .finally(() => setAuthChecked(true));
  }, []);

  const { data: tracks = [], isLoading: loadingTracks } = useQuery({
    queryKey: ['insightTracks', user?.email],
    queryFn: () => base44.entities.Track.filter({ created_by: user.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const { data: plays = [], isLoading: loadingPlays } = useQuery({
    queryKey: ['insightPlays'],
    queryFn: () => base44.entities.TrackPlay.list('-created_date', 1000),
    enabled: !!user?.email,
  });

  const ownedIds = useMemo(() => new Set(tracks.map(t => t.id)), [tracks]);
  const ownedPlays = useMemo(() => plays.filter(p => ownedIds.has(p.track_id)), [ownedIds, plays]);

  const metrics = useMemo(() => {
    const ready = tracks.filter(t => t.status === 'ready');
    const mastered = tracks.filter(t => t.mastered || t.tags?.includes('mastered'));
    const modified = tracks.filter(t => t.modified || t.parent_track_id || t.modification_type);
    const publicTracks = tracks.filter(t => t.is_public);
    const totalPlays = tracks.reduce((sum, t) => sum + (t.plays || 0), 0);
    return { ready: ready.length, mastered: mastered.length, modified: modified.length, publicTracks: publicTracks.length, totalPlays };
  }, [tracks]);

  const playsByDay = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().slice(0, 10);
      return { key, label: d.toLocaleDateString('en-US', { weekday: 'short' }), value: 0 };
    });
    const map = new Map(days.map(d => [d.key, d]));
    ownedPlays.forEach(p => {
      const key = (p.played_at || p.created_date || '').slice(0, 10);
      if (map.has(key)) map.get(key).value += 1;
    });
    if (!ownedPlays.length) {
      tracks.forEach(t => {
        const key = (t.created_date || '').slice(0, 10);
        if (map.has(key)) map.get(key).value += t.plays || 0;
      });
    }
    return days;
  }, [ownedPlays, tracks]);

  const genres = useMemo(() => {
    const counts = new Map();
    tracks.forEach(t => {
      const raw = t.style || t.tags || 'AI Generated';
      // Only use first meaningful token (not long descriptions)
      raw.split(',').slice(0, 4).forEach(token => {
        const genre = token.trim().slice(0, 32) || 'AI Generated';
        if (genre.length > 2) counts.set(genre, (counts.get(genre) || 0) + (t.plays || 1));
      });
    });
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [tracks]);

  const statusBreakdown = useMemo(() => [
    { label: 'Ready', value: metrics.ready, color: '#22c55e' },
    { label: 'Mastered', value: metrics.mastered, color: '#fb7185' },
    { label: 'Modified', value: metrics.modified, color: '#a78bfa' },
    { label: 'Public', value: metrics.publicTracks, color: '#38bdf8' },
  ], [metrics]);

  if (!authChecked || (user && (loadingTracks || loadingPlays))) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#020204' }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#22c55e' }} />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5 text-center" style={{ background: '#020204', color: '#fff' }}>
        <div className="max-w-md">
          <BarChart3 className="h-12 w-12 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <h1 className="text-2xl font-extrabold">Insights require sign in</h1>
          <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Sign in to view plays, genre performance, and mastering analytics for your generated tracks.</p>
          <button type="button" onClick={() => base44.auth.login()} className="mt-5 px-6 py-2.5 rounded-lg text-sm font-bold" style={{ background: '#22c55e', color: '#020204' }}>Sign In</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32 w-full" style={{ background: '#020204', color: '#fff' }}>
      {/* Header */}
      <header className="border-b w-full" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#07070b' }}>
        <div className="w-full max-w-screen-2xl mx-auto px-4 md:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: '#fb7185' }}>Dashboard</p>
              <h1 className="text-2xl md:text-4xl font-extrabold mt-1">Music Insights</h1>
            </div>
            {/* Metrics row — scrollable on mobile */}
            <div className="grid grid-cols-4 gap-px rounded-lg overflow-hidden border min-w-0 sm:min-w-[440px]" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.06)' }}>
              <Metric label="Tracks" value={tracks.length} icon={Music2} />
              <Metric label="Ready" value={metrics.ready} icon={Disc3} />
              <Metric label="Plays" value={metrics.totalPlays} icon={TrendingUp} />
              <Metric label="Public" value={metrics.publicTracks} icon={Sparkles} />
            </div>
          </div>
        </div>
      </header>

      {/* Content grid */}
      <section className="w-full max-w-screen-2xl mx-auto px-3 md:px-8 py-5 grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-4">
        <Panel title="Plays Over Time" icon={BarChart3}>
          <PlayBars data={playsByDay} />
        </Panel>
        <Panel title="Track Processing" icon={Wand2}>
          <RadialBreakdown data={statusBreakdown} total={Math.max(1, tracks.length)} />
        </Panel>
        <Panel title="Top Performing Genres" icon={TrendingUp}>
          <GenreBars data={genres} />
        </Panel>
        <Panel title="Mastered & Modified Tracks" icon={Disc3}>
          <TrackBreakdown tracks={tracks} />
        </Panel>
      </section>
    </main>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="p-3 md:p-4" style={{ background: '#09090f' }}>
      <Icon className="h-3.5 w-3.5 mb-2" style={{ color: '#22c55e' }} />
      <p className="text-xl font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#09090f' }}>
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: '#fb7185' }} />
        <h2 className="text-sm font-extrabold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.9)' }}>{title}</h2>
      </div>
      <div className="p-4 md:p-5 overflow-x-auto">{children}</div>
    </section>
  );
}

function PlayBars({ data }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="h-56 md:h-72 flex items-end gap-1.5 md:gap-2 pt-6" style={{ minWidth: 0 }}>
      {data.map((item, i) => {
        const height = Math.max(6, (item.value / max) * 100);
        return (
          <div key={item.key} className="flex-1 h-full flex flex-col justify-end items-center gap-1" style={{ minWidth: 0 }}>
            <div className="relative w-full flex items-end justify-center h-full">
              <div
                className="w-full rounded-t-sm"
                style={{
                  height: `${height}%`,
                  minHeight: 10,
                  background: 'linear-gradient(180deg, #22c55e, #0f766e)',
                  boxShadow: '0 4px 16px rgba(34,197,94,0.2)',
                }}
                title={`${item.label}: ${item.value}`}
              />
              <span className="absolute -top-5 text-[10px] font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.value}</span>
            </div>
            <span className="text-[9px] md:text-[10px] uppercase tracking-wider truncate w-full text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function GenreBars({ data }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="space-y-3">
      {data.length === 0 ? <Empty /> : data.map(item => (
        <div key={item.label}>
          <div className="flex justify-between gap-3 text-sm mb-1.5">
            <span className="font-semibold truncate max-w-[70%]" style={{ color: 'rgba(255,255,255,0.9)' }}>{item.label}</span>
            <span className="tabular-nums flex-shrink-0" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.value}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: 'linear-gradient(90deg, #fb7185, #a78bfa)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RadialBreakdown({ data, total }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {data.map(item => {
        const pct = Math.round((item.value / total) * 100);
        const deg = pct * 3.6;
        return (
          <div key={item.label} className="rounded-lg p-3 md:p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="h-14 w-14 rounded-full mb-3 flex items-center justify-center" style={{
              background: `conic-gradient(${item.color} ${deg}deg, rgba(255,255,255,0.06) 0deg)`,
              boxShadow: `0 0 20px ${item.color}33`,
            }}>
              <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: '#09090f' }}>
                <span className="text-xs font-extrabold" style={{ color: item.color }}>{pct}%</span>
              </div>
            </div>
            <p className="text-base font-extrabold">{pct}%</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label} <span style={{ color: 'rgba(255,255,255,0.4)' }}>({item.value})</span></p>
          </div>
        );
      })}
    </div>
  );
}

function TrackBreakdown({ tracks }) {
  const rows = tracks
    .filter(t => t.mastered || t.modified || t.parent_track_id || t.modification_type)
    .slice(0, 8);
  if (rows.length === 0) return <Empty />;
  return (
    <div className="divide-y rounded-lg overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.07)', divideColor: 'rgba(255,255,255,0.05)' }}>
      {rows.map(track => (
        <div key={track.id} className="flex items-center gap-3 px-3 py-3">
          <div className="h-10 w-10 rounded-lg flex-shrink-0 overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
            {track.cover_image_url ? <img src={track.cover_image_url} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{track.title}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{track.mastered ? 'Mastered' : track.modification_type || 'Modified'}</p>
          </div>
          <span className="text-xs tabular-nums font-bold" style={{ color: '#22c55e' }}>{track.plays || 0}</span>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <p className="text-sm py-8 text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>No data yet</p>;
}