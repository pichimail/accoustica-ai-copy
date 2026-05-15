// @ts-nocheck
import React, { useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAudioPlayer } from './AudioPlayerContext.jsx';
import { ensureAudioContext, resumeAudioContext, getAudioAnalyser } from '@/lib/audioContext';
import FullscreenPlayer from './FullscreenPlayer';

function formatTime(s) {
  if (!s || isNaN(s) || !isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function GlobalAudioPlayer({ currentPageName }) {
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    audioRef, setCurrentTime, setDuration, setIsPlaying,
    togglePlayPause, playNext, playPrevious, seek, changeVolume,
    repeatMode, isFullscreen, setIsFullscreen, playerVisible,
  } = useAudioPlayer();

  // Callback ref — attaches the <audio> DOM node into audioRef
  const audioCallbackRef = useCallback((node) => {
    if (!node) return;
    audioRef.current = node;

    node.addEventListener('timeupdate', () => {
      setCurrentTime(node.currentTime);
    });
    node.addEventListener('loadedmetadata', () => {
      if (!isNaN(node.duration) && isFinite(node.duration)) {
        setDuration(node.duration);
      }
    });
    node.addEventListener('durationchange', () => {
      if (!isNaN(node.duration) && isFinite(node.duration)) {
        setDuration(node.duration);
      }
    });
    node.addEventListener('play', () => {
      setIsPlaying(true);
      ensureAudioContext();
      resumeAudioContext();
      getAudioAnalyser(node);
    });
    node.addEventListener('pause', () => setIsPlaying(false));
    node.addEventListener('ended', () => {
      setIsPlaying(false);
      if (repeatMode === 'one') {
        node.currentTime = 0;
        node.play().catch(() => {});
      } else {
        playNext();
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentTrack || !playerVisible) {
    return <audio ref={audioCallbackRef} crossOrigin="anonymous" preload="auto" style={{ display: 'none' }} />;
  }

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const coverImg = currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=80&h=80&fit=crop';

  return (
    <>
      {/* Hidden audio element — always mounted */}
      <audio ref={audioCallbackRef} crossOrigin="anonymous" preload="auto" style={{ display: 'none' }} />

      {/* Mini player bar */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-[100]"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--mobile-nav-reserve, 0px))',
            }}
          >
            {/* Progress bar — flush to top of player */}
            <div className="w-full h-1 relative" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="absolute top-0 left-0 h-full transition-none"
                style={{ width: `${pct}%`, background: '#22c55e' }}
              />
            </div>

            {/* Player body */}
            <div
              className="flex items-center gap-3 px-3 py-2"
              style={{
                background: 'rgba(10,10,15,0.97)',
                backdropFilter: 'blur(24px)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Cover art */}
              <button
                onClick={() => { ensureAudioContext(); resumeAudioContext(); setIsFullscreen(true); }}
                className="flex-shrink-0 relative w-11 h-11 rounded-lg overflow-hidden"
              >
                <img src={coverImg} alt={currentTrack.title} className="w-full h-full object-cover" />
                {isPlaying && (
                  <div className="absolute inset-0 flex items-end justify-center gap-[2px] pb-1 bg-black/20">
                    {[1, 0.6, 0.8].map((h, j) => (
                      <span
                        key={j}
                        className="w-[2px] rounded-full bg-green-400"
                        style={{ height: `${h * 60}%`, animation: `beat-bar ${0.5 + j * 0.2}s ease-in-out infinite alternate` }}
                      />
                    ))}
                  </div>
                )}
              </button>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate leading-tight">{currentTrack.title}</p>
                <p className="text-white/40 text-xs truncate">{currentTrack.style || 'AI Generated'}</p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={playPrevious}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/50 hover:text-white transition-colors"
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                <button
                  onClick={() => { ensureAudioContext(); resumeAudioContext(); togglePlayPause(); }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-black font-bold neon-green-glow"
                  style={{ background: '#22c55e' }}
                >
                  {isPlaying
                    ? <Pause className="h-4 w-4 fill-black" />
                    : <Play className="h-4 w-4 fill-black ml-0.5" />
                  }
                </button>

                <button
                  onClick={playNext}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/50 hover:text-white transition-colors"
                >
                  <SkipForward className="h-4 w-4" />
                </button>

                <button
                  onClick={() => { ensureAudioContext(); resumeAudioContext(); setIsFullscreen(true); }}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/30 hover:text-white transition-colors"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen player */}
      <FullscreenPlayer />
    </>
  );
}