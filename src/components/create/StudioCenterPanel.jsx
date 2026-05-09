import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Music, Play, Pause, Loader2, Search, SkipForward, Video, Layers, Info, MoreHorizontal } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function StudioCenterPanel({ selectedTrack, tracks, currentTrack, isPlaying, onPlay, onSelect, isGenerating }) {
  const [topH, setTopH] = useState(220);
  const [isDragging, setIsDragging] = useState(false);
  const [centerSearch, setCenterSearch] = useState('');
  const containerRef = useRef(null);
  const startY = useRef(0);
  const startH = useRef(0);

  const filteredTracks = tracks.filter(t =>
    !centerSearch || t.title?.toLowerCase().includes(centerSearch.toLowerCase())
  );

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    startH.current = topH;
  }, [topH]);

  const onTouchStart = useCallback((e) => {
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    startH.current = topH;
  }, [topH]);

  useEffect(() => {
    if (!isDragging) return;
    const move = (e) => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const delta = clientY - startY.current;
      const containerH = containerRef.current?.offsetHeight || 600;
      const newH = Math.max(120, Math.min(containerH - 160, startH.current + delta));
      setTopH(newH);
    };
    const up = () => setIsDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [isDragging]);

  return (
    <div ref={containerRef} className="flex flex-col h-full min-h-0 overflow-hidden" style={{ background: 'rgba(11,11,17,0.95)' }}>
      {/* TOP: Track detail */}
      <div className="flex-shrink-0 overflow-y-auto min-h-0" style={{ height: topH }}>
        <div className="px-5 pt-4 pb-2 h-full">
          {selectedTrack ? (
            <TrackDetailView track={selectedTrack} currentTrack={currentTrack} isPlaying={isPlaying} onPlay={() => onPlay(selectedTrack)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <Music className="h-7 w-7" style={{ color: 'rgba(255,255,255,0.1)' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.2)' }}>Select a track to preview</p>
            </div>
          )}
        </div>
      </div>

      {/* DRAG HANDLE */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="flex-shrink-0 flex items-center justify-center cursor-row-resize select-none transition-colors"
        style={{
          height: 18,
          background: isDragging ? 'rgba(225,29,72,0.12)' : 'rgba(255,255,255,0.02)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex gap-1 items-center">
          <div className="w-8 h-[3px] rounded-full transition-colors" style={{ background: isDragging ? '#e11d48' : 'rgba(255,255,255,0.15)' }} />
        </div>
      </div>

      {/* BOTTOM: Generations list */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Search */}
        <div className="flex-shrink-0 px-4 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <input
                value={centerSearch}
                onChange={e => setCenterSearch(e.target.value)}
                placeholder="Search generations..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs placeholder:text-white/20 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#fff' }}
              />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
              {tracks.length}
            </span>
          </div>
        </div>

        {/* Track rows */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'transparent' }}>
          {isGenerating && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(165,110,255,0.15)' }}>
                <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Generating…</p>
                <p className="text-xs" style={{ color: '#a78bfa' }}>Processing your request</p>
              </div>
            </div>
          )}
          {filteredTracks.length === 0 && !isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Music className="h-8 w-8 mb-2" style={{ color: 'rgba(255,255,255,0.07)' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>No generations yet</p>
            </div>
          ) : filteredTracks.map((track, i) => (
            <CenterTrackRow
              key={track.id}
              track={track}
              index={i + 1}
              isCurrent={currentTrack?.id === track.id}
              isPlaying={currentTrack?.id === track.id && isPlaying}
              onPlay={() => onPlay(track)}
              onSelect={() => onSelect(track)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TrackDetailView({ track, currentTrack, isPlaying, onPlay }) {
  const isActive = currentTrack?.id === track.id;
  const artist = track.created_by?.split('@')[0] || 'You';

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex gap-4">
        {/* Album Art */}
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.07)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {track.cover_image_url
            ? <img src={track.cover_image_url} alt={track.title} className="w-full h-full object-cover" />
            : <Music className="h-7 w-7 absolute inset-0 m-auto" style={{ color: 'rgba(255,255,255,0.12)' }} />
          }
          {isActive && isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="flex items-end gap-[2px]">
                {[0.6, 1, 0.5, 0.8].map((h, i) => (
                  <span key={i} className="w-[2.5px] rounded-full"
                    style={{ height: `${h * 14}px`, background: '#e11d48', animation: `beat-bar ${0.4 + i * 0.13}s ease-in-out infinite alternate` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link to={`/TrackInfo?id=${track.id}`}
            className="block text-lg font-extrabold leading-tight truncate transition-colors hover:text-[#e11d48]"
            style={{ color: '#fff' }}>
            {track.title}
          </Link>
          <Link to={`/Profile`}
            className="text-sm font-medium transition-colors hover:text-[#e11d48] block mt-0.5"
            style={{ color: 'rgba(255,255,255,0.45)' }}>
            {artist}
          </Link>
          {track.style && (
            <p className="text-[11px] mt-1 line-clamp-1" style={{ color: 'rgba(255,255,255,0.28)' }}>{track.style}</p>
          )}
          {track.duration && (
            <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: 'rgba(255,255,255,0.22)' }}>
              {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
            </p>
          )}
        </div>
      </div>

      {/* Lyrics snippet */}
      {track.lyrics && (
        <div className="rounded-xl px-3 py-2 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[11px] font-mono leading-relaxed line-clamp-4 whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {track.lyrics}
          </p>
        </div>
      )}

      {/* Waveform */}
      {isActive && (
        <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.12)' }}>
          <WaveformVisualizer height={48} />
        </div>
      )}
    </div>
  );
}

function CenterTrackRow({ track, index, isCurrent, isPlaying, onPlay, onSelect }) {
  const isReady = track.status === 'ready';
  const statusColor = { ready: '#22c55e', generating: '#a78bfa', queued: '#fbbf24', failed: '#f87171' };
  const dur = track.duration
    ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, '0')}`
    : '--:--';
  const artist = track.created_by?.split('@')[0] || 'You';
  const actions = [
    { icon: SkipForward, label: 'Remix', to: `/RemixStudio?trackId=${track.id}` },
    { icon: Video, label: 'Video', to: `/VideoStudio?trackId=${track.id}` },
    { icon: Layers, label: 'Stems', to: `/StemStudio?trackId=${track.id}` },
    { icon: Info, label: 'Info', to: `/TrackInfo?id=${track.id}` },
  ];

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all group"
      style={{ background: isCurrent ? 'rgba(225,29,72,0.07)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Play btn */}
      <button
        onClick={e => { e.stopPropagation(); onPlay(); }}
        disabled={!isReady}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        {isPlaying
          ? <Pause className="h-3.5 w-3.5 fill-white text-white" />
          : <Play className="h-3.5 w-3.5 fill-white text-white ml-0.5" />}
      </button>

      {/* Art */}
      <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {track.cover_image_url
          ? <img src={track.cover_image_url} alt="" className="w-full h-full object-cover" />
          : <Music className="h-3.5 w-3.5 absolute inset-0 m-auto" style={{ color: 'rgba(255,255,255,0.12)' }} />
        }
        {isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="flex items-end gap-[1.5px]">
              {[0.6, 1, 0.4].map((h, i) => (
                <span key={i} className="w-[1.5px] rounded-full"
                  style={{ height: `${h * 8}px`, background: '#e11d48', animation: `beat-bar ${0.5 + i * 0.15}s ease-in-out infinite alternate` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link to={`/TrackInfo?id=${track.id}`} onClick={e => e.stopPropagation()}
          className="text-xs font-semibold truncate block transition-colors hover:text-[#e11d48]"
          style={{ color: isCurrent ? '#f43f5e' : 'rgba(255,255,255,0.85)' }}>
          {track.title}
        </Link>
        <Link to="/Profile" onClick={e => e.stopPropagation()}
          className="text-[10px] truncate block transition-colors hover:text-[#e11d48]"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          {artist}
        </Link>
      </div>

      {/* Action chips on hover */}
      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
        {actions.map(({ icon: Icon, label, to }) => (
          <Link key={label} to={to} onClick={e => e.stopPropagation()} title={label}
            className="flex items-center gap-0.5 px-1.5 py-1 text-[10px] font-medium transition-colors hover:text-white/80 focus:outline-none focus:ring-1 focus:ring-rose-400"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            <Icon className="h-3 w-3" />
            <span className="hidden xl:inline">{label}</span>
          </Link>
        ))}
      </div>

      {/* Duration / status */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-1">
        {(track.status === 'generating' || track.status === 'queued') && (
          <Loader2 className="h-3 w-3 animate-spin" style={{ color: statusColor[track.status] }} />
        )}
        <span className="text-[11px] tabular-nums w-10 text-right" style={{ color: 'rgba(255,255,255,0.28)' }}>{dur}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Open actions for ${track.title}`}
              onClick={e => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-rose-400"
            >
              <MoreHorizontal className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={e => e.stopPropagation()}
            className="min-w-40 border-white/10 bg-[#101016] text-white shadow-2xl"
          >
            {actions.map(({ icon: Icon, label, to }) => (
              <DropdownMenuItem key={label} asChild className="cursor-pointer focus:bg-white/10">
                <Link to={to} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              disabled={!isReady}
              onSelect={(event) => {
                event.preventDefault();
                onPlay();
              }}
              className="cursor-pointer focus:bg-white/10"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5 mr-2" /> : <Play className="h-3.5 w-3.5 mr-2" />}
              {isPlaying ? 'Pause' : 'Play'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
