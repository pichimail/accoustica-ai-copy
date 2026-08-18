import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { haptics } from '@/components/utils/haptics';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('accoustica-theme');
    const dark = stored ? stored === 'dark' : true;
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);

  const toggle = () => {
    haptics.light();
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('accoustica-theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
      style={{
        background: 'var(--studio-surface)',
        color: 'var(--studio-text-muted)',
      }}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}