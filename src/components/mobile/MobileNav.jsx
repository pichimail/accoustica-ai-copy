import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Sparkles, Plus, Library, Globe, Music, User, Disc, MoreHorizontal, X, Users, MessageCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { haptics } from '@/components/utils/haptics';
import { motion, AnimatePresence } from 'framer-motion';

const MORE_ITEMS = [
  { name: 'Studio',    icon: Music,          page: 'CollaborativeStudio' },
  { name: 'Stems',     icon: Disc,           page: 'StemStudio' },
  { name: 'Profile',   icon: User,           page: 'Profile' },
];

export default function MobileNav({ currentPageName, user }) {
  const [showMore, setShowMore] = useState(false);

  const primaryLinks = user
    ? [
        { name: 'For You', icon: Sparkles,       page: 'ForYou' },
        { name: 'Feed',    icon: MessageCircle,  page: 'SocialFeed' },
        { name: 'Create',  icon: Plus,           page: 'Create', isCreate: true },
        { name: 'Library', icon: Library,        page: 'Library' },
        { name: 'More',    icon: MoreHorizontal, page: null, isMore: true },
      ]
    : [
        { name: 'Home',     icon: Home,           page: 'Home' },
        { name: 'Discover', icon: Globe,          page: 'Discover' },
        { name: 'Create',   icon: Plus,           page: 'Create', isCreate: true },
        { name: 'Feed',     icon: MessageCircle,  page: 'SocialFeed' },
        { name: 'More',     icon: MoreHorizontal, page: null, isMore: true },
      ];

  const isMoreActive = MORE_ITEMS.some(i => i.page === currentPageName);

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 safe-bottom">
        <div className="bg-black/60 backdrop-blur-2xl border-t border-white/8">
          <div className="grid grid-cols-5 px-1">
            {primaryLinks.map((link) => {
              if (link.isCreate) {
                return (
                  <Link key="create" to={createPageUrl('Create')} className="flex justify-center py-2">
                    <button
                      onClick={() => haptics.medium()}
                      className="relative w-14 h-14 -mt-5 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-white flex items-center justify-center shadow-2xl shadow-violet-500/50 active:scale-95 transition-transform"
                    >
                      <Plus className="h-7 w-7" strokeWidth={2.5} />
                      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 blur-sm -z-10" />
                    </button>
                  </Link>
                );
              }

              if (link.isMore) {
                return (
                  <button
                    key="more"
                    onClick={() => { haptics.light(); setShowMore(true); }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 py-3 transition-all",
                      isMoreActive ? 'text-violet-400' : 'text-white/35'
                    )}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                    <span className="text-[10px] font-medium">More</span>
                  </button>
                );
              }

              const isActive = currentPageName === link.page;
              return (
                <Link key={link.page} to={createPageUrl(link.page)}>
                  <button
                    onClick={() => haptics.light()}
                    className={cn(
                      "w-full flex flex-col items-center justify-center gap-0.5 py-3 transition-all",
                      isActive ? 'text-violet-400' : 'text-white/35 active:text-white/70'
                    )}
                  >
                    <div className={cn('p-1 rounded-xl transition-all', isActive && 'bg-violet-500/15')}>
                      <link.icon className="h-5 w-5" />
                    </div>
                    <span className={cn('text-[10px] font-medium', isActive && 'text-violet-400')}>{link.name}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* More Sheet */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[91] bg-slate-900/95 backdrop-blur-2xl rounded-t-3xl border-t border-white/10 safe-bottom"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="px-5 pt-2 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-lg">More</h3>
                  <button onClick={() => setShowMore(false)} className="text-white/40 hover:text-white p-2">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {MORE_ITEMS.map((item) => {
                    const isActive = currentPageName === item.page;
                    return (
                      <Link key={item.page} to={createPageUrl(item.page)} onClick={() => { setShowMore(false); haptics.light(); }}>
                        <div className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all',
                          isActive
                            ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                            : 'bg-white/5 border-white/10 text-white/60 active:bg-white/10'
                        )}>
                          <item.icon className="h-6 w-6" />
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