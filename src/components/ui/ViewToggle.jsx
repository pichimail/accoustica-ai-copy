import React from 'react';
import { Button } from "@/components/ui/button";
import { LayoutGrid, LayoutList } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ViewToggle({ view, onViewChange }) {
  return (
    <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onViewChange('list')}
        className={cn(
          "h-8 w-8 p-0",
          view === 'list' 
            ? "bg-violet-500/20 text-violet-300" 
            : "text-slate-400 hover:text-white"
        )}
      >
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onViewChange('grid')}
        className={cn(
          "h-8 w-8 p-0",
          view === 'grid' 
            ? "bg-violet-500/20 text-violet-300" 
            : "text-slate-400 hover:text-white"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
}