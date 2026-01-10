import React from 'react';
import { useMediaQuery } from '@/lib/use-media-query';
import EnhancedMasteringDialog from './EnhancedMasteringDialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sparkles } from 'lucide-react';

export default function MasteringBottomSheet({ track, open, onClose, onSuccess }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  if (isDesktop) {
    // Desktop: Use regular dialog/popup
    return (
      <EnhancedMasteringDialog 
        track={track} 
        open={open} 
        onClose={onClose} 
        onSuccess={onSuccess} 
      />
    );
  }

  // Mobile: Use bottom sheet (drawer)
  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh] bg-slate-900 border-slate-700">
        <DrawerHeader>
          <DrawerTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            AI Mastering: {track?.title}
          </DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-safe">
          <EnhancedMasteringDialog 
            track={track} 
            open={true} 
            onClose={onClose} 
            onSuccess={onSuccess}
            isBottomSheet={true}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}