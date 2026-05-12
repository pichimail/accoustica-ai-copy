import React, { useEffect } from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';

export default function BottomSheet({ 
  open, 
  onClose, 
  title, 
  children, 
  snapPoints = [0.9],
  className = ''
}) {
  useEffect(() => {
    if (open) {
      haptics.light();
    }
  }, [open]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(nextOpen) => {
        // Controlled usage: only propagate explicit close events.
        if (!nextOpen) onClose(false);
      }}
      snapPoints={snapPoints}
      dismissible
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[110]" />
        <Drawer.Content 
          className={cn(
            "fixed bottom-0 left-0 right-0 z-[120] flex flex-col border-t rounded-t-3xl",
            "focus:outline-none",
            className
          )}
          style={{
            maxHeight: '90vh',
            background: 'rgba(14,14,22,0.98)',
            borderColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 -28px 80px rgba(0,0,0,0.55)',
          }}
        >
          {/* Drag Handle */}
          <div className="w-full flex justify-center py-3">
            <div className="w-12 h-1.5 rounded-full bg-slate-700" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <button
                onClick={() => {
                  haptics.light();
                  onClose(false);
                }}
                className="p-2 rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
