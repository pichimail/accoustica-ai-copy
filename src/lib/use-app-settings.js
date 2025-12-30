import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULT_FEATURES = {
  music_generation: true,
  lyric_video: true,
  runway_text: true,
  runway_image: true,
  runway_extend: true,
  runway_music: true,
  cover_art: true,
  discover_videos: true,
};

const DEFAULT_SETTINGS = {
  default_theme: 'radiant-dusk',
  watermark_text: 'Accoustica',
  watermark_logo_url: '/icon-logo-accoustica.png',
  features: DEFAULT_FEATURES,
  kie_api_key: '',
  google_auth_enabled: false,
  google_client_id: '',
};

const normalizeSettings = (record) => {
  if (!record) return DEFAULT_SETTINGS;
  let parsedFeatures = record.features;
  if (typeof parsedFeatures === 'string') {
    try {
      parsedFeatures = JSON.parse(parsedFeatures);
    } catch {
      parsedFeatures = {};
    }
  }
  return {
    ...DEFAULT_SETTINGS,
    ...record,
    features: {
      ...DEFAULT_FEATURES,
      ...(parsedFeatures || {}),
    },
  };
};

export const useAppSettings = () => {
  const query = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      try {
        const records = await base44.entities.AppSettings.filter({ app_key: 'primary' });
        return records[0] || null;
      } catch (error) {
        console.error('Failed to load app settings:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 30000,
  });

  const settings = useMemo(() => normalizeSettings(query.data), [query.data]);

  return {
    ...query,
    settings,
  };
};

export const DEFAULT_APP_FEATURES = DEFAULT_FEATURES;
