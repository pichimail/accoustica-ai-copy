import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const getEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const handleSupabaseError = (error: any) => {
  if (!error) return;
  throw new Error(error.message || 'Supabase request failed');
};

const parseOrder = (orderBy?: string) => {
  if (!orderBy || typeof orderBy !== 'string') return null;
  const descending = orderBy.startsWith('-');
  return {
    column: descending ? orderBy.slice(1) : orderBy,
    ascending: !descending
  };
};

const applyFilters = (query: any, filters: Record<string, unknown> = {}) => {
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      query = query.is(key, null);
    } else if (Array.isArray(value)) {
      query = query.in(key, value);
    } else {
      query = query.eq(key, value);
    }
  });
  return query;
};

export const createClientFromRequest = (req: Request) => {
  const authHeader = req.headers.get('Authorization') || '';

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    },
    auth: {
      persistSession: false
    }
  });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false
    }
  });

  const getAuthUser = async () => {
    const { data, error } = await supabaseUser.auth.getUser();
    handleSupabaseError(error);
    return data?.user || null;
  };

  const auth = {
    me: async () => {
      const authUser = await getAuthUser();
      if (!authUser) return null;
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      handleSupabaseError(error);
      return {
        id: authUser.id,
        email: authUser.email,
        ...profile
      };
    }
  };

  const CREATED_BY_TABLES = new Set([
    'tracks',
    'track_shares',
    'playlists',
    'personas',
    'mastering_presets',
    'video_generations',
    'stem_separations',
    'onboarding_progress',
    'app_logs'
  ]);

  const createEntity = (tableName: string) => ({
    list: async (orderBy?: string, limit?: number) => {
      let query = supabaseAdmin.from(tableName).select('*');
      const order = parseOrder(orderBy);
      if (order) query = query.order(order.column, { ascending: order.ascending });
      if (typeof limit === 'number') query = query.limit(limit);
      const { data, error } = await query;
      handleSupabaseError(error);
      return data || [];
    },
    filter: async (filters?: Record<string, unknown>, orderBy?: string, limit?: number) => {
      let query = supabaseAdmin.from(tableName).select('*');
      query = applyFilters(query, filters);
      const order = parseOrder(orderBy);
      if (order) query = query.order(order.column, { ascending: order.ascending });
      if (typeof limit === 'number') query = query.limit(limit);
      const { data, error } = await query;
      handleSupabaseError(error);
      return data || [];
    },
    create: async (payload: Record<string, unknown>) => {
      let body = payload;
      if (CREATED_BY_TABLES.has(tableName)) {
        const authUser = await getAuthUser();
        const createdBy = payload?.created_by || authUser?.email || null;
        body = {
          ...payload,
          created_by: createdBy
        };
      }
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .insert(body)
        .select()
        .single();
      handleSupabaseError(error);
      return data;
    },
    update: async (id: string, payload: Record<string, unknown>) => {
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      handleSupabaseError(error);
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabaseAdmin.from(tableName).delete().eq('id', id);
      handleSupabaseError(error);
      return { success: true };
    }
  });

  const entities = {
    Track: createEntity('tracks'),
    TrackLike: createEntity('track_likes'),
    TrackComment: createEntity('track_comments'),
    TrackShare: createEntity('track_shares'),
    TrackVersion: createEntity('track_versions'),
    Playlist: createEntity('playlists'),
    PlaylistTrack: createEntity('playlist_tracks'),
    Persona: createEntity('personas'),
    MasteringPreset: createEntity('mastering_presets'),
    VideoGeneration: createEntity('video_generations'),
    StemSeparation: createEntity('stem_separations'),
    OnboardingProgress: createEntity('onboarding_progress'),
    AppSettings: createEntity('app_settings'),
    Plan: createEntity('plans'),
    User: createEntity('profiles')
  };

  return {
    auth,
    entities,
    asServiceRole: {
      entities
    }
  };
};
