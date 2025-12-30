export const BRAND_ASSETS = {
  icon: {
    light: '/icon-logo-accoustica.png',
    dark: '/icon-logo-accoustica.png',
  },
  wordmark: {
    light: '/accoustica-light-logo.png',
    dark: '/Accoustica-logo-dark.png',
  },
};

export const getThemeMode = (themeId) =>
  themeId === 'pastel-neon' ? 'light' : 'dark';
