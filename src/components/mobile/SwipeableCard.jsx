import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';

export default function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  onTap,
  leftAction,
  rightAction,
  swipeThreshold = 100,
  className = ''
}) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const leftActionOpacity = useTransform(x, [-swipeThreshold, 0], [1, 0]);
  const rightActionOpacity = useTransform(x, [0, swipeThreshold], [0, 1]);
  const leftActionScale = useTransform(x, [-swipeThreshold, 0], [1, 0.8]);
  const rightActionScale = useTransform(x, [0, swipeThreshold], [0.8, 1]);

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const threshold = swipeThreshold;

    if (info.offset.x < -threshold && onSwipeLeft) {
      haptics.medium();
      onSwipeLeft();
    } else if (info.offset.x > threshold && onSwipeRight) {
      haptics.medium();
      onSwipeRight();
    }
  };

  const handleTap = () => {
    if (!isDragging && onTap) {
      haptics.light();
      onTap();
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Left Action Background */}
      {leftAction && (
        <motion.div 
          style={{ opacity: leftActionOpacity, scale: leftActionScale }}
          className="absolute inset-y-0 left-0 flex items-center justify-start pl-6 bg-red-500/20 rounded-xl"
        >
          {leftAction}
        </motion.div>
      )}

      {/* Right Action Background */}
      {rightAction && (
        <motion.div 
          style={{ opacity: rightActionOpacity, scale: rightActionScale }}
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-6 bg-green-500/20 rounded-xl"
        >
          {rightAction}
        </motion.div>
      )}

      {/* Main Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
        style={{ x }}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
}