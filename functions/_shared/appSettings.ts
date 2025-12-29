type AppSettings = {
  app_key?: string;
  kie_api_key?: string;
  watermark_text?: string;
  watermark_logo_url?: string;
  features?: Record<string, boolean>;
};

export const getAppSettings = async (base44: any): Promise<AppSettings> => {
  try {
    const records = await base44.asServiceRole.entities.AppSettings.filter({ app_key: 'primary' });
    return records?.[0] || {};
  } catch (error) {
    console.error('Failed to load AppSettings:', error);
    return {};
  }
};

export const getKieApiKey = (settings: AppSettings) => {
  return (
    settings.kie_api_key ||
    Deno.env.get('KIE_API_KEY') ||
    Deno.env.get('SUNO_API_KEY') ||
    ''
  );
};

export const getWatermark = (settings: AppSettings) => {
  return settings.watermark_text || 'Accoustica';
};

export const isFeatureEnabled = (settings: AppSettings, key: string) => {
  if (!settings.features) return true;
  return settings.features[key] !== false;
};
