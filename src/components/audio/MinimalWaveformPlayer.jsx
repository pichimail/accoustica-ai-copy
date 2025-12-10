import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { motion } from 'framer-motion';

export default function MinimalWaveformPlayer({ src, className }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visualizerData, setVisualizerData] = useState(Array(60).fill(0));
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceNodeRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', updateDuration);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    if (src) {
      audio.load();
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', updateDuration);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [src]);

  useEffect(() => {
    if (!audioRef.current || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 128;

        if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceNodeRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
        }
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVisualizer = () => {
        if (!analyserRef.current || !isPlaying) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const normalizedData = Array.from(dataArray).slice(0, 60).map(v => v / 255);
        setVisualizerData(normalizedData);

        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();
    } catch (error) {
      console.error('Visualizer error:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    if (!audioRef.current || !src) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleSeek = (value) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={className}>
      <audio ref={audioRef} src={src} preload="auto" crossOrigin="anonymous" />

      <div className="flex items-center gap-4">
        {/* Play Button */}
        <button
          onClick={togglePlay}
          disabled={!src}
          className="h-12 w-12 rounded-full bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 shadow-lg transition-transform hover:scale-105"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 text-slate-900" />
          ) : (
            <Play className="h-5 w-5 text-slate-900 ml-0.5" />
          )}
        </button>

        {/* Waveform & Progress */}
        <div className="flex-1 min-w-0">
          {/* Waveform Visualizer */}
          <div className="relative h-16 rounded-lg bg-slate-800/50 overflow-hidden mb-2">
            <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-3">
              {visualizerData.map((value, index) => {
                const progress = currentTime / duration;
                const barProgress = index / visualizerData.length;
                const isPast = barProgress <= progress;

                return (
                  <motion.div
                    key={index}
                    className="flex-1 rounded-full"
                    style={{
                      height: `${Math.max(20, value * 90)}%`,
                      background: isPast
                        ? 'linear-gradient(to top, #8b5cf6, #a78bfa, #c4b5fd)'
                        : 'rgba(100, 116, 139, 0.3)',
                    }}
                    animate={{
                      height: `${Math.max(20, value * 90)}%`,
                    }}
                    transition={{ duration: 0.1 }}
                  />
                );
              })}
            </div>
          </div>

          {/* Time & Progress Slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1 cursor-pointer"
            />
            <span className="text-xs text-slate-400 w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}