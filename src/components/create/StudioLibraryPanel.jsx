import React from 'react';
import { Music, Play, Pause, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * @typedef {'ready' | 'generating' | 'queued' | 'failed'} TrackStatus
 */

/**
 * @typedef Track
 * @property {string | number} id
 * @property {string} [title]
 * @property {string} [cover_image_url]
 * @property {string} [stream_audio_url]
 * @property {string} [audio_url]
 * @property {string} [created_by]
 * @property {TrackStatus} [status]
 */

/**
 * @typedef StudioLibraryPanelProps
 * @property {Track[]} tracks
 * @property {string} search
 * @property {(value: string) => void} onSearch
 * @property {Track | null | undefined} selectedTrack
 * @property {(track: Track) => void} onSelectTrack
 * @property {(track: Track) => void} onPlay
 * @property {Track | null | undefined} currentTrack
 * @property {boolean} isPlaying
 * @property {boolean} isLoading
 */

/**
 * @param {StudioLibraryPanelProps} props
 */
export default function StudioLibraryPanel({ tracks, search, onSearch, selectedTrack, onSelectTrack, onPlay, currentTrack, isPlaying, isLoading }) {
  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0a0f', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-extrabold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.85)' }}>Library</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(225,29,72,0.18)', color: '#f43f5e' }}>{tracks.length}</span>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-1 mb-2.5">
          <button className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: '#e11d48' }}>All</button>
          <button className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors hover:text-white/70" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>Liked</button>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 pr-2 py-1.5 rounded-lg text-xs placeholder:text-white/20 focus:outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: '#fff' }}
          />
        </div>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto min-h-0 px-1.5 py-2">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'rgba(255,255,255,0.15)' }} />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-10">
            <Music className="h-6 w-6 mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.08)' }} />
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>No tracks yet</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {tracks.map((track) => (
              <LibraryItem
                key={track.id}
                track={track}
                isSelected={selectedTrack?.id === track.id}
                isPlaying={currentTrack?.id === track.id && isPlaying}
                onClick={() => onSelectTrack(track)}
                onPlay={(e) => { e.stopPropagation(); onPlay(track); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   track: Track;
 *   isSelected: boolean;
 *   isPlaying: boolean;
 *   onClick: () => void;
 *   onPlay: (e: React.MouseEvent<HTMLButtonElement>) => void;
 * }} props
 */
function LibraryItem({ track, isSelected, isPlaying, onClick, onPlay }) {
  /** @type {Record<TrackStatus, string>} */
  const statusDot = { ready: '#22c55e', generating: '#a78bfa', queued: '#fbbf24', failed: '#f87171' };
  const canPlay = !!(track?.stream_audio_url || track?.audio_url);
  return (
    <button
      onClick={onClick}
      className={cn('w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all group')}
      style={{ background: isSelected ? 'rgba(225,29,72,0.12)' : 'transparent' }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {track.cover_image_url
          ? <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
          : <Music className="h-3.5 w-3.5 absolute inset-0 m-auto" style={{ color: 'rgba(255,255,255,0.15)' }} />
        }
        {canPlay && (
          <button onClick={onPlay}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.55)' }}>
            {isPlaying
              ? <Pause className="h-3 w-3 fill-white text-white" />
              : <Play className="h-3 w-3 fill-white text-white" />}
          </button>
        )}
        {isPlaying && (
          <div className="absolute bottom-0.5 right-0.5 flex items-end gap-[1.5px]">
            {[0.6, 1, 0.4].map((h, i) => (
              <span key={i} className="w-[2px] rounded-full"
                style={{ height: `${h * 6}px`, background: '#e11d48', animation: `beat-bar ${0.5 + i * 0.15}s ease-in-out infinite alternate` }} />
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate transition-colors"
          style={{ color: isPlaying ? '#f43f5e' : isSelected ? '#fff' : 'rgba(255,255,255,0.75)' }}>
          {track.title}
        </p>
        <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {track.created_by?.split('@')[0] || 'You'}
        </p>
      </div>
      {!canPlay && (
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: (track.status && statusDot[track.status]) || '#555' }} />
      )}
    </button>
  );
}
