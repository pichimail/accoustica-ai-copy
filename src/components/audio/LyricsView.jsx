import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MicVocal, Loader2, Clock, Plus, Minus, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

// Parse "[mm:ss.xx] text" LRC format
function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = [];
  const regex = /\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)/g;
  let match;
  while ((match = regex.exec(lrcText)) !== null) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseFloat(match[2]);
    const time = minutes * 60 + seconds;
    const text = match[3].trim();
    if (text) lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

// Parse plain text lyrics with even distribution
function parsePlainLyrics(lyrics, duration) {
  if (!lyrics || !duration) return [];
  const lines = lyrics.split('\n').filter(l => l.trim() && !l.trim().startsWith('['));
  if (lines.length === 0) return [];
  return lines.map((text, i) => ({
    time: (duration / lines.length) * i,
    text: text.trim(),
  }));
}

// Merge API timestamped data (array of {text, startMs} or {word, start_ms})
function parseApiData(data) {
  if (!data) return [];
  // Check for line-level timestamps
  if (Array.isArray(data.lines)) {
    return data.lines
      .filter(l => l.text || l.content)
      .map(l => ({ time: (l.startMs || l.start_ms || 0) / 1000, text: (l.text || l.content || '').trim() }))
      .filter(l => l.text);
  }
  // Word-level: group into lines by newline markers or chunks
  if (Array.isArray(data.words)) {
    const lines = [];
    let current = { time: 0, words: [] };
    for (const w of data.words) {
      if (w.word === '\n' || w.text === '\n') {
        if (current.words.length) {
          lines.push({ time: current.time, text: current.words.join(' ') });
          current = { time: 0, words: [] };
        }
      } else {
        const t = (w.startMs || w.start_ms || w.time || 0) / 1000;
        if (!current.words.length) current.time = t;
        current.words.push(w.word || w.text || '');
      }
    }
    if (current.words.length) lines.push({ time: current.time, text: current.words.join(' ') });
    return lines.filter(l => l.text.trim());
  }
  return [];
}

export default function LyricsView({ track, currentTime, onSeek }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('none'); // 'api' | 'lrc' | 'plain' | 'none'
  const [offset, setOffset] = useState(0); // seconds, user-adjustable
  const [showOffsetPanel, setShowOffsetPanel] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const lyricsContainerRef = useRef(null);
  const hasAutoScrolled = useRef(false);
  const fetchedTrackId = useRef(null);

  // ── FETCH LYRICS ──────────────────────────────────────────────────
  const fetchLyrics = useCallback(async () => {
    if (!track?.id) return;
    if (fetchedTrackId.current === track.id) return;
    fetchedTrackId.current = track.id;

    setLoading(true);
    setError(null);
    setLines([]);
    setSource('none');
    setOffset(0);

    // 1. Try API timestamped lyrics first
    if (track.task_id && track.external_audio_id) {
      try {
        const res = await base44.functions.invoke('getTimestampedLyrics', {
          taskId: track.task_id,
          audioId: track.external_audio_id,
        });
        const parsed = parseApiData(res?.data?.data || res?.data);
        if (parsed.length > 0) {
          setLines(parsed);
          setSource('api');
          setLoading(false);
          return;
        }
      } catch (e) {
        // fall through
      }
    }

    // 2. Try LRC-formatted lyrics stored on the track
    if (track.lyrics && track.lyrics.includes('[')) {
      const parsed = parseLrc(track.lyrics);
      if (parsed.length > 0) {
        setLines(parsed);
        setSource('lrc');
        setLoading(false);
        return;
      }
    }

    // 3. Fall back to plain lyrics with even distribution
    if (track.lyrics) {
      const duration = track.duration || 180;
      const parsed = parsePlainLyrics(track.lyrics, duration);
      if (parsed.length > 0) {
        setLines(parsed);
        setSource('plain');
        setLoading(false);
        return;
      }
    }

    setSource('none');
    setLoading(false);
  }, [track?.id, track?.task_id, track?.external_audio_id, track?.lyrics, track?.duration]);

  useEffect(() => {
    fetchedTrackId.current = null;
    fetchLyrics();
  }, [fetchLyrics]);

  // ── ACTIVE LINE SYNC ──────────────────────────────────────────────
  const adjustedTime = currentTime + offset;

  useEffect(() => {
    if (lines.length === 0) return;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (adjustedTime >= lines[i].time) {
        const next = lines[i + 1];
        if (!next || adjustedTime < next.time) { idx = i; break; }
      }
    }
    // Fallback: last line whose time <= adjustedTime
    if (idx === -1) {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (adjustedTime >= lines[i].time) { idx = i; break; }
      }
    }
    setActiveIdx(idx);
  }, [adjustedTime, lines]);

  // ── AUTO SCROLL ───────────────────────────────────────────────────
  useEffect(() => {
    if (activeIdx < 0 || !lyricsContainerRef.current) return;
    const container = lyricsContainerRef.current;
    const el = container.querySelector(`[data-lyric-idx="${activeIdx}"]`);
    if (!el) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const elCenterRelative = elRect.top - containerRect.top + elRect.height / 2;
    const targetScrollTop = container.scrollTop + elCenterRelative - containerRect.height / 2;
    container.scrollTo({ top: targetScrollTop, behavior: hasAutoScrolled.current ? 'smooth' : 'auto' });
    hasAutoScrolled.current = true;
  }, [activeIdx]);

  // ── OFFSET HELPERS ────────────────────────────────────────────────
  const nudgeOffset = (delta) => setOffset(v => Math.round((v + delta) * 10) / 10);
  const resetOffset = () => setOffset(0);

  // ── RENDER ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-white/30">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading lyrics…</p>
      </div>
    );
  }

  if (source === 'none' || lines.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-white/20">
        <MicVocal className="h-10 w-10" />
        <p className="text-sm font-medium">No lyrics available</p>
        <p className="text-xs text-white/15 text-center px-8">
          {track?.is_instrumental ? 'This is an instrumental track.' : "Lyrics will appear here once they're generated."}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Source badge + offset toggle */}
      <div className="flex items-center justify-between px-1 mb-2 flex-shrink-0">
        <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full"
          style={{ background: source === 'api' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', color: source === 'api' ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>
          {source === 'api' ? '✦ Synced' : source === 'lrc' ? '♩ Timed' : '~ Estimated'}
        </span>
        <button
          onClick={() => setShowOffsetPanel(v => !v)}
          className={cn(
            'flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all',
            showOffsetPanel
              ? 'border-white/20 text-white/70 bg-white/10'
              : 'border-white/10 text-white/30 hover:text-white/60'
          )}
        >
          <Clock className="h-3 w-3" />
          {offset !== 0 && <span className="font-semibold">{offset > 0 ? `+${offset}s` : `${offset}s`}</span>}
          {offset === 0 && <span>Timing</span>}
          {showOffsetPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Offset adjustment panel */}
      <AnimatePresence>
        {showOffsetPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="flex items-center gap-2 px-1 pb-3">
              <span className="text-xs text-white/40 flex-1">Adjust sync offset</span>
              <div className="flex items-center gap-1">
                <button onClick={() => nudgeOffset(-1)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-all" title="-1s">
                  <Minus className="h-3 w-3" />
                </button>
                <button onClick={() => nudgeOffset(-0.5)} className="text-xs px-2 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-all">-0.5</button>
                <div className="px-2 h-7 flex items-center rounded-lg text-sm font-mono font-bold tabular-nums min-w-[52px] text-center justify-center"
                  style={{ color: offset === 0 ? 'rgba(255,255,255,0.3)' : '#22c55e', background: 'rgba(255,255,255,0.05)' }}>
                  {offset > 0 ? `+${offset}s` : `${offset}s`}
                </div>
                <button onClick={() => nudgeOffset(0.5)} className="text-xs px-2 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-all">+0.5</button>
                <button onClick={() => nudgeOffset(1)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-all" title="+1s">
                  <Plus className="h-3 w-3" />
                </button>
                {offset !== 0 && (
                  <button onClick={resetOffset} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/40 hover:text-white/70 transition-all" title="Reset">
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable lyrics */}
      <div
        ref={lyricsContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%)' }}
      >
        <div className="py-16 space-y-2 px-2">
          {lines.map((line, i) => {
            const isActive = i === activeIdx;
            const dist = Math.abs(i - activeIdx);
            return (
              <motion.button
                key={i}
                data-lyric-idx={i}
                onClick={() => onSeek && onSeek(line.time - offset)}
                className="w-full text-center px-3 py-1.5 rounded-xl transition-all cursor-pointer select-none leading-snug"
                animate={{
                  scale: isActive ? 1.04 : 1,
                  opacity: isActive ? 1 : Math.max(0.15, 1 - dist * 0.22),
                }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                  fontSize: isActive ? '1.25rem' : dist === 1 ? '1rem' : '0.875rem',
                  fontWeight: isActive ? 700 : dist === 1 ? 500 : 400,
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)',
                  background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
                  textShadow: isActive ? '0 0 30px rgba(34,197,94,0.6)' : 'none',
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="lyric-indicator"
                    className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-2 align-middle"
                    style={{ boxShadow: '0 0 8px rgba(34,197,94,0.8)' }}
                  />
                )}
                {line.text}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}