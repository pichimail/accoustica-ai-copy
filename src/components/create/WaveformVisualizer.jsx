import React, { useEffect, useRef } from 'react';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';

export default function WaveformVisualizer({ height = 56 }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const { audioRef, isPlaying, currentTrack } = useAudioPlayer();

  useEffect(() => {
    if (!audioRef?.current || !currentTrack) return;

    const setup = () => {
      if (audioCtxRef.current) return; // already set up
      try {
        const AudioContextClass = window.AudioContext || window['webkitAudioContext'];
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.78;
        const src = ctx.createMediaElementSource(audioRef.current);
        src.connect(analyser);
        analyser.connect(ctx.destination);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = src;
      } catch (e) {
        // Already connected or not supported
      }
    };

    setup();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    const bufferLen = analyserRef.current?.frequencyBinCount || 64;
    const dataArray = new Uint8Array(bufferLen);

    let phase = 0;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      if (!isPlaying || !analyserRef.current) {
        // Idle flat line
        ctx2d.beginPath();
        ctx2d.strokeStyle = 'rgba(225,29,72,0.35)';
        ctx2d.lineWidth = 1.5;
        ctx2d.moveTo(0, h / 2);
        for (let x = 0; x < w; x++) {
          const y = h / 2 + Math.sin((x / w) * Math.PI * 4 + phase) * 2;
          ctx2d.lineTo(x, y);
        }
        ctx2d.stroke();
        phase += 0.02;
        return;
      }

      analyserRef.current.getByteFrequencyData(dataArray);

      const barWidth = (w / bufferLen) * 1.6;
      let x = 0;

      const gradient = ctx2d.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, '#e11d48');
      gradient.addColorStop(0.5, '#f43f5e');
      gradient.addColorStop(1, '#be185d');

      for (let i = 0; i < bufferLen; i++) {
        const barH = (dataArray[i] / 255) * h;
        const y = h - barH;
        const alpha = 0.6 + (dataArray[i] / 255) * 0.4;

        ctx2d.fillStyle = gradient;
        ctx2d.globalAlpha = alpha;
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, barWidth - 1, barH, 1);
        ctx2d.fill();
        x += barWidth + 0.5;
      }
      ctx2d.globalAlpha = 1;
    };

    draw();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, currentTrack, audioRef]);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px`, display: 'block' }}
    />
  );
}