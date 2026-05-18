import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Sparkles, Plus, Library, User, Disc, MoreHorizontal, X, MessageCircle, BarChart3, GitBranch } from 'lucide-react';
import { cn } from "@/lib/utils";
import { haptics } from '@/components/utils/haptics';
import { motion, AnimatePresence } from 'framer-motion';

const MORE_ITEMS = [
  { name: 'Insights', icon: BarChart3, page: 'Insights' },
  { name: 'Voice', icon: Sparkles, page: 'VoiceStudio' },
  { name: 'Stems', icon: Disc, page: 'StemStudio' },
  { name: 'Remix', icon: GitBranch, page: 'RemixStudio' },
  { name: 'Feed', icon: MessageCircle, page: 'SocialFeed' },
  { name: 'Profile', icon: User, page: 'Profile' },
];

const AUTH_LINKS = [
  { name: 'Home',    icon: Home,        page: 'Home' },
  { name: 'ForYou',  icon: Sparkles,    page: 'ForYou', label: 'For You' },
  { name: 'create',  icon: Plus,        page: 'Create', isCreate: true },
  { name: 'Library', icon: Library,     page: 'Library' },
  { name: 'more',    icon: MoreHorizontal, page: null,  isMore: true, label: 'More' },
];

const GUEST_LINKS = [
  { name: 'Home',    icon: Home,        page: 'Home' },
  { name: 'Feed',    icon: MessageCircle, page: 'SocialFeed' },
  { name: 'create',  icon: Plus,        page: 'Create', isCreate: true },
  { name: 'Library', icon: Library,     page: 'Library' },
  { name: 'more',    icon: MoreHorizontal, page: null,  isMore: true, label: 'More' },
];

export default function MobileNav({ currentPageName, user }) {
  const [showMore, setShowMore] = useState(false);
  const links = user ? AUTH_LINKS : GUEST_LINKS;
  const isMoreActive = MORE_ITEMS.some((i) => i.page === currentPageName);

  return (
    <>
      {/* ── NAV BAR — Fixed at bottom above music player ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{ 
          bottom: `env(safe-area-inset-bottom, 0px)`,
          height: 'clamp(60px, 8vh, 80px)',
        }}
        aria-label="Mobile navigation"
      >
        {/* Frosted glass bar */}
        <div
          style={{
            background: 'rgba(8,8,14,0.85)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center justify-around px-2 pt-2 pb-2 safe-bottom" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
            {links.map((link) => {
              /* ── CREATE ── */
              if (link.isCreate) {
                return (
                  <Link
                    key="create"
                    to={`${createPageUrl('Create')}?panel=generate`}
                    onClick={() => haptics.medium()}
                    className="no-select flex flex-col items-center justify-center gap-1 px-3 py-1 min-w-[52px] min-h-[44px] group"
                    aria-label="Create"
                  >
                    <div
                      className="relative w-8 h-6 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                      style={{
                        background: 'linear-gradient(135deg,#22c55e,#16a34a)',
                      }}
                    >
                      <Plus className="h-5 w-5 text-black" strokeWidth={2.8} />
                    </div>
                    <span className="text-[10px] font-semibold text-green-300">Create</span>
                  </Link>
                );
              }

              /* ── MORE ── */
              if (link.isMore) {
                return (
                  <button
                    key="more"
                    onClick={() => { haptics.light(); setShowMore(true); }}
                    className="no-select flex flex-col items-center justify-center gap-1 px-3 py-1 min-w-[52px] min-h-[44px]"
                    aria-label="More options"
                  >
                    <div className={cn(
                      'w-6 h-6 flex items-center justify-center',
                      isMoreActive ? 'text-green-400' : 'text-white/45'
                    )}>
                      <MoreHorizontal className="h-5 w-5" />
                    </div>
                    <span className={cn('text-[10px] font-medium', isMoreActive ? 'text-green-400' : 'text-white/40')}>
                      {link.label || link.name}
                    </span>
                  </button>
                );
              }

              /* ── REGULAR LINK ── */
              const isActive = currentPageName === link.page;
              return (
                <Link
                  key={link.page}
                  to={createPageUrl(link.page)}
                  onClick={() => haptics.light()}
                  aria-label={link.label || link.name}
                  aria-current={isActive ? 'page' : undefined}
                  className="no-select flex flex-col items-center justify-center gap-1 px-3 py-1 min-w-[52px] min-h-[44px] group"
                >
                  <div className={cn(
                    'relative w-6 h-6 flex items-center justify-center transition-transform group-active:scale-90',
                    isActive ? 'text-green-400' : 'text-white/45'
                  )}>
                    <link.icon className="h-5 w-5" />
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-400"
                      />
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium transition-colors',
                    isActive ? 'text-green-400' : 'text-white/40'
                  )}>
                    {link.label || link.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── MORE DRAWER ── */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              key="more-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="lg:hidden fixed inset-0 z-[94] bg-black/65 backdrop-blur-sm"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              key="more-sheet"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 z-[95] rounded-t-[28px]"
              style={{
                background: 'rgba(10,10,18,0.97)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderBottom: 'none',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3">
                <span className="text-white font-bold text-base">More</span>
                <button
                  onClick={() => setShowMore(false)}
                  className="no-select min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-3 gap-3 px-4 pb-10">
                {MORE_ITEMS.map((item) => {
                  const isActive = currentPageName === item.page;
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => { setShowMore(false); haptics.light(); }}
                      className="no-select"
                    >
                      <div
                        className={cn(
                          'flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl transition-all active:scale-95',
                          isActive ? 'border border-green-500/40' : 'border border-white/6'
                        )}
                        style={{
                          background: isActive ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                        }}
                      >
                        <item.icon className={cn('h-6 w-6', isActive ? 'text-green-400' : 'text-white/60')} />
                        <span className={cn('text-xs font-medium', isActive ? 'text-green-300' : 'text-white/60')}>
                          {item.name}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
