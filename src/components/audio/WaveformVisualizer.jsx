import React, { useRef, useEffect, useState } from 'react';
import { cn } from "@/lib/utils";

export default function WaveformVisualizer({ audioRef, isPlaying, height = 80, className }) {
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
      analyserRef.current.fftSize = 128; // More bars for 1sec frame
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current || !ctx) return;

      const width = canvasRef.current.offsetWidth;
      const height = canvasRef.current.offsetHeight;

      ctx.clearRect(0, 0, width, height);

      analyser.getByteFrequencyData(dataArray);

      const barWidth = width / bufferLength;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.8;
        
        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, `rgba(139, 92, 246, ${isPlaying ? 0.8 : 0.3})`); // Violet
        gradient.addColorStop(0.5, `rgba(236, 72, 153, ${isPlaying ? 0.6 : 0.2})`); // Pink
        gradient.addColorStop(1, `rgba(59, 130, 246, ${isPlaying ? 0.4 : 0.1})`); // Blue

        ctx.fillStyle = gradient;
        ctx.fillRect(
          i * barWidth,
          height - barHeight,
          barWidth - 2,
          barHeight
        );
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    if (isPlaying) {
      draw();
    } else {
      // Show static waveform when paused
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = height * 0.1;
        ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
        ctx.fillRect(
          i * barWidth,
          height / 2 - barHeight / 2,
          barWidth - 2,
          barHeight
        );
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioRef, isPlaying, height]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full rounded-lg", className)}
      style={{ height: `${height}px` }}
    />
  );
}