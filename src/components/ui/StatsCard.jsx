import React from 'react';
import { cn } from "@/lib/utils";

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendUp,
  className,
  iconClassName 
}) {
  return (
    <div className={cn(
      "bg-slate-800/50 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
          {trend && (
            <p className={cn(
              "text-sm mt-1 flex items-center gap-1",
              trendUp ? "text-green-400" : "text-red-400"
            )}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/20",
            iconClassName
          )}>
            <Icon className="h-5 w-5 text-violet-400" />
          </div>
        )}
      </div>
    </div>
  );
}