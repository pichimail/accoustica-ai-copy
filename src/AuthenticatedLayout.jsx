// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { haptics } from '@/components/utils/haptics';
import { AudioPlayerProvider, useAudioPlayer } from '@/components/audio/AudioPlayerContext';
import GlobalAudioPlayer from '@/components/audio/GlobalAudioPlayer';
import MobileNav from '@/components/mobile/MobileNav';
import {
  Sparkles,
  User,
  LogOut,
  Plus,
  Library,
  Crown,
  Home,
  Disc,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Volume2,
  Edit3,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navLinks = [
  { name: 'Home', icon: Home, page: 'Home', hideWhenAuth: true },
  { name: 'For You', icon: Sparkles, page: 'ForYou', requireAuth: true },
  { name: 'Create', icon: Plus, page: 'Create', requireAuth: true },
  { name: 'Voice Studio', icon: Sparkles, page: 'VoiceStudio', requireAuth: true },
  { name: 'Library', icon: Library, page: 'Library', requireAuth: true },
  { name: 'Insights', icon: BarChart3, page: 'Insights', requireAuth: true },
  { name: 'Feed', icon: MessageCircle, page: 'SocialFeed' },
  { name: 'Stems & Remix', icon: Disc, page: 'StemStudio', requireAuth: true },
  { name: 'Master', icon: Volume2, page: 'MasteringProStudio', requireAuth: true },
  { name: 'Editor', icon: Edit3, page: 'SongEditor', requireAuth: true },
];

function InitialsAvatar({ user }) {
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt={user.full_name || 'User'} className="w-full h-full object-cover" />;
  }

  const initials = String(user?.full_name || user?.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  return <span className="w-full h-full flex items-center justify-center bg-white/10 text-white/75 text-xs font-black">{initials}</span>;
}

function BrandMark({ showText = true, className = 'h-8' }) {
  return (
    <div className={cn('flex items-center gap-2 text-white', className)}>
      <img src="/favicon.svg" alt="" className="h-full aspect-square" />
      {showText && <span className="text-sm font-black tracking-tight">Accoustica</span>}
    </div>
  );
}

function UserMenu({ user, logout, compact = false }) {
  if (!user) return null;

  const handleLogout = () => {
    haptics.medium();
    logout(createPageUrl('Home'));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn('flex items-center gap-3 rounded-xl hover:bg-white/5 transition-all', compact ? 'w-8 h-8 rounded-full overflow-hidden border border-white/10' : 'w-full p-3')}>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
            <InitialsAvatar user={user} />
          </div>
          {!compact && (
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-white text-sm font-semibold truncate">{user.full_name}</p>
              <p className="text-white/40 text-xs truncate">{user.email}</p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" style={{ background: 'rgba(18,18,28,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <DropdownMenuItem asChild className="text-white/70 focus:text-white focus:bg-white/10">
          <Link to={createPageUrl('Profile')}>
            <User className="h-4 w-4 mr-2" />
            Profile
          </Link>
        </DropdownMenuItem>
        {user.role === 'admin' && (
          <DropdownMenuItem asChild className="text-green-400 focus:text-green-300 focus:bg-white/10">
            <Link to={createPageUrl('AdminDashboard')}>
              <Crown className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
          <LogOut className="h-4 w-4 mr-2" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReservedMain({ children, currentPageName, showSidebar, sidebarOpen }) {
  const { playerVisible, currentTrack } = useAudioPlayer();
  const hasVisiblePlayer = !!playerVisible && !!currentTrack;
  const hasMobileNav = currentPageName !== 'Home';
  const playerReserve = hasVisiblePlayer ? 'var(--active-player-height)' : '0px';
  const mobileNavReserve = hasMobileNav ? 'var(--active-mobile-nav-height)' : '0px';
  const topbarReserve = currentPageName === 'Home' ? '0px' : 'var(--active-mobile-topbar-height)';
  const desktopSidebarReserve = showSidebar ? (sidebarOpen ? '16rem' : '5rem') : '0px';
  const bottomChromeReserve = 'calc(var(--player-reserve) + var(--mobile-nav-reserve) + env(safe-area-inset-bottom, 0px))';

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--player-reserve', playerReserve);
    root.style.setProperty('--mobile-nav-reserve', mobileNavReserve);
    root.style.setProperty('--topbar-reserve', topbarReserve);
    root.style.setProperty('--desktop-sidebar-reserve', desktopSidebarReserve);
    root.style.setProperty('--bottom-chrome-reserve', bottomChromeReserve);
    root.style.setProperty('--player-bottom', 'calc(var(--mobile-nav-reserve) + env(safe-area-inset-bottom, 0px))');
    root.style.setProperty('--fixed-action-bottom', 'var(--bottom-chrome-reserve)');
    root.style.setProperty('--content-available-height', 'calc(var(--app-viewport-height, 100vh) - var(--topbar-reserve) - var(--bottom-chrome-reserve))');

    return () => {
      root.style.removeProperty('--player-reserve');
      root.style.removeProperty('--mobile-nav-reserve');
      root.style.removeProperty('--topbar-reserve');
      root.style.removeProperty('--desktop-sidebar-reserve');
      root.style.removeProperty('--bottom-chrome-reserve');
      root.style.removeProperty('--player-bottom');
      root.style.removeProperty('--fixed-action-bottom');
      root.style.removeProperty('--content-available-height');
    };
  }, [bottomChromeReserve, desktopSidebarReserve, mobileNavReserve, playerReserve, topbarReserve]);

  return (
    <main
      className={cn(
        'app-shell-main flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:transition-all lg:duration-300 relative z-10 scroll-smooth-mobile',
        showSidebar && (sidebarOpen ? 'lg:ml-64' : 'lg:ml-20')
      )}
      style={{
        '--player-reserve': playerReserve,
        '--mobile-nav-reserve': mobileNavReserve,
        '--topbar-reserve': topbarReserve,
        '--bottom-chrome-reserve': bottomChromeReserve,
        '--content-available-height': 'calc(var(--app-viewport-height, 100vh) - var(--topbar-reserve) - var(--bottom-chrome-reserve))',
        paddingTop: 'var(--topbar-reserve)',
        paddingBottom: 'var(--bottom-chrome-reserve)',
        height: '100%',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {children}
    </main>
  );
}

export default function AuthenticatedLayout({ children, currentPageName }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (currentPageName === 'PublicTrack') {
    return <>{children}</>;
  }

  const showSidebar = currentPageName !== 'Home';
  const filteredNavLinks = navLinks.filter((link) => {
    if (link.hideWhenAuth && user) return false;
    if (link.requireAuth && !user) return false;
    return true;
  });

  return (
    <AudioPlayerProvider>
      <div className="h-screen overflow-hidden flex flex-col" style={{ background: '#0a0a0f' }}>
        <header
          className={cn('lg:hidden fixed top-0 left-0 right-0 z-50 safe-top', currentPageName === 'Home' && 'hidden')}
          style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center justify-between px-4 h-16">
            <div className="flex items-center gap-1">
              <button onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.href = '/'; }} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/35 hover:text-white/80 transition-colors" aria-label="Go back">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Link to={createPageUrl('Home')}>
                <BrandMark className="h-8" />
              </Link>
            </div>
            <UserMenu user={user} logout={logout} compact />
          </div>
        </header>

        <aside
          className={cn('hidden lg:flex fixed left-0 top-0 h-screen z-40 transition-all duration-300', sidebarOpen ? 'w-64' : 'w-20', currentPageName === 'Home' && 'hidden')}
          style={{ background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(24px)', borderRight: '1px solid rgba(255,255,255,0.06)', paddingBottom: 'clamp(64px, 10vh, 96px)' }}
        >
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {sidebarOpen ? (
                <>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { if (window.history.length > 1) window.history.back(); else window.location.href = '/'; }} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/70 transition-colors flex-shrink-0" aria-label="Go back">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <Link to={createPageUrl('Home')}>
                      <BrandMark className="h-9" />
                    </Link>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} className="text-white/30 hover:text-white transition-colors" aria-label="Collapse sidebar">
                    <PanelLeftClose className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <button onClick={() => setSidebarOpen(true)} className="mx-auto text-white/30 hover:text-white transition-colors" aria-label="Expand sidebar">
                  <PanelLeftOpen className="h-5 w-5" />
                </button>
              )}
            </div>

            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {filteredNavLinks.map((link) => {
                const isActive = currentPageName === link.page || (link.page === 'SocialFeed' && currentPageName === 'Discover');
                return (
                  <Link key={link.page} to={createPageUrl(link.page)}>
                    <button
                      onClick={() => haptics.light()}
                      className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all', isActive ? 'text-black font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5')}
                      style={isActive ? { background: '#22c55e', boxShadow: '0 0 16px rgba(34,197,94,0.35)' } : {}}
                    >
                      <link.icon className="h-5 w-5 flex-shrink-0" />
                      {sidebarOpen && <span className="text-sm font-medium">{link.name}</span>}
                    </button>
                  </Link>
                );
              })}
            </nav>

            {user && (
              <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <UserMenu user={user} logout={logout} compact={!sidebarOpen} />
              </div>
            )}
          </div>
        </aside>

        <ReservedMain currentPageName={currentPageName} showSidebar={showSidebar} sidebarOpen={sidebarOpen}>
          {children}
        </ReservedMain>

        <GlobalAudioPlayer currentPageName={currentPageName} />
        {currentPageName !== 'Home' && <MobileNav currentPageName={currentPageName} user={user} />}
      </div>
    </AudioPlayerProvider>
  );
}
