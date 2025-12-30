import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useAudioPlayer } from './AudioPlayerContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  Heart,
  Share2,
  MoreHorizontal,
  ListMusic,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function FullScreenPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    repeatMode,
    isShuffle,
    isFullscreen,
    togglePlayPause,
    playNext,
    playPrevious,
    seek,
    changeVolume,
    toggleRepeat,
    toggleShuffle,
    setIsFullscreen,
  } = useAudioPlayer();

  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const queryClient = useQueryClient();

  // Swipe gesture detection
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);
  const scale = useTransform(y, [0, 300], [1, 0.9]);

  useEffect(() => {
    if (currentTrack) {
      setIsFavorite(currentTrack.is_favorite || false);
    }
  }, [currentTrack?.id]);

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.Track.update(currentTrack.id, {
        is_favorite: !isFavorite,
      });
    },
    onSuccess: () => {
      setIsFavorite(!isFavorite);
      queryClient.invalidateQueries({ queryKey: ['myTracks'] });
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    },
  });

  const handleClose = () => {
    haptics.light();
    setIsFullscreen(false);
  };

  const handlePlayPause = () => {
    haptics.medium();
    togglePlayPause();
  };

  const handleNext = () => {
    haptics.medium();
    playNext();
  };

  const handlePrevious = () => {
    haptics.medium();
    playPrevious();
  };

  const handleSeek = (value) => {
    seek(value[0]);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShare = async () => {
    haptics.light();
    try {
      const shareUrl = `${window.location.origin}/PublicTrack?id=${currentTrack.id}`;
      if (navigator.share) {
        await navigator.share({
          title: currentTrack.title,
          text: `Listen to "${currentTrack.title}" on Accoustica AI Studio`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (!isFullscreen || !currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-[100] bg-gradient-to-b from-slate-900 via-slate-950 to-black"
        style={{ opacity, scale }}
      >
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 200) {
              handleClose();
            }
          }}
          style={{ y }}
          className="h-full flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 pt-safe">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full"
            >
              <ChevronDown className="h-6 w-6 text-slate-400" />
            </Button>
            <div className="text-center flex-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Playing from Library
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowQueue(!showQueue)}
              className="rounded-full"
            >
              <ListMusic className="h-5 w-5 text-slate-400" />
            </Button>
          </div>

          {/* Drag Handle */}
          <div className="flex justify-center py-2">
            <div className="w-12 h-1 bg-slate-700 rounded-full" />
          </div>

          {/* Album Art Container */}
          <div className="flex-1 flex items-center justify-center px-6 py-8">
            <motion.div
              animate={isPlaying ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-full max-w-md aspect-square"
            >
              {/* Album Art */}
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src={
                    currentTrack.cover_image_url ||
                    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop'
                  }
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>

              {/* Vinyl Effect (rotating when playing) */}
              {isPlaying && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="absolute -right-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 opacity-20 blur-xl"
                />
              )}
            </motion.div>
          </div>

          {/* Track Info */}
          <div className="px-8 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white mb-1 truncate">
                  {currentTrack.title}
                </h1>
                <p className="text-slate-400 truncate">{currentTrack.style}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  haptics.light();
                  toggleFavoriteMutation.mutate();
                }}
                className="flex-shrink-0"
              >
                <Heart
                  className={cn(
                    'h-6 w-6',
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'
                  )}
                />
              </Button>
            </div>

            {/* Lyrics Toggle */}
            {currentTrack.lyrics && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  haptics.selection();
                  setShowLyrics(!showLyrics);
                }}
                className="mt-2 text-violet-400 hover:text-violet-300"
              >
                {showLyrics ? 'Hide Lyrics' : 'Show Lyrics'}
              </Button>
            )}

            {/* Lyrics Display */}
            <AnimatePresence>
              {showLyrics && currentTrack.lyrics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 max-h-32 overflow-y-auto glass-surface rounded-xl p-4"
                >
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">
                    {currentTrack.lyrics}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Bar */}
          <div className="px-8 py-4">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="px-8 py-6">
            {/* Main Controls */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  haptics.selection();
                  toggleShuffle();
                }}
                className={cn('rounded-full', isShuffle && 'text-violet-400')}
              >
                <Shuffle className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="rounded-full hover:scale-110 transition-transform"
              >
                <SkipBack className="h-7 w-7 fill-white" />
              </Button>

              <Button
                onClick={handlePlayPause}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 shadow-lg hover:scale-105 transition-transform"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8 fill-white" />
                ) : (
                  <Play className="h-8 w-8 fill-white ml-1" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="rounded-full hover:scale-110 transition-transform"
              >
                <SkipForward className="h-7 w-7 fill-white" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  haptics.selection();
                  toggleRepeat();
                }}
                className={cn(
                  'rounded-full',
                  repeatMode !== 'off' && 'text-violet-400'
                )}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="h-5 w-5" />
                ) : (
                  <Repeat className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="rounded-full"
              >
                <Share2 className="h-5 w-5 text-slate-400" />
              </Button>

              <div className="flex items-center gap-2 flex-1 max-w-xs mx-4">
                <Volume2 className="h-4 w-4 text-slate-400" />
                <Slider
                  value={[volume]}
                  max={100}
                  step={1}
                  onValueChange={(value) => changeVolume(value[0])}
                  className="cursor-pointer"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <MoreHorizontal className="h-5 w-5 text-slate-400" />
              </Button>
            </div>
          </div>

          {/* Queue Indicator */}
          {queue.length > 0 && (
            <div className="px-8 pb-safe">
              <p className="text-xs text-slate-500 text-center">
                {queueIndex + 1} of {queue.length} in queue
              </p>
            </div>
          )}
        </motion.div>

        {/* Queue Panel */}
        <AnimatePresence>
          {showQueue && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowQueue(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute right-0 top-0 bottom-0 w-80 glass-surface border-l border-white/10 overflow-y-auto"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Queue</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowQueue(false)}
                    >
                      <X className="h-5 w-5 text-slate-400" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {queue.map((track, index) => (
                      <div
                        key={track.id}
                        className={cn(
                          'p-3 rounded-lg transition-colors cursor-pointer',
                          index === queueIndex
                            ? 'bg-violet-500/20 border border-violet-500/30'
                            : 'bg-slate-800/50 hover:bg-slate-800'
                        )}
                      >
                        <p className="text-white font-medium text-sm truncate">
                          {track.title}
                        </p>
                        <p className="text-slate-400 text-xs truncate">
                          {track.style}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
