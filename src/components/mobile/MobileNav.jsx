import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Sparkles, Plus, Library, Globe, Music, User, Disc, MoreHorizontal, X, MessageCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { haptics } from '@/components/utils/haptics';
import { motion, AnimatePresence } from 'framer-motion';

const MORE_ITEMS = [
  { name: 'Studio',  icon: Music, page: 'CollaborativeStudio' },
  { name: 'Stems',   icon: Disc,  page: 'StemStudio' },
  { name: 'Profile', icon: User,  page: 'Profile' },
];

export default function MobileNav({ currentPageName, user }) {
  const [showMore, setShowMore] = useState(false);

  const primaryLinks = user
    ? [
        { name: 'For You',  icon: Sparkles,       page: 'ForYou' },
        { name: 'Feed',     icon: MessageCircle,  page: 'SocialFeed' },
        { name: 'Create',   icon: Plus,           page: 'Create',  isCreate: true },
        { name: 'Library',  icon: Library,        page: 'Library' },
        { name: 'More',     icon: MoreHorizontal, page: null,      isMore: true },
      ]
    : [
        { name: 'Home',     icon: Home,           page: 'Home' },
        { name: 'Discover', icon: Globe,          page: 'Discover' },
        { name: 'Create',   icon: Plus,           page: 'Create',  isCreate: true },
        { name: 'Feed',     icon: MessageCircle,  page: 'SocialFeed' },
        { name: 'More',     icon: MoreHorizontal, page: null,      isMore: true },
      ];

  const isMoreActive = MORE_ITEMS.some(i => i.page === currentPageName);

  return (
    <>
      {/* Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        {/* Glass bar */}
        <div
          className="mx-3 mb-3 rounded-2xl px-2 py-1"
          style={{
            background: 'rgba(18,18,28,0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 -4px 30px rgba(0,0,0,0.4)',
          }}
        >
          <div className="grid grid-cols-5">
            {primaryLinks.map((link) => {
              if (link.isCreate) {
                return (
                  <Link key="create" to={createPageUrl('Create')} className="flex justify-center items-center py-2">
                    <button
                      onClick={() => haptics.medium()}
                      className="w-12 h-12 rounded-full flex items-center justify-center text-black font-bold shadow-xl active:scale-90 transition-transform"
                      style={{ background: '#22c55e', boxShadow: '0 0 20px rgba(34,197,94,0.5)' }}
                    >
                      <Plus className="h-6 w-6" strokeWidth={2.5} />
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
                      'flex flex-col items-center justify-center gap-1 py-3 transition-all',
                      isMoreActive ? 'text-white' : 'text-white/35'
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
                    className="w-full flex flex-col items-center justify-center gap-1 py-3 transition-all"
                  >
                    {/* Active pill indicator */}
                    {isActive ? (
                      <div
                        className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
                        style={{ background: 'rgba(34,197,94,0.15)' }}
                      >
                        <link.icon className="h-4 w-4 text-green-400" />
                        <span className="text-[10px] font-semibold text-green-400">{link.name}</span>
                      </div>
                    ) : (
                      <>
                        <link.icon className="h-5 w-5 text-white/40" />
                        <span className="text-[10px] font-medium text-white/35">{link.name}</span>
                      </>
                    )}
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
              className="lg:hidden fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[91] rounded-t-3xl border-t border-white/10 pb-8"
              style={{ background: 'rgba(14,14,22,0.98)', backdropFilter: 'blur(30px)' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="px-5 pt-2 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-lg">More</h3>
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
                            ? 'border-green-500/40 text-green-400'
                            : 'bg-white/5 border-white/10 text-white/60 active:bg-white/10'
                        )}
                        style={isActive ? { background: 'rgba(34,197,94,0.1)' } : {}}
                        >
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