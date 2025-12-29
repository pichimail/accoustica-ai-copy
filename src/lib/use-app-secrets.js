import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const DEFAULT_SECRETS = {
  google_client_secret: '',
};

const normalizeSecrets = (record) => {
  if (!record) return DEFAULT_SECRETS;
  return {
    ...DEFAULT_SECRETS,
    ...record,
  };
};

export const useAppSecrets = (enabled = true) => {
  const query = useQuery({
    queryKey: ['appSecrets'],
    queryFn: async () => {
      try {
        const records = await base44.entities.AppSecrets.filter({ app_key: 'primary' });
        return records[0] || null;
      } catch (error) {
        console.error('Failed to load app secrets:', error);
        return null;
      }
    },
    enabled,
    retry: false,
    staleTime: 30000,
  });

  const secrets = useMemo(() => normalizeSecrets(query.data), [query.data]);

  return {
    ...query,
    secrets,
  };
};

export const DEFAULT_APP_SECRETS = DEFAULT_SECRETS;
