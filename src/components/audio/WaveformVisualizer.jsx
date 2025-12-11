import React, { useRef, useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { COLOR_PALETTES } from './VisualizerSettings';

export default function WaveformVisualizer({ 
  audioRef, 
  isPlaying, 
  height = 80, 
  className,
  colorPalette = 'violet',
  sensitivity = 100,
  smoothness = 50,
  type = 'waveform'
}) {
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    if (!audioRef?.current || !canvasRef.current) return;

    const audio = audioRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Initialize audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaElementSource(audio);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = type === 'bars' ? 256 : 128;
      analyserRef.current.smoothingTimeConstant = smoothness / 100;
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    const analyser = analyserRef.current;
    analyser.smoothingTimeConstant = smoothness / 100;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const colors = COLOR_PALETTES[colorPalette]?.colors || COLOR_PALETTES.violet.colors;
    const sensitivityMultiplier = sensitivity / 100;

    const draw = () => {
      if (!canvasRef.current || !ctx) return;

      const width = canvasRef.current.offsetWidth;
      const height = canvasRef.current.offsetHeight;

      ctx.clearRect(0, 0, width, height);

      analyser.getByteFrequencyData(dataArray);

      const barWidth = width / bufferLength;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.8 * sensitivityMultiplier;
        
        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        
        if (type === 'bars') {
          // Frequency bars style
          gradient.addColorStop(0, colors[0].replace(/[\d.]+\)$/, `${isPlaying ? 0.9 : 0.3})`));
          gradient.addColorStop(0.5, colors[1].replace(/[\d.]+\)$/, `${isPlaying ? 0.7 : 0.2})`));
          gradient.addColorStop(1, colors[2].replace(/[\d.]+\)$/, `${isPlaying ? 0.5 : 0.1})`));
        } else {
          // Waveform style
          gradient.addColorStop(0, colors[0].replace(/[\d.]+\)$/, `${isPlaying ? 0.8 : 0.3})`));
          gradient.addColorStop(0.5, colors[1].replace(/[\d.]+\)$/, `${isPlaying ? 0.6 : 0.2})`));
          gradient.addColorStop(1, colors[2].replace(/[\d.]+\)$/, `${isPlaying ? 0.4 : 0.1})`));
        }

        ctx.fillStyle = gradient;
        
        if (type === 'bars') {
          // Draw from bottom
          ctx.fillRect(
            i * barWidth,
            height - barHeight,
            barWidth - 2,
            barHeight
          );
        } else {
          // Waveform centered
          ctx.fillRect(
            i * barWidth,
            height / 2 - barHeight / 2,
            barWidth - 2,
            barHeight
          );
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    if (isPlaying) {
      draw();
    } else {
      // Show static waveform when paused
      const width = canvasRef.current.offsetWidth;
      const height = canvasRef.current.offsetHeight;
      const barWidth = width / bufferLength;
      
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = height * 0.1;
        ctx.fillStyle = colors[0].replace(/[\d.]+\)$/, '0.2)');
        
        if (type === 'bars') {
          ctx.fillRect(
            i * barWidth,
            height - barHeight,
            barWidth - 2,
            barHeight
          );
        } else {
          ctx.fillRect(
            i * barWidth,
            height / 2 - barHeight / 2,
            barWidth - 2,
            barHeight
          );
        }
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioRef, isPlaying, height, colorPalette, sensitivity, smoothness, type]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full rounded-lg", className)}
      style={{ height: `${height}px` }}
    />
  );
}