import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useAppSettings } from '@/lib/use-app-settings';

const ThemeContext = createContext(null);

const THEME_CLASSES = {
  'pastel-neon': 'theme-pastel-neon',
  'radiant-dusk': 'theme-radiant-dusk',
};

const THEME_OPTIONS = [
  {
    id: 'pastel-neon',
    name: 'Pastel Neon',
    description: 'Soft pastel base with translucent neon accents.',
  },
  {
    id: 'radiant-dusk',
    name: 'Radiant Dusk',
    description: 'Dark pink-orange glow with radium green highlights.',
  },
];

const applyThemeClass = (themeId) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  Object.values(THEME_CLASSES).forEach((className) => root.classList.remove(className));
  const className = THEME_CLASSES[themeId] || THEME_CLASSES['radiant-dusk'];
  root.classList.add(className);
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const defaultTheme = settings?.default_theme || 'radiant-dusk';
  const [theme, setTheme] = useState(defaultTheme);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('accoustica_theme');
    const nextTheme = user?.appearance_theme || stored || defaultTheme;
    setTheme(nextTheme);
    setIsReady(true);
  }, [user?.appearance_theme, defaultTheme]);

  useEffect(() => {
    if (!isReady) return;
    applyThemeClass(theme);
    window.localStorage.setItem('accoustica_theme', theme);
  }, [theme, isReady]);

  const updateTheme = async (nextTheme) => {
    setTheme(nextTheme);
    if (user?.id) {
      try {
        await base44.auth.updateMe({ appearance_theme: nextTheme });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme: updateTheme,
      themes: THEME_OPTIONS,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
