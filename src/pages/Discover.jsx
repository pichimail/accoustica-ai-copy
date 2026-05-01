import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { Search, Globe, TrendingUp, Clock, Sparkles, Loader2, Play, Pause } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';

export default function DiscoverPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-created_date');
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['publicTracks', sort],
    queryFn: () => base44.entities.Track.filter({ is_public: true, status: 'ready' }, sort, 50),
  });

  const filtered = tracks.filter(t => {
    const q = search.toLowerCase();
    return !q || t.title?.toLowerCase().includes(q) || t.style?.toLowerCase().includes(q);
  });

  const handlePlay = (track) => {
    haptics.medium();
    base44.entities.Track.update(track.id, { plays: (track.plays || 0) + 1 });
    playTrack(track, filtered);
  };

  return (
    <div className="min-h-screen pb-36" style={{ background: '#0a0a0f' }}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 px-4 pt-4 pb-3"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Discover</h1>
          <div className="flex gap-2">
            {[
              { value: '-created_date', icon: Clock, label: 'New' },
              { value: '-plays', icon: TrendingUp, label: 'Hot' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => { setSort(value); haptics.light(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={sort === value
                  ? { background: '#22c55e', color: '#000' }
                  : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search public tracks..."
            className="w-full rounded-2xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
      </div>

      {/* Tracks */}
      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#22c55e' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Globe className="h-12 w-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No public tracks yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((track, i) => {
              const isActive = currentTrack?.id === track.id && isPlaying;
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 rounded-2xl p-3"
                  style={{
                    background: isActive ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                    border: isActive ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Art + play */}
                  <button onClick={() => handlePlay(track)} className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      {track.cover_image_url ? (
                        <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                      {isActive ? <Pause className="h-5 w-5 text-white fill-white" /> : <Play className="h-5 w-5 text-white fill-white" />}
                    </div>
                    {isActive && (
                      <div className="absolute bottom-1 right-1 flex items-end gap-[2px]">
                        {[0.6, 1, 0.4].map((h, j) => (
                          <span key={j} className="w-[2px] rounded-full"
                            style={{ height: `${h * 8}px`, background: '#22c55e', animation: `beat-bar ${0.5 + j * 0.15}s ease-in-out infinite alternate` }}
                          />
                        ))}
                      </div>
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/TrackInfo?id=${track.id}`}>
                      <p className={cn('text-sm font-semibold truncate hover:underline', isActive ? 'text-green-400' : 'text-white')}>
                        {track.title}
                      </p>
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-white/45 truncate">{track.style || 'Unknown'}</span>
                      {track.plays > 0 && (
                        <span className="text-[10px] text-white/25">{track.plays} plays</span>
                      )}
                    </div>
                  </div>

                  {/* Play button */}
                  <button
                    onClick={() => handlePlay(track)}
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={isActive
                      ? { background: '#22c55e', color: '#000' }
                      : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
                    }
                  >
                    {isActive ? <Pause className="h-4 w-4 fill-black" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes beat-bar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}