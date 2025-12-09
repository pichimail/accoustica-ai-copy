import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Music, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

const stages = [
  { key: 'queued', label: 'In Queue', icon: Loader2 },
  { key: 'analyzing', label: 'Analyzing Prompt', icon: Sparkles },
  { key: 'composing', label: 'Composing Music', icon: Music },
  { key: 'finalizing', label: 'Finalizing', icon: CheckCircle2 },
];

export default function GeneratingStatus({ status, className }) {
  const getStageIndex = () => {
    if (status === 'queued') return 0;
    if (status === 'generating') return 2;
    if (status === 'ready') return 4;
    return 0;
  };

  const currentStage = getStageIndex();

  return (
    <div className={cn("bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50", className)}>
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/30"
            />
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-white text-center mb-2">
        Creating Your Music
      </h3>
      <p className="text-slate-400 text-sm text-center mb-6">
        This usually takes 30-60 seconds
      </p>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = index === Math.min(currentStage, stages.length - 1);
          const isComplete = index < currentStage;
          
          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                isActive && "bg-violet-500/20 border border-violet-500/30",
                isComplete && "bg-green-500/10",
                !isActive && !isComplete && "opacity-50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                isActive && "bg-violet-500",
                isComplete && "bg-green-500",
                !isActive && !isComplete && "bg-slate-700"
              )}>
                {isActive ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-4 w-4 text-white" />
                  </motion.div>
                ) : isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                ) : (
                  <Icon className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <span className={cn(
                "text-sm font-medium",
                isActive && "text-violet-300",
                isComplete && "text-green-400",
                !isActive && !isComplete && "text-slate-500"
              )}>
                {stage.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scaleY: [1, 1.5, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="w-1 h-4 bg-gradient-to-t from-violet-500 to-pink-500 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}