import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function FloatingAlbumArt({ tracks, onTrackPlay }) {
  const [playingId, setPlayingId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const audioRefs = useRef({});

  const handlePlay = (track) => {
    // Stop all other tracks
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) audio.pause();
    });
    
    setPlayingId(track.id);
    onTrackPlay?.(track);
    
    const audio = audioRefs.current[track.id];
    if (audio) {
      audio.play();
    }
  };

  const handlePause = (trackId) => {
    setPlayingId(null);
    const audio = audioRefs.current[trackId];
    if (audio) {
      audio.pause();
    }
  };

  const positions = [
    { top: '10%', left: '15%', delay: 0 },
    { top: '25%', right: '20%', delay: 0.2 },
    { top: '50%', left: '10%', delay: 0.4 },
    { top: '70%', right: '15%', delay: 0.6 },
    { top: '15%', left: '50%', delay: 0.8 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {tracks.slice(0, 5).map((track, index) => {
        const position = positions[index] || positions[0];
        const isPlaying = playingId === track.id;
        const isHovered = hoveredId === track.id;
        
        return (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, scale: 0, ...position }}
            animate={{ 
              opacity: 0.15, 
              scale: 1,
              ...position
            }}
            transition={{ 
              delay: position.delay,
              duration: 0.8,
              opacity: { duration: 1.5 }
            }}
            className="absolute pointer-events-auto"
            onMouseEnter={() => setHoveredId(track.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group cursor-pointer"
            >
              <div className={cn(
                "w-32 h-32 rounded-2xl overflow-hidden border-2 transition-all duration-300",
                isPlaying 
                  ? "border-violet-400/60 shadow-2xl shadow-violet-500/40" 
                  : "border-slate-700/30 shadow-xl"
              )}>
                <img
                  src={track.cover_image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400'}
                  alt={track.title}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300",
                  isHovered || isPlaying ? "opacity-100" : "opacity-0"
                )}>
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-xs font-medium truncate">
                      {track.title}
                    </p>
                    <p className="text-slate-300 text-[10px] truncate">
                      {track.style}
                    </p>
                  </div>
                </div>

                {/* Play/Pause Button */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: isHovered || isPlaying ? 1 : 0,
                    scale: isHovered || isPlaying ? 1 : 0.8
                  }}
                  onClick={() => isPlaying ? handlePause(track.id) : handlePlay(track)}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-xl flex items-center justify-center shadow-2xl"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 text-slate-900" />
                  ) : (
                    <Play className="h-5 w-5 text-slate-900 ml-0.5" />
                  )}
                </motion.button>
              </div>

              {/* Audio element */}
              <audio
                ref={el => audioRefs.current[track.id] = el}
                src={track.audio_url || track.stream_audio_url}
                onEnded={() => setPlayingId(null)}
              />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}