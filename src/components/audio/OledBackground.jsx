import React, { useState, useEffect } from 'react';
import { useAudioPlayer } from './AudioPlayerContext';
import { useAlbumColor } from './AlbumColorExtractor';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Full-page OLED ambient background that reacts to the currently playing track.
 * Drop this inside any page as an absolute positioned layer.
 */
export default function OledBackground({ intensity = 1 }) {
  const { currentTrack, isPlaying } = useAudioPlayer();
  const [color, setColor] = useState(null);
  const [beatPulse, setBeatPulse] = useState(false);

  useAlbumColor(currentTrack?.cover_image_url, setColor);

  // Beat pulse effect
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 180);
    }, 800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const c = color?.css || 'rgba(124,58,237';
  const alpha = intensity * (beatPulse && isPlaying ? 0.22 : 0.14);
  const alpha2 = intensity * (beatPulse && isPlaying ? 0.1 : 0.06);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Base OLED */}
      <div className="absolute inset-0 bg-black" />

      {/* Blurred album art background */}
      <AnimatePresence mode="wait">
        {currentTrack?.cover_image_url && (
          <motion.div
            key={currentTrack.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            <img
              src={currentTrack.cover_image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-125"
              style={{ filter: 'blur(80px)', opacity: 0.07 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic color radial gradients */}
      <motion.div
        animate={{
          opacity: [1, beatPulse && isPlaying ? 1.15 : 1],
        }}
        transition={{ duration: 0.18 }}
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 15% 10%, ${c},${alpha}) 0%, transparent 70%),
            radial-gradient(ellipse 80% 50% at 85% 85%, ${c},${alpha2}) 0%, transparent 65%),
            radial-gradient(ellipse 60% 40% at 50% 50%, ${c},${alpha2 * 0.5}) 0%, transparent 60%)
          `,
        }}
      />

      {/* Frost vignette */}
      <div className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
      />
    </div>
  );
}