import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useAppSettings } from '@/lib/use-app-settings';
import { BRAND_ASSETS, getThemeMode } from '@/lib/brand-assets';

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

const updateThemeIcons = (themeId) => {
  if (typeof document === 'undefined') return;
  const mode = getThemeMode(themeId);
  const iconHref = BRAND_ASSETS.icon[mode] || BRAND_ASSETS.icon.dark;

  const ensureLink = (rel) => {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    return link;
  };

  ensureLink('icon').setAttribute('href', iconHref);
  ensureLink('apple-touch-icon').setAttribute('href', iconHref);
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
    updateThemeIcons(theme);
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
