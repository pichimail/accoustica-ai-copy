import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Sparkles, Plus, Library, Globe, User, Disc, MoreHorizontal, X, MessageCircle, BarChart3 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { haptics } from '@/components/utils/haptics';
import { motion, AnimatePresence } from 'framer-motion';

const MORE_ITEMS = [
  { name: 'Insights', icon: BarChart3, page: 'Insights' },
  { name: 'Stems', icon: Disc, page: 'StemStudio' },
  { name: 'Profile', icon: User, page: 'Profile' },
];

export default function MobileNav({ currentPageName, user, autoHide = false }) {
  const [showMore, setShowMore] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const idleTimer = useRef(null);

  const primaryLinks = user
    ? [
        { name: 'For You', icon: Sparkles, page: 'ForYou' },
        { name: 'Feed', icon: MessageCircle, page: 'SocialFeed' },
        { name: 'Create', icon: Plus, page: 'Create', isCreate: true },
        { name: 'Library', icon: Library, page: 'Library' },
        { name: 'More', icon: MoreHorizontal, page: null, isMore: true },
      ]
    : [
        { name: 'Home', icon: Home, page: 'Home' },
        { name: 'Discover', icon: Globe, page: 'Discover' },
        { name: 'Create', icon: Plus, page: 'Create', isCreate: true },
        { name: 'Feed', icon: MessageCircle, page: 'SocialFeed' },
        { name: 'More', icon: MoreHorizontal, page: null, isMore: true },
      ];

  const isMoreActive = MORE_ITEMS.some((i) => i.page === currentPageName);

  useEffect(() => {
    if (!autoHide) {
      setHidden(false);
      return undefined;
    }

    const showTemporarily = () => {
      setHidden(false);
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setHidden(true), 1800);
    };

    const onScroll = () => {
      const nextY = window.scrollY || 0;
      setHidden(nextY > lastScrollY.current && nextY > 24);
      lastScrollY.current = nextY;
    };

    const onFocusIn = (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') setHidden(true);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', showTemporarily, { passive: true });
    window.addEventListener('mousemove', showTemporarily);
    window.addEventListener('focusin', onFocusIn);
    showTemporarily();

    return () => {
      window.clearTimeout(idleTimer.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', showTemporarily);
      window.removeEventListener('mousemove', showTemporarily);
      window.removeEventListener('focusin', onFocusIn);
    };
  }, [autoHide]);

  const baseItemClasses =
    'w-full min-h-11 flex flex-col items-center justify-center gap-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/70';

  return (
    <>
      <nav
        className={cn('lg:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300', hidden && 'translate-y-full')}
        aria-label="Mobile navigation"
        aria-hidden={hidden}
      >
        <div
          className="px-3 py-2 safe-bottom"
          style={{
            background: 'rgba(6,8,12,0.72)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.35)',
          }}
        >
          <div className="grid grid-cols-5">
            {primaryLinks.map((link) => {
              if (link.isCreate) {
                return (
                  <Link
                    key="create"
                    to={`${createPageUrl('Create')}?panel=generate`}
                    onClick={() => haptics.medium()}
                    aria-label="Go to Create"
                    className="flex justify-center items-center min-h-11"
                  >
                    <span className="w-12 h-12 rounded-full flex items-center justify-center text-black font-bold active:scale-95 transition-transform" style={{ background: '#22c55e' }}>
                      <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                  </Link>
                );
              }

              if (link.isMore) {
                return (
                  <button
                    key="more"
                    onClick={() => {
                      haptics.light();
                      setShowMore(true);
                    }}
                    aria-label="Open more navigation options"
                    className={cn(baseItemClasses, isMoreActive ? 'text-white' : 'text-white/75')}
                  >
                    <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                    <span className="text-[10px] font-semibold">More</span>
                  </button>
                );
              }

              const isActive = currentPageName === link.page;
              return (
                <Link
                  key={link.page}
                  to={createPageUrl(link.page)}
                  onClick={() => haptics.light()}
                  aria-label={`Go to ${link.name}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(baseItemClasses, isActive ? 'text-white' : 'text-white/75')}
                >
                  {isActive ? (
                    <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: 'rgba(34,197,94,0.2)' }}>
                      <link.icon className="h-4 w-4 text-green-300" aria-hidden="true" />
                      <span className="text-[10px] font-semibold text-green-200">{link.name}</span>
                    </div>
                  ) : (
                    <>
                      <link.icon className="h-5 w-5 text-white/80" aria-hidden="true" />
                      <span className="text-[10px] font-medium text-white/85">{link.name}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[91] rounded-t-3xl border-t pb-8"
              style={{ background: 'rgba(8,10,14,0.96)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderColor: 'rgba(255,255,255,0.08)' }}
              role="dialog"
              aria-label="More navigation options"
              aria-modal="true"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-5 pt-2 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-lg">More</h3>
                  <button
                    onClick={() => setShowMore(false)}
                    aria-label="Close more options"
                    className="text-white/70 hover:text-white p-2 min-h-11 min-w-11 flex items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/70"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {MORE_ITEMS.map((item) => {
                    const isActive = currentPageName === item.page;
                    return (
                      <Link key={item.page} to={createPageUrl(item.page)} onClick={() => { setShowMore(false); haptics.light(); }} aria-label={`Go to ${item.name}`}>
                        <div
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all min-h-20 justify-center',
                            isActive
                              ? 'border-green-500/40 text-green-400'
                              : 'bg-white/5 border-white/10 text-white/80 active:bg-white/10'
                          )}
                          style={isActive ? { background: 'rgba(34,197,94,0.1)' } : {}}
                        >
                          <item.icon className="h-6 w-6" aria-hidden="true" />
                          <span className="text-xs font-medium text-center">{item.name}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}