import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';
import { X } from 'lucide-react';

/**
 * Horizontally scrollable chips. Selected chips are removed from the list
 * and shown as removable tags above the scroll row.
 */
export default function SwipeChips({ label, chips, selected, onToggle, accent = 'violet' }) {
  const scrollRef = useRef(null);
  const available = chips.filter(c => !selected.includes(c));

  const accentCls = {
    violet: {
      tag: 'bg-violet-500/20 border-violet-500/50 text-violet-300',
      x: 'text-violet-400',
      chip: 'bg-violet-500/25 border-violet-500/40 text-violet-200',
    },
    pink: {
      tag: 'bg-pink-500/20 border-pink-500/50 text-pink-300',
      x: 'text-pink-400',
      chip: 'bg-pink-500/25 border-pink-500/40 text-pink-200',
    },
  }[accent] || {};

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</label>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(s => (
            <button
              key={s}
              onClick={() => { haptics.selection(); onToggle(s); }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                accentCls.tag
              )}
            >
              {s}
              <X className={cn('h-3 w-3', accentCls.x)} />
            </button>
          ))}
        </div>
      )}

      {/* Scrollable unselected chips */}
      {available.length > 0 && (
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {available.map(c => (
            <button
              key={c}
              onClick={() => { haptics.selection(); onToggle(c); }}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105',
                'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/20'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}