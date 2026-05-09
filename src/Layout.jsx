// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { haptics } from '@/components/utils/haptics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  Sparkles, Music, Globe, User, LogOut,
  Plus, Library, Crown, Home,
  Disc, MessageCircle, PanelLeftClose, PanelLeftOpen, GitBranch, Volume2, Edit3, BarChart3, ArrowLeft } from
'lucide-react';

import { cn } from "@/lib/utils";
import { AudioPlayerProvider } from '@/components/audio/AudioPlayerContext';
import GlobalAudioPlayer from '@/components/audio/GlobalAudioPlayer';
import MobileNav from '@/components/mobile/MobileNav';

const publicPages = ['Home', 'PublicTrack', 'Discover'];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        const userData = await base44.auth.me();
        setUser(userData);
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    haptics.medium();
    base44.auth.logout(createPageUrl('Home'));
  };

  const navLinks = [
  { name: 'Home', icon: Home, page: 'Home' },
  { name: 'For You', icon: Sparkles, page: 'ForYou', requireAuth: true },
  { name: 'Create', icon: Plus, page: 'Create', requireAuth: true },
  { name: 'Library', icon: Library, page: 'Library', requireAuth: true },
  { name: 'Insights', icon: BarChart3, page: 'Insights', requireAuth: true },
  { name: 'Feed', icon: MessageCircle, page: 'SocialFeed' },
  { name: 'Discover', icon: Globe, page: 'Discover' },
  { name: 'Studio', icon: Music, page: 'CollaborativeStudio', requireAuth: true },
  { name: 'Stems', icon: Disc, page: 'StemStudio', requireAuth: true },
  { name: 'Remix', icon: GitBranch, page: 'RemixStudio', requireAuth: true },
  { name: 'Master', icon: Volume2, page: 'MasteringProStudio', requireAuth: true },
  { name: 'Editor', icon: Edit3, page: 'SongEditor', requireAuth: true }];


  const filteredNavLinks = navLinks.filter((link) => {
    if (link.requireAuth && !user) return false;
    return true;
  });

  // Hide layout on public track page
  if (currentPageName === 'PublicTrack') {
    return <>{children}</>;
  }

  const showSidebar = currentPageName !== 'Home';

  const avatarUrl = user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name || 'User'}`;

  return (
    <AudioPlayerProvider>
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f' }}>
      {/* Ambient gradient — static, no performance cost */}
      {/* Mobile Top Bar */}
      <header className={cn(
          "lg:hidden fixed top-0 left-0 right-0 z-50 safe-top",
          currentPageName === 'Home' && "hidden"
        )}
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          
        <div className="flex items-center justify-between px-4 h-16 opacity-100">
          <div className="flex items-center gap-1">
            <button onClick={() => window.history.back()} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/35 hover:text-white/80 transition-colors" aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937c84c50aa245e9602d1ce/016bba8f4_accostica-logo-366x111.png"
                  alt="Accoustica"
                  className="h-8" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {user &&
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                    <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" style={{ background: 'rgba(14,14,22,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="px-3 py-2">
                    <p className="font-bold text-white text-sm">{user.full_name}</p>
                    <p className="text-xs text-white/40">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem asChild className="text-white/70 focus:text-white focus:bg-white/10">
                    <Link to={createPageUrl('Profile')}>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'admin' &&
                  <DropdownMenuItem asChild className="text-green-400 focus:text-green-300 focus:bg-white/10">
                      <Link to={createPageUrl('AdminDashboard')}>
                        <Crown className="h-4 w-4 mr-2" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  }
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              }
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside
          className={cn(
            "hidden lg:flex fixed left-0 top-0 h-screen z-40 transition-all duration-300",
            sidebarOpen ? "w-64" : "w-20",
            currentPageName === 'Home' && "hidden"
          )}
          style={{ background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(24px)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          
        <div className="flex flex-col w-full">
          {/* Logo & Toggle */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {sidebarOpen ?
              <>
                <div className="flex items-center gap-1">
                  <button onClick={() => window.history.back()} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/70 transition-colors flex-shrink-0" aria-label="Go back">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Link to={createPageUrl('Home')} className="flex items-center">
                    <img
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937c84c50aa245e9602d1ce/016bba8f4_accostica-logo-366x111.png"
                      alt="Accoustica"
                      className="h-9" />
                  </Link>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-white/30 hover:text-white transition-colors">
                  <PanelLeftClose className="h-5 w-5" />
                </button>
              </> :

              <button onClick={() => setSidebarOpen(true)} className="mx-auto text-white/30 hover:text-white transition-colors">
                <PanelLeftOpen className="h-5 w-5" />
              </button>
              }
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {filteredNavLinks.map((link) => {
                const isActive = currentPageName === link.page;
                return (
                  <Link key={link.page} to={createPageUrl(link.page)}>
                  <button
                      onClick={() => haptics.light()}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                        isActive ? "text-black font-semibold" : "text-white/50 hover:text-white hover:bg-white/5"
                      )}
                      style={isActive ? { background: '#22c55e', boxShadow: '0 0 16px rgba(34,197,94,0.35)' } : {}}>
                      
                    <link.icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm font-medium">{link.name}</span>}
                  </button>
                </Link>);

              })}
          </nav>

          {/* User Profile */}
          {user &&
            <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all",
                    !sidebarOpen && "justify-center"
                  )}>
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                      <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" />
                    </div>
                    {sidebarOpen &&
                    <div className="flex-1 text-left overflow-hidden">
                        <p className="text-white text-sm font-semibold truncate">{user.full_name}</p>
                        <p className="text-white/40 text-xs truncate">{user.email}</p>
                      </div>
                    }
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" style={{ background: 'rgba(18,18,28,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <DropdownMenuItem asChild className="text-white/70 focus:text-white focus:bg-white/10">
                    <Link to={createPageUrl('Profile')}>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'admin' &&
                  <DropdownMenuItem asChild className="text-green-400 focus:text-green-300 focus:bg-white/10">
                      <Link to={createPageUrl('AdminDashboard')}>
                        <Crown className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  }
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            }
        </div>
      </aside>

      {/* Main Content — extra bottom padding on mobile accounts for nav bar (56px) + player (60px) */}
      <main className={cn(
          "flex-1 lg:transition-all lg:duration-300 relative z-10",
          currentPageName === 'Home' ? "pt-0 pb-0 lg:pb-0" : "pt-14 pb-[160px] lg:pt-0 lg:pb-20",
          showSidebar && (sidebarOpen ? "lg:ml-64" : "lg:ml-20")
        )}>
        {children}
      </main>

      {/* Global Audio Player */}
      <GlobalAudioPlayer currentPageName={currentPageName} />

      {/* Mobile Bottom Navigation */}
      {currentPageName !== 'Home' &&
        <MobileNav currentPageName={currentPageName} user={user} autoHide={currentPageName === 'Create'} />
        }
    </div>
    </AudioPlayerProvider>);

}