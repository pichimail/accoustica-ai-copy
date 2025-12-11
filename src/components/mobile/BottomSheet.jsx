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
    <Drawer.Root open={open} onOpenChange={onClose} snapPoints={snapPoints}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Drawer.Content 
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-slate-900 border-t border-slate-700 rounded-t-3xl",
            "focus:outline-none",
            className
          )}
          style={{ maxHeight: '90vh' }}
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