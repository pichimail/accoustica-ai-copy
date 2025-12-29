const parseEnvFlag = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return null;
};

export const SUPABASE_AUTH_ENV = parseEnvFlag(
  import.meta.env.VITE_SUPABASE_AUTH ?? import.meta.env.SUPABASE_AUTH
);
export const SUPABASE_AUTH_ENABLED = SUPABASE_AUTH_ENV ?? true;

export const GOOGLE_AUTH_ENV = parseEnvFlag(import.meta.env.VITE_GOOGLE_AUTH_ENABLED);
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const DEFAULT_ADMIN_EMAIL = import.meta.env.VITE_DEFAULT_ADMIN_EMAIL || '';
export const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || '';
export const DEFAULT_ADMIN_NAME = import.meta.env.VITE_DEFAULT_ADMIN_NAME || 'Admin';

export const getFallbackAdmin = () => ({
  id: 'local-admin',
  email: DEFAULT_ADMIN_EMAIL || 'admin@local',
  full_name: DEFAULT_ADMIN_NAME || 'Admin',
  role: 'admin',
  account_status: 'active'
});
