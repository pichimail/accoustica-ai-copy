import React from 'react';
import { useTheme } from '@/lib/theme-context';
import { BRAND_ASSETS, getThemeMode } from '@/lib/brand-assets';
import { cn } from '@/lib/utils';

export default function BrandLogo({
  variant = 'wordmark',
  className,
  alt = 'Accoustica',
  ...props
}) {
  const { theme } = useTheme();
  const mode = getThemeMode(theme);
  const src = BRAND_ASSETS[variant]?.[mode] || BRAND_ASSETS.icon.dark;

  return (
    <img
      src={src}
      alt={alt}
      className={cn('block object-contain', className)}
      {...props}
    />
  );
}
