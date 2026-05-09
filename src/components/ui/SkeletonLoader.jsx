// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function TrackCardSkeleton() {
  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Cover Image Skeleton */}
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-24 h-24 rounded-lg bg-slate-700/50"
        />
        
        {/* Content Skeleton */}
        <div className="flex-1 space-y-3">
          <motion.div
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
            className="h-5 w-3/4 bg-slate-700/50 rounded"
          />
          <motion.div
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            className="h-4 w-1/2 bg-slate-700/50 rounded"
          />
          <div className="flex gap-2">
            <motion.div
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              className="h-6 w-16 bg-slate-700/50 rounded-full"
            />
            <motion.div
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              className="h-6 w-20 bg-slate-700/50 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Video Thumbnail Skeleton */}
      <motion.div
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="aspect-video bg-slate-700/50"
      />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
          className="h-5 w-3/4 bg-slate-700/50 rounded"
        />
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="h-4 w-1/2 bg-slate-700/50 rounded"
        />
      </div>
    </div>
  );
}

export function Skeleton({ className, ...props }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className={cn("bg-slate-700/50 rounded", className)}
      {...props}
    />
  );
}