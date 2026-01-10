import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/components/utils/haptics';
import { toast } from 'sonner';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show prompt only if:
    // - Not in standalone mode
    // - Not dismissed recently (within 7 days)
    // - On mobile device
    if (!standalone && daysSinceDismissed > 7 && window.innerWidth <= 768) {
      // For Android/Chrome
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowPrompt(true);
      });

      // For iOS - show after 5 seconds
      if (ios) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    }
  }, []);

  const handleInstall = async () => {
    haptics.medium();
    
    if (deferredPrompt) {
      // Android/Chrome installation
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIOS) {
      // iOS - show instructions
      toast.info('Tap Share button, then "Add to Home Screen"', {
        duration: 5000,
      });
    }
  };

  const handleDismiss = () => {
    haptics.light();
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-[60] lg:hidden"
      >
        <div className="bg-gradient-to-r from-violet-600 to-pink-600 rounded-2xl p-4 shadow-2xl border border-white/20">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-white/80 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-6 w-6 text-white" />
            </div>

            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">
                Install Accoustica App
              </h3>
              <p className="text-white/90 text-sm mb-3">
                {isIOS 
                  ? 'Add to your home screen for the best experience!'
                  : 'Install the app for faster access and offline support'}
              </p>

              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-white text-violet-600 hover:bg-white/90 font-medium"
              >
                <Download className="h-4 w-4 mr-2" />
                {isIOS ? 'Install Instructions' : 'Install Now'}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}