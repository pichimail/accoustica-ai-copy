import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MicVocal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/exportClient';
import * as musicClient from '@/api/musicClient';

function toSeconds(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

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
    if (text) {
      lines.push({
        time,
        endTime: time + 3,
        text,
        words: [],
      });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

function parsePlainLyrics(lyrics, duration) {
  if (!lyrics || !duration) return [];
  const lines = lyrics.split('\n').filter(l => l.trim() && !l.trim().startsWith('['));
  if (lines.length === 0) return [];
  return lines.map((text, i) => {
    const time = (duration / lines.length) * i;
    const nextTime = (duration / lines.length) * (i + 1);
    return {
      time,
      endTime: nextTime,
      text: text.trim(),
      words: [],
    };
  });
}

function normalizeWordToken(word) {
  const text = String(word?.word ?? word?.text ?? word?.token ?? '').trim();
  if (!text) return null;

  const startMs = toSeconds(word?.startMs) ?? toSeconds(word?.start_ms) ?? toSeconds(word?.timeMs);
  const endMs = toSeconds(word?.endMs) ?? toSeconds(word?.end_ms);

  const start =
    toSeconds(word?.startS) ??
    toSeconds(word?.start_s) ??
    (startMs !== null ? startMs / 1000 : null) ??
    toSeconds(word?.time) ??
    0;

  const end =
    toSeconds(word?.endS) ??
    toSeconds(word?.end_s) ??
    (endMs !== null ? endMs / 1000 : null) ??
    Math.max(start + 0.24, start);

  return {
    text,
    start: Math.max(0, start),
    end: Math.max(Math.max(0, start), end),
  };
}

function joinWords(words) {
  return words.reduce((line, curr, idx) => {
    if (idx === 0) return curr.text;
    if (/^[,.;!?)]/.test(curr.text)) return `${line}${curr.text}`;
    if (/^'/.test(curr.text)) return `${line}${curr.text}`;
    return `${line} ${curr.text}`;
  }, '');
}

function buildKaraokeLinesFromWords(words) {
  if (!words.length) return [];

  const lines = [];
  let current = [];

  const flush = () => {
    if (!current.length) return;
    lines.push({
      time: current[0].start,
      endTime: current[current.length - 1].end,
      text: joinWords(current),
      words: current,
    });
    current = [];
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prev = words[i - 1];
    const gap = prev ? Math.max(0, word.start - prev.end) : 0;
    const prevEndsSentence = prev ? /[.!?]$/.test(prev.text) : false;
    const shouldBreak =
      current.length >= 8 ||
      gap >= 1.15 ||
      (prevEndsSentence && gap >= 0.45);

    if (current.length > 0 && shouldBreak) {
      flush();
    }

    current.push(word);
  }

  flush();
  return lines;
}

function normalizeLine(line) {
  const text = String(line?.text ?? line?.content ?? '').trim();
  if (!text) return null;

  const startMs = toSeconds(line?.startMs) ?? toSeconds(line?.start_ms);
  const endMs = toSeconds(line?.endMs) ?? toSeconds(line?.end_ms);

  const time =
    toSeconds(line?.time) ??
    toSeconds(line?.startS) ??
    toSeconds(line?.start_s) ??
    (startMs !== null ? startMs / 1000 : null) ??
    0;

  const endTime =
    toSeconds(line?.endS) ??
    toSeconds(line?.end_s) ??
    (endMs !== null ? endMs / 1000 : null) ??
    Math.max(time + 3, time);

  const words = Array.isArray(line?.words)
    ? line.words.map(normalizeWordToken).filter(Boolean)
    : [];

  return {
    time,
    endTime: Math.max(endTime, time),
    text,
    words,
  };
}

function parseApiData(data) {
  if (!data) return { lines: [], hasWordTiming: false, source: 'none' };

  if (Array.isArray(data.karaokeLines)) {
    const lines = data.karaokeLines
      .map(normalizeLine)
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);

    const hasWordTiming = lines.some(line => Array.isArray(line.words) && line.words.length > 0);
    if (lines.length) return { lines, hasWordTiming, source: 'api' };
  }

  const alignedWordCandidates = Array.isArray(data.alignedWords)
    ? data.alignedWords
    : Array.isArray(data.words)
      ? data.words
      : [];

  if (alignedWordCandidates.length) {
    const words = alignedWordCandidates
      .map(normalizeWordToken)
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);

    const lines = buildKaraokeLinesFromWords(words);
    if (lines.length) {
      return { lines, hasWordTiming: true, source: 'api' };
    }
  }

  if (Array.isArray(data.lines)) {
    const lines = data.lines
      .map(normalizeLine)
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);
    if (lines.length) return { lines, hasWordTiming: false, source: 'api' };
  }

  return { lines: [], hasWordTiming: false, source: 'none' };
}

function getWordTokenPrefix(previous, current) {
  if (!previous) return '';
  if (/^[,.;!?)]/.test(current)) return '';
  if (/^'/.test(current)) return '';
  return ' ';
}

export default function LyricsView({ track, currentTime, onSeek, karaokeEnabled = false, setKaraokeEnabled }) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('none');
  const [activeIdx, setActiveIdx] = useState(-1);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [hasWordTiming, setHasWordTiming] = useState(false);

  const lyricsContainerRef = useRef(null);
  const hasAutoScrolled = useRef(false);
  const fetchedTrackId = useRef(null);

  const fetchLyrics = useCallback(async () => {
    if (!track?.id) return;
    if (fetchedTrackId.current === track.id) return;
    fetchedTrackId.current = track.id;

    setLoading(true);
    setError(null);
    setLines([]);
    setSource('none');
    setHasWordTiming(false);

    if (track.task_id && track.external_audio_id) {
      try {
        const res = await base44.functions.invoke('getTimestampedLyrics', {
          taskId: track.task_id,
          audioId: track.external_audio_id,
        });
        const payload = res?.data?.data ?? res?.data ?? res;
        const parsed = parseApiData(payload);
        if (parsed.lines.length > 0) {
          setLines(parsed.lines);
          setSource(parsed.source);
          setHasWordTiming(parsed.hasWordTiming);
          setLoading(false);
          return;
        }
      } catch (e) {
        setError('Unable to fetch synced lyrics from provider.');
      }
    }

    if (track.lyrics && track.lyrics.includes('[')) {
      const parsed = parseLrc(track.lyrics);
      if (parsed.length > 0) {
        setLines(parsed);
        setSource('lrc');
        setLoading(false);
        return;
      }
    }

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

  const adjustedTime = currentTime;

  useEffect(() => {
    if (lines.length === 0) return;

    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const next = lines[i + 1];
      const endBoundary = Number.isFinite(line.endTime)
        ? line.endTime
        : (next ? next.time : Number.POSITIVE_INFINITY);

      if (adjustedTime >= line.time && adjustedTime < endBoundary) {
        idx = i;
        break;
      }
    }

    if (idx === -1) {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (adjustedTime >= lines[i].time) {
          idx = i;
          break;
        }
      }
    }

    setActiveIdx(idx);
  }, [adjustedTime, lines]);

  useEffect(() => {
    const activeLine = lines[activeIdx];
    if (!activeLine || !activeLine.words?.length) {
      setActiveWordIdx(-1);
      return;
    }

    let idx = -1;
    for (let i = 0; i < activeLine.words.length; i++) {
      const word = activeLine.words[i];
      const next = activeLine.words[i + 1];
      const endBoundary = Number.isFinite(word.end) ? word.end : (next ? next.start : activeLine.endTime);
      if (adjustedTime >= word.start && adjustedTime < endBoundary) {
        idx = i;
        break;
      }
      if (adjustedTime >= word.end) {
        idx = i;
      }
    }

    setActiveWordIdx(idx);
  }, [activeIdx, adjustedTime, lines]);

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

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-white/30">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading lyrics...</p>
      </div>
    );
  }

  if (source === 'none' || lines.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-white/20">
        <MicVocal className="h-10 w-10" />
        <p className="text-sm font-medium">No lyrics available</p>
        <p className="text-xs text-white/15 text-center px-8">
          {track?.is_instrumental ? 'This is an instrumental track.' : "Lyrics will appear here once they are generated."}
        </p>
        {error && <p className="text-[11px] text-amber-300/80 text-center px-8">{error}</p>}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <span
          className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: source === 'api' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
            color: source === 'api' ? '#22c55e' : 'rgba(255,255,255,0.3)',
          }}
        >
          {source === 'api' ? '🎤 Timestamped' : source === 'track' ? '📝 Track' : ''}
        </span>
        
        {setKaraokeEnabled && hasWordTiming && (
          <button
            onClick={() => setKaraokeEnabled(v => !v)}
            className="relative inline-flex items-center transition-opacity hover:opacity-80"
            title={karaokeEnabled ? 'Karaoke on' : 'Karaoke off'}
          >
            <div
              className="relative w-10 h-5 rounded-full transition-all"
              style={{
                background: karaokeEnabled ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)',
                border: '1px solid ' + (karaokeEnabled ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.15)'),
              }}
            >
              <motion.div
                className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full"
                animate={{ x: karaokeEnabled ? 20 : 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  boxShadow: karaokeEnabled ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                }}
              />
            </div>
            <span className="text-[10px] ml-1.5 text-white/40 whitespace-nowrap">
              {karaokeEnabled ? 'Karaoke' : 'Normal'}
            </span>
          </button>
        )}
      </div>

      <div
        ref={lyricsContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 88%, transparent 100%)' }}
      >
        <div className="py-16 space-y-3 px-4">
          {lines.map((line, i) => {
            const isActive = i === activeIdx;
            const dist = Math.abs(i - activeIdx);

            return (
              <motion.button
                key={`${line.time}-${i}`}
                data-lyric-idx={i}
                onClick={() => onSeek && onSeek(Math.max(0, line.time))}
                className="w-full text-center px-4 py-3 rounded-2xl transition-all cursor-pointer select-none leading-relaxed min-h-[52px]"
                animate={{
                  scale: isActive ? 1.06 : 1,
                  opacity: isActive ? 1 : Math.max(0.2, 1 - dist * 0.25),
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  fontSize: isActive ? '2rem' : dist === 1 ? '1.25rem' : '1rem',
                  fontWeight: isActive ? 800 : dist === 1 ? 600 : 500,
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)',
                  background: isActive ? 'rgba(34,197,94,0.12)' : 'transparent',
                  textShadow: isActive ? '0 0 40px rgba(34,197,94,0.5)' : 'none',
                  letterSpacing: isActive ? '0.3px' : '0px',
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="lyric-indicator"
                    className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2.5 align-middle"
                    style={{ boxShadow: '0 0 12px rgba(34,197,94,0.9)' }}
                  />
                )}

                {isActive && karaokeEnabled && hasWordTiming && line.words?.length ? (
                  <span className="block">
                    {line.words.map((word, wordIndex) => {
                      const prefix = getWordTokenPrefix(line.words[wordIndex - 1], word.text);
                      const isCurrentWord = wordIndex === activeWordIdx;
                      const isPastWord = wordIndex < activeWordIdx;

                      return (
                        <span
                          key={`${word.start}-${wordIndex}`}
                          style={{
                            color: isCurrentWord ? '#22c55e' : isPastWord ? 'rgba(34,197,94,0.7)' : 'inherit',
                            textShadow: isCurrentWord ? '0 0 20px rgba(34,197,94,0.9)' : 'none',
                            transition: 'all 100ms linear',
                            fontWeight: isCurrentWord ? 900 : isActive ? 800 : 600,
                            letterSpacing: isCurrentWord ? '0.5px' : 'inherit',
                          }}
                        >
                          {prefix}{word.text}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  line.text
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}