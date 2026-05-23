import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { haptics } from '@/components/utils/haptics';
import { useIsMobile } from '@/hooks/use-mobile';

export default function PullToRefresh({ onRefresh, children }) {
  const isMobile = useIsMobile();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, 80], [0, 1]);
  const iconRotate = useTransform(y, [0, 80], [0, 180]);

  const handleDragEnd = async (event, info) => {
    if (info.offset.y > 80 && !isRefreshing) {
      setIsRefreshing(true);
      haptics.success();
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  // Mobile drag interception can block vertical page scrolling, so disable it on mobile.
  if (isMobile) {
    return <div className="relative">{children}</div>;
  }

  return (
    <div className="relative">
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDragEnd={handleDragEnd}
        style={{ y }}
        className="relative"
      >
        {/* Pull indicator */}
        <motion.div 
          style={{ opacity: pullProgress }}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full flex items-center justify-center py-4"
        >
          <motion.div style={{ rotate: iconRotate }}>
            <RefreshCw className={`h-6 w-6 text-violet-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.div>
        </motion.div>

        {children}
      </motion.div>
    </div>
  );
}
