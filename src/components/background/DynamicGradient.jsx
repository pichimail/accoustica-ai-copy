import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';

export default function DynamicGradient() {
  const { currentTrack, isPlaying } = useAudioPlayer();
  const [colors, setColors] = useState(['#8B5CF6', '#EC4899', '#6366F1']);

  useEffect(() => {
    if (currentTrack?.cover_image_url) {
      // Extract colors from album art (simplified - in production use a color extraction library)
      setColors(['#8B5CF6', '#EC4899', '#6366F1']);
    }
  }, [currentTrack]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        {currentTrack && (
          <motion.div
            key={currentTrack.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.03 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0"
          >
            {/* Gradient Orbs */}
            <motion.div
              animate={{
                scale: isPlaying ? [1, 1.2, 1] : 1,
                x: isPlaying ? [0, 100, 0] : 0,
                y: isPlaying ? [0, -50, 0] : 0,
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, ${colors[0]}40 0%, transparent 70%)`
              }}
            />
            
            <motion.div
              animate={{
                scale: isPlaying ? [1, 1.3, 1] : 1,
                x: isPlaying ? [0, -80, 0] : 0,
                y: isPlaying ? [0, 60, 0] : 0,
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
              className="absolute top-1/2 right-1/4 w-96 h-96 rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, ${colors[1]}40 0%, transparent 70%)`
              }}
            />
            
            <motion.div
              animate={{
                scale: isPlaying ? [1, 1.1, 1] : 1,
                x: isPlaying ? [0, 50, 0] : 0,
                y: isPlaying ? [0, -80, 0] : 0,
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
              className="absolute bottom-1/4 left-1/2 w-96 h-96 rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, ${colors[2]}40 0%, transparent 70%)`
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frost Glass Effect */}
      <div className="absolute inset-0 backdrop-blur-[120px]" />
    </div>
  );
}