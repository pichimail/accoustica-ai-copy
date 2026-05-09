import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';

export default function DynamicGradient() {
  const { currentTrack, isPlaying } = useAudioPlayer();
  const [colors, setColors] = useState(['#8B5CF6', '#EC4899', '#6366F1']);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [audioIntensity, setAudioIntensity] = useState(0);

  useEffect(() => {
    if (currentTrack?.cover_image_url) {
      const colorPalettes = {
        default: ['#8B5CF6', '#EC4899', '#6366F1'],
        warm: ['#f59e0b', '#ef4444', '#ec4899'],
        cool: ['#06b6d4', '#3b82f6', '#8b5cf6'],
        green: ['#10b981', '#059669', '#047857'],
      };
      const palettes = Object.values(colorPalettes);
      setColors(palettes[Math.floor(Math.random() * palettes.length)]);
    }
  }, [currentTrack?.id]);

  // Beat detection and audio sync
  useEffect(() => {
    if (isPlaying && currentTrack) {
      const audioElement = document.querySelector('audio');
      if (audioElement && !audioContextRef.current) {
        try {
          const AudioContextClass = window.AudioContext || window['webkitAudioContext'];
          if (!AudioContextClass) return;
          audioContextRef.current = new AudioContextClass();
          analyserRef.current = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaElementSource(audioElement);
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          analyserRef.current.fftSize = 256;
          
          const analyzeAudio = () => {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioIntensity(average / 255);
            animationFrameRef.current = requestAnimationFrame(analyzeAudio);
          };
          
          analyzeAudio();
        } catch (err) {
          console.log('Audio analysis not available');
        }
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioIntensity(0);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTrack]);

  const baseIntensity = isPlaying ? 0.03 + audioIntensity * 0.02 : 0.02;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        {currentTrack && (
          <motion.div
            key={currentTrack.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0"
          >
            {/* Gradient Orbs that sync with beat */}
            <motion.div
              animate={{
                scale: isPlaying ? [1, 1 + audioIntensity * 0.3, 1] : 1,
                x: isPlaying ? [0, 100, 0] : 0,
                y: isPlaying ? [0, -50, 0] : 0,
                opacity: [baseIntensity, baseIntensity + audioIntensity * 0.03, baseIntensity],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, ${colors[0]} 0%, transparent 70%)`
              }}
            />
            
            <motion.div
              animate={{
                scale: isPlaying ? [1, 1 + audioIntensity * 0.4, 1] : 1,
                x: isPlaying ? [0, -80, 0] : 0,
                y: isPlaying ? [0, 60, 0] : 0,
                opacity: [baseIntensity, baseIntensity + audioIntensity * 0.03, baseIntensity],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
              className="absolute top-1/2 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, ${colors[1]} 0%, transparent 70%)`
              }}
            />
            
            <motion.div
              animate={{
                scale: isPlaying ? [1, 1 + audioIntensity * 0.25, 1] : 1,
                x: isPlaying ? [0, 50, 0] : 0,
                y: isPlaying ? [0, -80, 0] : 0,
                opacity: [baseIntensity, baseIntensity + audioIntensity * 0.03, baseIntensity],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
              className="absolute bottom-1/4 left-1/2 w-[500px] h-[500px] rounded-full blur-3xl"
              style={{
                background: `radial-gradient(circle, ${colors[2]} 0%, transparent 70%)`
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frost Glass Effect - very subtle */}
      <div className="absolute inset-0 backdrop-blur-[120px] bg-slate-950/50" />
    </div>
  );
}