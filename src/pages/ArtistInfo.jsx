// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import { Link } from 'react-router-dom';
import { ChevronLeft, Music, Play, Pause, TrendingUp, Disc, Globe, UserPlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ArtistInfoPage() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  const artistHandle = `Accoustica-${(email || '').split('@')[0]}`;

  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const [following, setFollowing] = useState(false);

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['artistTracks', email],
    queryFn: () => base44.entities.Track.filter({ created_by: email, status: 'ready' }, '-plays', 50),
    enabled: !!email,
  });

  const publicTracks = tracks.filter(t => t.is_public);
  const allReadyTracks = tracks;
  const totalPlays = tracks.reduce((s, t) => s + (t.plays || 0), 0);
  const coverImage = tracks.find(t => t.cover_image_url)?.cover_image_url;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden pb-36">
      {/* Ambient BG */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-black" />
        {coverImage && (
          <img src={coverImage} alt=""
            className="absolute inset-0 w-full h-full object-cover scale-125 opacity-[0.06]"
            style={{ filter: 'blur(80px)' }}
          />
        )}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 100% 50% at 30% 0%, rgba(124,58,237,0.15) 0%, transparent 70%), radial-gradient(ellipse 80% 40% at 80% 100%, rgba(236,72,153,0.08) 0%, transparent 60%)',
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/95" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center px-4 pt-4 pb-3">
        <Link to={-1} onClick={() => haptics.light()}>
          <div className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <ChevronLeft className="h-5 w-5 text-white" />
          </div>
        </Link>
      </div>

      {/* Artist Hero */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-4 pb-8">
        {/* Avatar collage */}
        <div className="relative w-28 h-28 mb-4">
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/10 shadow-2xl"
            style={{ boxShadow: '0 0 0 3px rgba(124,58,237,0.4), 0 20px 60px rgba(124,58,237,0.3)' }}>
            {coverImage ? (
              <img src={coverImage} alt={artistHandle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500/40 to-pink-500/30 flex items-center justify-center">
                <Music className="h-12 w-12 text-white/40" />
              </div>
            )}
          </div>
          {/* Animated ring */}
          <div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ animation: 'pulse-ring-artist 3s ease-out infinite', boxShadow: '0 0 0 0 rgba(124,58,237,0.4)' }}
          />
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">{artistHandle}</h1>
        <p className="text-sm text-white/40 mb-5">{publicTracks.length} public tracks · {totalPlays} total plays</p>

        {/* Stats */}
        <div className="flex gap-4 mb-6">
          {[
            { label: 'Tracks', value: tracks.length, icon: Disc },
            { label: 'Public', value: publicTracks.length, icon: Globe },
            { label: 'Plays', value: totalPlays, icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center px-4">
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-[10px] text-white/35">{label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setFollowing(!following); haptics.medium(); }}
          className={cn(
            'px-8 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 active:scale-95',
            following ? 'bg-white/10 border border-white/20 text-white/60' : 'text-white'
          )}
          style={!following ? { background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 8px 32px rgba(124,58,237,0.35)' } : {}}
        >
          <UserPlus className="h-4 w-4" />
          {following ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Tracks */}
      <div className="relative z-10 px-4">
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3 px-1">Tracks</h2>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
          </div>
        ) : allReadyTracks.length === 0 ? (
          <div className="text-center py-12">
            <Music className="h-12 w-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No public tracks yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allReadyTracks.map((track, i) => {
              const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl p-3 border transition-all',
                    isCurrentlyPlaying
                      ? 'bg-violet-500/10 border-violet-500/30'
                      : 'bg-white/[0.04] border-white/[0.06] active:bg-white/[0.07]'
                  )}
                >
                  <button
                    onClick={() => { haptics.medium(); playTrack(track, allReadyTracks); }}
                    className="relative flex-shrink-0"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10">
                      {track.cover_image_url ? (
                        <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-pink-500/20">
                          <Music className="h-5 w-5 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      {isCurrentlyPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
                    </div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <Link to={`/TrackInfo?id=${track.id}`}>
                      <p className={cn('text-sm font-medium truncate hover:text-violet-300 transition-colors', isCurrentlyPlaying ? 'text-violet-400' : 'text-white')}>
                        {track.title}
                      </p>
                    </Link>
                    <p className="text-xs text-white/35 truncate mt-0.5">{track.style || 'Unknown'}</p>
                  </div>

                  <div className="flex items-center gap-1 text-white/30 flex-shrink-0">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-[11px]">{track.plays || 0}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-ring-artist {
          0% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
          70% { box-shadow: 0 0 0 20px rgba(124,58,237,0); }
          100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
        }
      `}</style>
    </div>
  );
}