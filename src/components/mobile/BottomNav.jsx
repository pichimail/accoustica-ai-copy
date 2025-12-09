import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Plus, Library, Compass, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { name: 'Home', icon: Home, path: createPageUrl('Home') },
    { name: 'Discover', icon: Compass, path: createPageUrl('Discover') },
    { name: 'Create', icon: Plus, path: createPageUrl('Create'), highlight: true },
    { name: 'Library', icon: Library, path: createPageUrl('Library') },
    { name: 'Profile', icon: User, path: createPageUrl('Profile') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-black/95 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
          {navItems.map((item) => {
            const isActive = currentPath.includes(item.name.toLowerCase());
            const Icon = item.icon;
            
            return (
              <Link key={item.name} to={item.path} className="flex-1">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all",
                    isActive && !item.highlight && "bg-white/5",
                    item.highlight && "transform -translate-y-3"
                  )}
                >
                  {item.highlight ? (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-red-500 flex items-center justify-center shadow-lg shadow-pink-500/50">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  ) : (
                    <>
                      <Icon 
                        className={cn(
                          "h-6 w-6 transition-colors",
                          isActive ? "text-white" : "text-gray-500"
                        )} 
                      />
                      <span 
                        className={cn(
                          "text-xs mt-1 font-medium transition-colors",
                          isActive ? "text-white" : "text-gray-500"
                        )}
                      >
                        {item.name}
                      </span>
                    </>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}