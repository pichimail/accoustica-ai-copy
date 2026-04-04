import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Home, Sparkles, Plus, Library, Globe, User, LogOut,
  Crown, Rss, ChevronDown, Music
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { AudioPlayerProvider } from '@/components/audio/AudioPlayerContext';
import GlobalAudioPlayer from '@/components/audio/GlobalAudioPlayer';
import DynamicGradient from '@/components/background/DynamicGradient';
import { haptics } from '@/components/utils/haptics';

// Pages that have NO chrome at all
const BARE_PAGES = ['Home', 'PublicTrack'];

// Nav links
const NAV_LINKS = [
  { name: 'Discover', icon: Globe, page: 'Discover' },
  { name: 'Feed',     icon: Rss,   page: 'SocialFeed' },
  { name: 'Create',   icon: Plus,  page: 'Create', highlight: true },
  { name: 'Library',  icon: Library, page: 'Library', requireAuth: true },
  { name: 'For You',  icon: Sparkles, page: 'ForYou', requireAuth: true },
];

// Mobile bottom nav links (5 max)
const MOBILE_NAV = [
  { name: 'Home',    icon: Home,    page: 'Home' },
  { name: 'Feed',    icon: Rss,     page: 'SocialFeed' },
  { name: 'Create',  icon: Plus,    page: 'Create', highlight: true },
  { name: 'Library', icon: Library, page: 'Library', requireAuth: true },
  { name: 'Profile', icon: User,    page: 'Profile', requireAuth: true },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(ok => {
      if (ok) base44.auth.me().then(setUser).finally(() => setIsLoadingUser(false));
      else setIsLoadingUser(false);
    });
  }, []);

  const handleLogout = () => {
    haptics.medium();
    base44.auth.logout(createPageUrl('Home'));
  };

  const avatarUrl = user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name || 'U'}`;

  if (BARE_PAGES.includes(currentPageName)) {
    return (
      <AudioPlayerProvider>
        <div className="min-h-screen bg-[#06040f]">
          <DynamicGradient />
          {children}
          <GlobalAudioPlayer />
        </div>
      </AudioPlayerProvider>
    );
  }

  const filteredNav = NAV_LINKS.filter(l => !l.requireAuth || user);
  const filteredMobileNav = MOBILE_NAV.filter(l => !l.requireAuth || user);

  return (
    <AudioPlayerProvider>
      <div className="min-h-screen flex flex-col" style={{ background: '#06040f' }}>
        <DynamicGradient />

        {/* ── Desktop Top Nav ────────────────────────────────────────── */}
        <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-8 h-[60px]"
          style={{ background: 'rgba(6,4,15,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          {/* Logo */}
          <Link to={createPageUrl('Home')}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937c84c50aa245e9602d1ce/016bba8f4_accostica-logo-366x111.png"
              alt="Accoustica"
              className="h-8"
            />
          </Link>

          {/* Center nav pills */}
          <nav className="flex items-center gap-1">
            {filteredNav.map((link) => {
              const isActive = currentPageName === link.page;
              if (link.highlight) {
                return (
                  <Link key={link.page} to={createPageUrl(link.page)}>
                    <button
                      onClick={() => haptics.light()}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.name}
                    </button>
                  </Link>
                );
              }
              return (
                <Link key={link.page} to={createPageUrl(link.page)}>
                  <button
                    onClick={() => haptics.light()}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium transition-all',
                      isActive ? 'text-white bg-white/10' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.name}
                  </button>
                </Link>
              );
            })}
          </nav>

          {/* Right: user */}
          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all">
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20">
                      <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm text-white/70 font-medium max-w-[100px] truncate">{user.full_name?.split(' ')[0]}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-white/30" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-[#120e22] border-white/10">
                  <div className="px-3 py-2">
                    <p className="font-medium text-white text-sm">{user.full_name}</p>
                    <p className="text-xs text-white/30">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                  <DropdownMenuItem asChild className="text-white/60 focus:text-white focus:bg-white/[0.06]">
                    <Link to={createPageUrl('Profile')}><User className="h-4 w-4 mr-2" />Profile</Link>
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild className="text-violet-400 focus:text-violet-300 focus:bg-white/[0.06]">
                      <Link to={createPageUrl('AdminDashboard')}><Crown className="h-4 w-4 mr-2" />Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                    <LogOut className="h-4 w-4 mr-2" />Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* ── Mobile Top Bar ─────────────────────────────────────────── */}
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
          style={{ background: 'rgba(6,4,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Link to={createPageUrl('Home')}>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937c84c50aa245e9602d1ce/016bba8f4_accostica-logo-366x111.png"
              alt="Accoustica"
              className="h-7"
            />
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                  <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-[#120e22] border-white/10">
                <div className="px-3 py-2">
                  <p className="font-medium text-white text-sm">{user.full_name}</p>
                  <p className="text-xs text-white/30">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem asChild className="text-white/60 focus:text-white focus:bg-white/[0.06]">
                  <Link to={createPageUrl('Profile')}><User className="h-4 w-4 mr-2" />Profile</Link>
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <DropdownMenuItem asChild className="text-violet-400 focus:text-violet-300 focus:bg-white/[0.06]">
                    <Link to={createPageUrl('AdminDashboard')}><Crown className="h-4 w-4 mr-2" />Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                  <LogOut className="h-4 w-4 mr-2" />Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="px-3 py-1 rounded-xl text-xs font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
            >
              Sign In
            </button>
          )}
        </header>

        {/* ── Main content ──────────────────────────────────────────── */}
        <main className="flex-1 relative z-10 pt-14 lg:pt-[60px] pb-[130px] lg:pb-24">
          {children}
        </main>

        {/* ── Global Audio Player ──────────────────────────────────── */}
        <GlobalAudioPlayer />

        {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
          style={{ background: 'rgba(6,4,15,0.92)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="grid grid-cols-5 px-1 pb-safe">
            {filteredMobileNav.map((link) => {
              const isActive = currentPageName === link.page;
              if (link.highlight) {
                return (
                  <Link key={link.page} to={createPageUrl(link.page)} className="flex justify-center py-2">
                    <button
                      onClick={() => haptics.medium()}
                      className="w-14 h-14 -mt-5 rounded-2xl flex items-center justify-center text-white active:scale-95 transition-transform"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 8px 24px rgba(124,58,237,0.5)' }}
                    >
                      <Plus className="h-7 w-7" strokeWidth={2.5} />
                    </button>
                  </Link>
                );
              }
              return (
                <Link key={link.page} to={createPageUrl(link.page)}>
                  <button
                    onClick={() => haptics.light()}
                    className={cn('w-full flex flex-col items-center justify-center gap-0.5 py-3 transition-all', isActive ? 'text-violet-400' : 'text-white/35')}
                  >
                    <div className={cn('p-1.5 rounded-xl transition-all', isActive && 'bg-violet-500/15')}>
                      <link.icon className="h-5 w-5" />
                    </div>
                    <span className={cn('text-[10px] font-medium', isActive && 'text-violet-400')}>{link.name}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </AudioPlayerProvider>
  );
}