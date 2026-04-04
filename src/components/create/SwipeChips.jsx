import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pure horizontal swipe chip palette.
 * Selected chips appear as removable pills above; unselected scroll horizontally.
 */
export default function SwipeChips({ label, chips, selected, onToggle, accent = 'violet' }) {
  const scrollRef = useRef(null);
  const available = chips.filter(c => !selected.includes(c));

  const colors = {
    violet: {
      tag: 'text-violet-300 border-violet-500/50',
      tagBg: 'rgba(124,58,237,0.2)',
      chip: 'text-violet-200 border-violet-500/30',
      chipBg: 'rgba(124,58,237,0.12)',
      chipHover: 'rgba(124,58,237,0.25)',
    },
    pink: {
      tag: 'text-pink-300 border-pink-500/50',
      tagBg: 'rgba(236,72,153,0.2)',
      chip: 'text-pink-200 border-pink-500/30',
      chipBg: 'rgba(236,72,153,0.12)',
      chipHover: 'rgba(236,72,153,0.25)',
    },
  }[accent] || {};

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 160, behavior: 'smooth' });
  };

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{label}</label>

      {/* Selected removable pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(s => (
            <button
              key={s}
              onClick={() => { haptics.selection(); onToggle(s); }}
              className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95', colors.tag)}
              style={{ background: colors.tagBg }}
            >
              {s}
              <X className="h-3 w-3 opacity-60" />
            </button>
          ))}
        </div>
      )}

      {/* Horizontal scroll row */}
      {available.length > 0 && (
        <div className="relative">
          {/* Scroll arrows — desktop only */}
          <button
            onClick={() => scroll(-1)}
            className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-7 h-7 items-center justify-center rounded-full text-white/40 hover:text-white transition-colors"
            style={{ background: 'rgba(6,4,15,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-7 h-7 items-center justify-center rounded-full text-white/40 hover:text-white transition-colors"
            style={{ background: 'rgba(6,4,15,0.9)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-6 z-[1] pointer-events-none" style={{ background: 'linear-gradient(to right, #06040f, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-6 z-[1] pointer-events-none" style={{ background: 'linear-gradient(to left, #06040f, transparent)' }} />

          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {available.map(c => (
              <button
                key={c}
                onClick={() => { haptics.selection(); onToggle(c); }}
                className={cn('flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 hover:scale-105', colors.chip)}
                style={{ background: colors.chipBg, borderColor: 'rgba(255,255,255,0.08)' }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}