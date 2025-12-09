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
  Plus, Library, LayoutDashboard, Settings, Crown
} from 'lucide-react';
import { cn } from "@/lib/utils";

const publicPages = ['Home', 'PublicTrack', 'Discover'];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const isPublicPage = publicPages.includes(currentPageName);
  const isAdminPage = currentPageName?.startsWith('Admin');

  const navLinks = [
    { name: 'Home', icon: Sparkles, page: 'Home' },
    { name: 'Create', icon: Plus, page: 'Create', requireAuth: true },
    { name: 'Library', icon: Library, page: 'Library', requireAuth: true },
    { name: 'Discover', icon: Globe, page: 'Discover' },
  ];

  const filteredNavLinks = navLinks.filter(link => {
    if (link.requireAuth && !user) return false;
    return true;
  });

  // Hide layout on public track page for cleaner embed experience
  if (currentPageName === 'PublicTrack') {
    return <>{children}</>;
  }

  const avatarUrl = user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.full_name || 'User'}`;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-white text-lg hidden sm:block">Accoustica</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {filteredNavLinks.map((link) => (
                <Link key={link.page} to={createPageUrl(link.page)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-slate-400 hover:text-white hover:bg-slate-800",
                      currentPageName === link.page && "text-white bg-slate-800"
                    )}
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.name}
                  </Button>
                </Link>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
              ) : user ? (
                <>
                  <Link to={createPageUrl('Create')} className="hidden md:block">
                    <Button className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </Button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-800 transition-colors">
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-700">
                          <img 
                            src={avatarUrl} 
                            alt={user.full_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
                      <div className="px-3 py-2">
                        <p className="font-medium text-white">{user.full_name}</p>
                        <p className="text-sm text-slate-400">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem asChild className="text-slate-300 focus:text-white focus:bg-slate-700">
                        <Link to={createPageUrl('Profile')}>
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="text-slate-300 focus:text-white focus:bg-slate-700">
                        <Link to={createPageUrl('Library')}>
                          <Library className="h-4 w-4 mr-2" />
                          My Library
                        </Link>
                      </DropdownMenuItem>
                      {user.role === 'admin' && (
                        <>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem asChild className="text-violet-400 focus:text-violet-300 focus:bg-slate-700">
                            <Link to={createPageUrl('AdminDashboard')}>
                              <Crown className="h-4 w-4 mr-2" />
                              Admin Dashboard
                            </Link>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem 
                        onClick={handleLogout}
                        className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Log Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button 
                  onClick={() => base44.auth.redirectToLogin(createPageUrl('Create'))}
                  className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white"
                >
                  Get Started
                </Button>
              )}

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 text-slate-400 hover:text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800">
            <div className="px-4 py-4 space-y-1">
              {filteredNavLinks.map((link) => (
                <Link 
                  key={link.page} 
                  to={createPageUrl(link.page)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800",
                      currentPageName === link.page && "text-white bg-slate-800"
                    )}
                  >
                    <link.icon className="h-4 w-4 mr-2" />
                    {link.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}