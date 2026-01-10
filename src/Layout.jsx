import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { haptics } from '@/components/utils/haptics';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sparkles,
  Music,
  Globe,
  User,
  LogOut,
  Library,
  Crown,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
  Users,
} from 'lucide-react';
import DynamicGradient from '@/components/background/DynamicGradient';
import { cn } from "@/lib/utils";
import { AudioPlayerProvider } from '@/components/audio/AudioPlayerContext';
import GlobalAudioPlayer from '@/components/audio/GlobalAudioPlayer';
import FullScreenPlayer from '@/components/audio/FullscreenPlayer';
import { useAppSettings } from '@/lib/use-app-settings';
import BrandLogo from '@/components/brand/BrandLogo';
import PWAInstallPrompt from '@/components/mobile/PWAInstallPrompt';

const publicPages = ['Home', 'PublicTrack', 'Discover'];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { settings } = useAppSettings();

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

  const showStudio = settings.features.music_generation ||
    settings.features.runway_text ||
    settings.features.runway_image ||
    settings.features.runway_music ||
    settings.features.runway_extend;
  const showCreate = settings.features.music_generation;

  const navLinks = [
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'For You', icon: Sparkles, page: 'ForYou', requireAuth: true },
    ...(showCreate ? [{ name: 'Create', icon: PlusCircle, page: 'Create', requireAuth: true }] : []),
    ...(showStudio ? [{ name: 'Studio', icon: Music, page: 'Studio', requireAuth: true }] : []),
    { name: 'Library', icon: Library, page: 'Library', requireAuth: true },
    { name: 'Discover', icon: Globe, page: 'Discover' },
    { name: 'Collaborate', icon: Users, page: 'CollaborativeStudio', requireAuth: true },
    { name: 'Mastering', icon: Crown, page: 'MasteringStudio', requireAuth: true },
    { name: 'Personas', icon: User, page: 'PersonasHub', requireAuth: true },
    { name: 'Stems', icon: PanelLeftClose, page: 'StemStudio', requireAuth: true },
    { name: 'Profile', icon: User, page: 'Profile', requireAuth: true },
  ];

  const filteredNavLinks = navLinks.filter(link => {
    if (link.requireAuth && !user) return false;
    return true;
  });

  const mobileNavLinks = filteredNavLinks.filter((link) =>
    ['Home', 'Library', 'Discover', 'Profile'].includes(link.page)
  );
  
  // Add Create link separately (will be centered with special style)
  const createLink = filteredNavLinks.find(link => link.page === 'Create');

  // Hide layout on public track page
  if (currentPageName === 'PublicTrack') {
    return <>{children}</>;
  }

  const showSidebar = currentPageName !== 'Home';

  const avatarUrl = user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name || 'User'}`;

  return (
    <AudioPlayerProvider>
    <div className="min-h-screen flex flex-col">
      {/* Global Dynamic Gradient Background */}
      <DynamicGradient />
      {/* Desktop Floating Logo */}
      <div className={cn(
        "hidden lg:flex fixed top-4 left-4 z-50 items-center gap-3",
        currentPageName === 'Home' && "hidden"
      )}>
        <Link to={createPageUrl('Home')} className="flex items-center gap-2">
          <BrandLogo variant="wordmark" className="h-8 w-auto" />
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="glass-surface rounded-full p-2 text-slate-200 hover:text-white transition-colors"
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
      </div>
      {/* Mobile Top Bar */}
      <header className={cn(
        "lg:hidden fixed top-0 left-0 right-0 z-50 glass-surface border-b border-white/10 safe-top",
        currentPageName === 'Home' && "hidden"
      )}>
        <div className="flex items-center justify-between px-4 h-16">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <BrandLogo variant="icon" className="h-9 w-9" />
          </Link>

          <div className="flex items-center gap-2">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-700">
                    <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="font-medium text-white text-sm">{user.full_name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem asChild className="text-slate-300 focus:text-white focus:bg-slate-700">
                    <Link to={createPageUrl('Profile')}>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild className="text-violet-400 focus:text-violet-300 focus:bg-slate-700">
                      <Link to={createPageUrl('AdminDashboard')}>
                        <Crown className="h-4 w-4 mr-2" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex fixed left-0 top-0 h-screen glass-surface border-r border-white/10 z-40 transition-all duration-300 pt-16",
        sidebarOpen ? "w-64" : "w-20",
        currentPageName === 'Home' && "hidden"
      )}>
        <div className="flex flex-col w-full">
          {/* Spacer for floating logo */}
          <div className="h-4" />

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {filteredNavLinks.map((link) => (
              <Link key={link.page} to={createPageUrl(link.page)}>
                <button 
                  onClick={() => haptics.light()}
                  className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all",
                  currentPageName === link.page 
                    ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/25" 
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}>
                  <link.icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium">{link.name}</span>}
                </button>
              </Link>
            ))}
          </nav>

          {/* User Profile */}
          {user && (
            <div className="p-3 border-t border-slate-800/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-all",
                    !sidebarOpen && "justify-center"
                  )}>
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-700 flex-shrink-0">
                      <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" />
                    </div>
                    {sidebarOpen && (
                      <div className="flex-1 text-left overflow-hidden">
                        <p className="text-white text-sm font-medium truncate">{user.full_name}</p>
                        <p className="text-slate-400 text-xs truncate">{user.email}</p>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild className="text-slate-300 focus:text-white focus:bg-slate-700">
                    <Link to={createPageUrl('Profile')}>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild className="text-violet-400 focus:text-violet-300 focus:bg-slate-700">
                      <Link to={createPageUrl('AdminDashboard')}>
                        <Crown className="h-4 w-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-slate-700" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 lg:transition-all lg:duration-300 relative z-10",
        currentPageName === 'Home' ? "pt-0 pb-20 lg:pb-0" : "pt-16 pb-20 lg:pt-0 lg:pb-0",
        showSidebar && (sidebarOpen ? "lg:ml-64" : "lg:ml-20")
      )}>
        {children}
      </main>

      {/* Global Audio Player */}
      <GlobalAudioPlayer />

      {/* Full-Screen Mobile Player */}
      <FullScreenPlayer />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Mobile Bottom Navigation */}
      <nav className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-surface border-t border-white/10 safe-bottom",
        currentPageName === 'Home' && "hidden"
      )}>
        <div className="relative flex items-center justify-around px-2 py-2">
          {mobileNavLinks.slice(0, 2).map((link) => (
            <Link key={link.page} to={createPageUrl(link.page)}>
              <button 
                onClick={() => haptics.light()}
                className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all",
                currentPageName === link.page
                  ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/25"
                  : "text-slate-400 active:bg-slate-800/50"
              )}>
                <link.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{link.name}</span>
              </button>
            </Link>
          ))}
          
          {/* Center Create Button */}
          {createLink && (
            <Link to={createPageUrl('Create')}>
              <button 
                onClick={() => haptics.medium()}
                className={cn(
                  "w-14 h-14 rounded-full -mt-8 flex items-center justify-center shadow-2xl transition-all",
                  currentPageName === 'Create'
                    ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-violet-500/50"
                    : "bg-gradient-to-r from-violet-600 to-pink-600 text-white hover:shadow-violet-500/50"
                )}>
                <PlusCircle className="h-7 w-7" />
              </button>
            </Link>
          )}
          
          {mobileNavLinks.slice(2).map((link) => (
            <Link key={link.page} to={createPageUrl(link.page)}>
              <button 
                onClick={() => haptics.light()}
                className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all",
                currentPageName === link.page
                  ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/25"
                  : "text-slate-400 active:bg-slate-800/50"
              )}>
                <link.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{link.name}</span>
              </button>
            </Link>
          ))}
        </div>
      </nav>
    </div>
    </AudioPlayerProvider>
  );
}