import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Sparkles, Music, Globe, User, LogOut, Menu, X, 
  Plus, Library, Crown, Home, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';
import { AudioPlayerProvider } from '@/components/audio/AudioPlayerContext';
import GlobalAudioPlayer from '@/components/audio/GlobalAudioPlayer';

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
    base44.auth.logout(createPageUrl('Home'));
  };

  const navLinks = [
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'Create', icon: Plus, page: 'Create', requireAuth: true },
    { name: 'Library', icon: Library, page: 'Library', requireAuth: true },
    { name: 'Discover', icon: Globe, page: 'Discover' },
    { name: 'Studio', icon: Music, page: 'CollaborativeStudio', requireAuth: true },
    { name: 'Profile', icon: User, page: 'Profile', requireAuth: true },
  ];

  const filteredNavLinks = navLinks.filter(link => {
    if (link.requireAuth && !user) return false;
    return true;
  });

  // Hide layout on public track page
  if (currentPageName === 'PublicTrack') {
    return <>{children}</>;
  }

  const avatarUrl = user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name || 'User'}`;

  return (
    <AudioPlayerProvider>
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 safe-top">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to={createPageUrl('Home')} className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937c84c50aa245e9602d1ce/016bba8f4_accostica-logo-366x111.png" 
              alt="Accoustica" 
              className="h-8"
            />
          </Link>

          <div className="flex items-center gap-2">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-700">
                    <img src={avatarUrl} alt={user.full_name} className="w-full h-full object-cover" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
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
        "hidden lg:flex fixed left-0 top-0 h-screen bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 z-40 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="flex flex-col w-full">
          {/* Logo & Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
            {sidebarOpen ? (
              <>
                <Link to={createPageUrl('Home')} className="flex items-center gap-3">
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6937c84c50aa245e9602d1ce/016bba8f4_accostica-logo-366x111.png" 
                    alt="Accoustica" 
                    className="h-10"
                  />
                </Link>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white">
                  <PanelLeftClose className="h-5 w-5" />
                </button>
              </>
            ) : (
              <button onClick={() => setSidebarOpen(true)} className="mx-auto text-slate-400 hover:text-white">
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {filteredNavLinks.map((link) => (
              <Link key={link.page} to={createPageUrl(link.page)}>
                <button className={cn(
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
                <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
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
        "flex-1 lg:transition-all lg:duration-300",
        "pt-16 pb-20 lg:pt-0 lg:pb-0", // Mobile padding
        sidebarOpen ? "lg:ml-64" : "lg:ml-20"
      )}>
        {children}
      </main>

      {/* Global Audio Player */}
      <GlobalAudioPlayer />

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 safe-bottom">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {filteredNavLinks.map((link) => (
            <Link key={link.page} to={createPageUrl(link.page)}>
              <button className={cn(
                "w-full flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl transition-all",
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