import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';

/**
 * BottomSheet — custom implementation (no vaul) to avoid snap-point re-open issues.
 * Always opens fully. Supports swipe-down to dismiss.
 */
export default function BottomSheet({ open, onClose, title, children, className = '' }) {
  const startY = useRef(null);
  const sheetRef = useRef(null);

  const handleTouchStart = (e) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (startY.current === null) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (dy > 80) { haptics.light(); onClose(); }
    startY.current = null;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bs-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            onClick={() => { haptics.light(); onClose(); }}
          />

          {/* Sheet */}
          <motion.div
            key="bs-sheet"
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.9 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[120] flex flex-col rounded-t-3xl border-t focus:outline-none',
              className
            )}
            style={{
              maxHeight: '90vh',
              background: 'rgba(12,12,20,0.99)',
              borderColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              boxShadow: '0 -24px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Drag handle */}
            <div className="w-full flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Optional header */}
            {title && (
              <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-white/8 flex-shrink-0">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <button
                  onClick={() => { haptics.light(); onClose(); }}
                  className="no-select min-w-[44px] min-h-[44px] rounded-full hover:bg-white/10 transition-colors inline-flex items-center justify-center"
                >
                  <X className="h-5 w-5 text-white/50" />
                </button>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 safe-bottom">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
