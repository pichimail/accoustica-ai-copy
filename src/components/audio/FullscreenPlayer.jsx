import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  Repeat, Repeat1, Shuffle, Volume2, VolumeX, Volume1,
  Zap, Radio, Activity, Circle, Heart, Share2,
  ListMusic, Palette
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useAudioPlayer } from './AudioPlayerContext';
import AdvancedVisualizer, { VIZ_COLORS } from './AdvancedVisualizer';

const VIZ_MODES = [
  { key: 'bars',     label: 'Bars',     Icon: Activity },
  { key: 'waveform', label: 'Wave',     Icon: Radio },
  { key: 'mirror',   label: 'Mirror',   Icon: Zap },
  { key: 'circular', label: 'Orbit',    Icon: Circle },
];

const COLOR_KEYS = Object.keys(VIZ_COLORS);

function extractDominantColors(imageUrl, cb) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = 50; c.height = 50;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 50, 50);
      const d = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < d.length; i += 16) {
        r += d[i]; g += d[i + 1]; b += d[i + 2]; count++;
      }
      r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
      cb([`rgba(${r},${g},${b},`, `rgba(${Math.min(255,r+40)},${g},${Math.min(255,b+40)},`, `rgba(${r},${Math.min(255,g+30)},${b},`]);
    } catch { cb(null); }
  };
  img.onerror = () => cb(null);
  img.src = imageUrl;
}

export default function FullscreenPlayer() {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, repeatMode, isShuffle,
    audioRef, togglePlayPause, playNext, playPrevious, seek, changeVolume,
    toggleRepeat, toggleShuffle, isFullscreen, setIsFullscreen,
  } = useAudioPlayer();

  const [vizMode, setVizMode] = useState('bars');
  const [colorKey, setColorKey] = useState('violet');
  const [syncAlbumArt, setSyncAlbumArt] = useState(false);
  const [albumColors, setAlbumColors] = useState(null);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);

  // Extract album art colors when toggled / track changes
  useEffect(() => {
    if (syncAlbumArt && currentTrack?.cover_image_url) {
      extractDominantColors(currentTrack.cover_image_url, (colors) => {
        setAlbumColors(colors);
      });
    } else {
      setAlbumColors(null);
    }
  }, [syncAlbumArt, currentTrack?.cover_image_url]);

  // Lyric sync
  const parseLyrics = (lyrics) => {
    if (!lyrics) return [];
    const lines = lyrics.split('\n').filter(l => l.trim());
    return lines.map((text, i) => ({ time: (duration / lines.length) * i, text: text.trim() }));
  };
  const lyricLines = parseLyrics(currentTrack?.lyrics);
  useEffect(() => {
    if (!lyricLines.length) return;
    const idx = lyricLines.findIndex((l, i) => {
      const next = lyricLines[i + 1];
      return currentTime >= l.time && (!next || currentTime < next.time);
    });
    if (idx !== -1) setCurrentLyricIndex(idx);
  }, [currentTime]);

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const activeColors = syncAlbumArt && albumColors ? albumColors : (VIZ_COLORS[colorKey] || VIZ_COLORS.violet);
  const gradientCss = `linear-gradient(135deg, ${activeColors[0]}0.6) 0%, ${activeColors[1]}0.4) 50%, ${activeColors[2]}0.3) 100%)`;

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 280 }}
          className="fixed inset-0 z-[200] overflow-hidden"
          style={{ background: 'rgb(2,3,15)' }}
        >
          {/* Blurred album art BG */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={currentTrack.cover_image_url}
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-20"
              alt=""
            />
            <div className="absolute inset-0" style={{ background: gradientCss }} />
            <div className="absolute inset-0 bg-black/60" />
          </div>

          <div className="relative z-10 h-full flex flex-col pt-safe-top pb-safe-bottom overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-12 pb-4 flex-shrink-0">
              <Button size="icon" variant="ghost" onClick={() => setIsFullscreen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-10 w-10">
                <ChevronDown className="h-6 w-6" />
              </Button>
              <div className="text-center">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Now Playing</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setShowColorPanel(!showColorPanel)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-10 w-10">
                <Palette className="h-5 w-5" />
              </Button>
            </div>

            {/* Color / Viz Panel */}
            <AnimatePresence>
              {showColorPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex-shrink-0"
                >
                  <div className="mx-5 mb-3 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 space-y-3">
                    {/* Viz mode */}
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Visualizer</p>
                      <div className="flex gap-2">
                        {VIZ_MODES.map(({ key, label, Icon }) => (
                          <button key={key} onClick={() => setVizMode(key)}
                            className={cn('flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs transition-all',
                              vizMode === key ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70')}>
                            <Icon className="h-4 w-4" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Colors */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-white/40 uppercase tracking-wider">Color</p>
                        <button onClick={() => setSyncAlbumArt(!syncAlbumArt)}
                          className={cn('text-xs px-3 py-1 rounded-full border transition-all',
                            syncAlbumArt ? 'bg-violet-500/30 border-violet-500/50 text-violet-300' : 'border-white/20 text-white/40')}>
                          🎨 Sync Art
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {COLOR_KEYS.map(k => (
                          <button key={k} onClick={() => { setColorKey(k); setSyncAlbumArt(false); }}
                            className={cn('w-8 h-8 rounded-full border-2 transition-all',
                              colorKey === k && !syncAlbumArt ? 'border-white scale-110' : 'border-transparent')}
                            style={{ background: `${VIZ_COLORS[k][0]}1) 0%` }}>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Album Art */}
            <div className="flex-shrink-0 flex items-center justify-center px-8 py-2">
              <motion.div
                key={currentTrack.id}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: isPlaying ? 1 : 0.93, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="relative"
              >
                <div className="w-72 h-72 md:w-80 md:h-80 rounded-3xl overflow-hidden shadow-2xl"
                  style={{ boxShadow: `0 30px 80px ${activeColors[0]}0.5)` }}>
                  <img
                    src={currentTrack.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>

            {/* Visualizer */}
            <div className="flex-shrink-0 mx-5 my-2 rounded-2xl overflow-hidden bg-white/5 border border-white/10">
              <AdvancedVisualizer
                audioRef={audioRef}
                isPlaying={isPlaying}
                type={vizMode}
                colorKey={colorKey}
                customColors={syncAlbumArt ? albumColors : null}
                sensitivity={1.1}
                height={vizMode === 'circular' ? 140 : 72}
              />
            </div>

            {/* Track Info */}
            <div className="flex-shrink-0 px-6 pt-2 pb-1 text-center">
              <h1 className="text-2xl font-bold text-white truncate">{currentTrack.title}</h1>
              <p className="text-sm text-white/50 mt-0.5">{currentTrack.style || 'Unknown Style'}</p>
            </div>

            {/* Lyrics */}
            {lyricLines.length > 0 && (
              <div className="flex-shrink-0 h-16 overflow-hidden px-6 text-center mb-1">
                {lyricLines.map((lyric, i) => (
                  <motion.p key={i}
                    initial={{ opacity: 0.2 }}
                    animate={{
                      opacity: i === currentLyricIndex ? 1 : 0.25,
                      scale: i === currentLyricIndex ? 1.05 : 1,
                      y: (currentLyricIndex - i) * -26,
                    }}
                    transition={{ duration: 0.3 }}
                    className={cn('text-sm font-medium',
                      i === currentLyricIndex ? 'text-white' : 'text-white/30')}>
                    {lyric.text}
                  </motion.p>
                ))}
              </div>
            )}

            {/* Progress */}
            <div className="flex-shrink-0 px-6 mt-1">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={(v) => seek(v[0])}
                className={cn(
                  'cursor-pointer',
                  '[&>span:first-child]:h-1.5 [&>span:first-child]:bg-white/15',
                  '[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-lg'
                )}
                style={{ '--slider-thumb-bg': activeColors[0] + '1)' }}
              />
              <div className="flex justify-between text-xs text-white/40 mt-1.5 tabular-nums">
                <span>{fmt(currentTime)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex-shrink-0 px-6 pt-2 pb-4">
              <div className="flex items-center justify-between mb-5">
                <Button size="icon" variant="ghost" onClick={toggleShuffle}
                  className={cn('h-10 w-10 rounded-full hover:bg-white/10',
                    isShuffle ? 'text-violet-400' : 'text-white/40')}>
                  <Shuffle className="h-5 w-5" />
                </Button>

                <Button size="icon" variant="ghost" onClick={playPrevious}
                  className="h-14 w-14 rounded-full text-white hover:bg-white/10">
                  <SkipBack className="h-7 w-7" />
                </Button>

                <Button size="icon" onClick={togglePlayPause}
                  className="h-20 w-20 rounded-full text-white shadow-2xl transition-transform active:scale-95"
                  style={{ background: `${activeColors[0]}0.9) 0%, ${activeColors[1]}0.9) 100%` }}>
                  {isPlaying ? <Pause className="h-9 w-9" /> : <Play className="h-9 w-9 ml-1" />}
                </Button>

                <Button size="icon" variant="ghost" onClick={playNext}
                  className="h-14 w-14 rounded-full text-white hover:bg-white/10">
                  <SkipForward className="h-7 w-7" />
                </Button>

                <Button size="icon" variant="ghost" onClick={toggleRepeat}
                  className={cn('h-10 w-10 rounded-full hover:bg-white/10',
                    repeatMode !== 'off' ? 'text-violet-400' : 'text-white/40')}>
                  {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                </Button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <button onClick={() => changeVolume(volume === 0 ? 70 : 0)} className="text-white/40 hover:text-white">
                  {volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 50 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  onValueChange={(v) => changeVolume(v[0])}
                  className="flex-1 cursor-pointer [&>span:first-child]:h-1 [&>span:first-child]:bg-white/15 [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:bg-white [&_[role=slider]]:border-0"
                />
                <Volume2 className="h-4 w-4 text-white/40" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}