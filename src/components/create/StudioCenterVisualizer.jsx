// @ts-nocheck
/**
 * StudioCenterVisualizer
 * Full-panel real-time frequency visualizer for the Studio Center column.
 * Renders as an absolute background layer — all existing panel content
 * (track detail, track list) floats above it at z-index 1.
 *
 * Visual design:
 *  • Blurred album art tint at 14% opacity
 *  • Center-spread mirrored bars in rose/pink gradient (matching center panel accent)
 *  • Breathing idle animation when paused / no track
 *  • Clickable progress bar pinned to the bottom edge
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { getAudioAnalyser, resumeAudioContext } from '@/lib/audioContext';
import { useAudioPlayer } from '@/components/audio/AudioPlayerContext';

const BARS = 72;

export default function StudioCenterVisualizer() {
  const { currentTrack, isPlaying, currentTime, duration, audioRef, seek } = useAudioPlayer();
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  // Wire the shared AudioContext to the persistent audio element whenever track changes
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;
    getAudioAnalyser(audio);
    const onPlay = () => resumeAudioContext();
    audio.addEventListener('play', onPlay);
    onPlay();
    return () => audio.removeEventListener('play', onPlay);
  }, [audioRef, currentTrack?.id]);

  // Continuous draw loop — runs for the lifetime of the component
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');

    // Resize to device pixels (no ctx.scale — draw uses canvas.width/height directly)
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      c.clearRect(0, 0, W, H);

      // Fetch latest frequency data from the shared analyser
      const analyser = getAudioAnalyser(audioRef?.current);
      const data = new Float32Array(BARS);

      if (analyser) {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        for (let i = 0; i < BARS; i++) {
          // Map bars across the lower 80% of frequency bins (most musical content)
          const srcIdx = Math.floor((i / BARS) * (buf.length * 0.8));
          data[i] = buf[srcIdx] / 255;
        }
        resumeAudioContext();
      } else {
        // Idle breathing pulse — gentle sinusoid
        const t = Date.now() / 2200;
        for (let i = 0; i < BARS; i++) {
          data[i] = (Math.sin(t * Math.PI * 2 + i * 0.28) * 0.5 + 0.5) * 0.14 + 0.03;
        }
      }

      const dpr  = window.devicePixelRatio || 1;
      const barW = W / BARS;
      const midY = H / 2;

      for (let i = 0; i < BARS; i++) {
        const v    = data[i];
        const half = Math.max(3 * dpr, v * midY * 0.9);
        const x    = i * barW;
        const w    = Math.max(1.5 * dpr, barW - 2.5 * dpr);

        // Soft bloom behind each bar
        c.globalAlpha = v * 0.28;
        c.fillStyle   = '#e11d48';
        c.fillRect(x, midY - half * 1.35, w, half * 2.7);

        c.globalAlpha = 0.55 + v * 0.45;

        // Upward bar (centre → top)
        const gUp = c.createLinearGradient(0, midY, 0, midY - half);
        gUp.addColorStop(0,    'rgba(225,29,72,0.95)');
        gUp.addColorStop(0.55, 'rgba(244,114,182,0.88)');
        gUp.addColorStop(1,    'rgba(254,205,211,0.72)');
        c.fillStyle = gUp;
        c.fillRect(x, midY - half, w, half);

        // Downward mirror (centre → bottom)
        const gDn = c.createLinearGradient(0, midY, 0, midY + half);
        gDn.addColorStop(0,    'rgba(225,29,72,0.95)');
        gDn.addColorStop(0.55, 'rgba(244,114,182,0.88)');
        gDn.addColorStop(1,    'rgba(254,205,211,0.72)');
        c.fillStyle = gDn;
        c.fillRect(x, midY, w, half);
      }

      c.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [audioRef]); // stable ref — only re-runs if the audioRef object itself changes

  // Progress bar seek handler
  const handleSeek = useCallback((e) => {
    if (!duration || !seek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const t = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1)) * duration;
    seek(t);
  }, [duration, seek]);

  const pct      = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const coverImg = currentTrack?.cover_image_url;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden" style={{ pointerEvents: 'none' }}>

      {/* Blurred album art tint — very subtle, keeps bars readable */}
      {coverImg && (
        <img
          src={coverImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: 'blur(56px)',
            opacity: 0.14,
            transform: 'scale(1.2)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Vertical gradient veil: darker at top/bottom so track info + list stay legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg,' +
            'rgba(10,10,15,0.80) 0%,' +
            'rgba(10,10,15,0.48) 30%,' +
            'rgba(10,10,15,0.48) 70%,' +
            'rgba(10,10,15,0.82) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Frequency bars canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block', pointerEvents: 'none' }}
        aria-hidden="true"
      />

      {/* Playback progress bar — pinned to bottom, interactive */}
      {currentTrack && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px] cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.08)', pointerEvents: 'auto' }}
          onClick={handleSeek}
          onTouchStart={handleSeek}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full transition-none"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #e11d48, #f43f5e)',
            }}
          />
        </div>
      )}
    </div>
  );
}
