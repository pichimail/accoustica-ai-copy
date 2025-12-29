import { createClient } from '@supabase/supabase-js';
import { SUPABASE_AUTH_ENABLED, getFallbackAdmin } from '@/lib/auth-config';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'app-assets';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

const handleSupabaseError = (error) => {
  if (!error) return;
  const message = error.message || 'Supabase request failed';
  const err = new Error(message);
  err.details = error;
  throw err;
};

const parseOrder = (orderBy) => {
  if (!orderBy || typeof orderBy !== 'string') return null;
  const descending = orderBy.startsWith('-');
  return {
    column: descending ? orderBy.slice(1) : orderBy,
    ascending: !descending
  };
};

const applyFilters = (query, filters = {}) => {
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

const getAuthUser = async () => {
  if (!SUPABASE_AUTH_ENABLED) {
    return getFallbackAdmin();
  }
  const { data, error } = await supabase.auth.getUser();
  handleSupabaseError(error);
  return data?.user || null;
};

const ensureProfile = async (authUser) => {
  if (!authUser?.id) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();
  handleSupabaseError(error);

  if (profile) {
    return profile;
  }

  const fallbackName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.id,
      email: authUser.email,
      full_name: fallbackName,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    })
    .select()
    .single();
  handleSupabaseError(insertError);
  return created;
};

const auth = {
  me: async () => {
    if (!SUPABASE_AUTH_ENABLED) {
      return getFallbackAdmin();
    }
    const authUser = await getAuthUser();
    if (!authUser) return null;
    const profile = await ensureProfile(authUser);
    return {
      id: authUser.id,
      email: authUser.email,
      ...profile
    };
  },
  updateMe: async (updates) => {
    if (!SUPABASE_AUTH_ENABLED) {
      return { ...getFallbackAdmin(), ...updates };
    }
    const authUser = await getAuthUser();
    if (!authUser) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_date: new Date().toISOString() })
      .eq('id', authUser.id)
      .select()
      .single();
    handleSupabaseError(error);
    return data;
  },
  isAuthenticated: async () => {
    if (!SUPABASE_AUTH_ENABLED) {
      return true;
    }
    const { data, error } = await supabase.auth.getSession();
    handleSupabaseError(error);
    return Boolean(data?.session?.user);
  },
  logout: async (redirectUrl) => {
    if (!SUPABASE_AUTH_ENABLED) {
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
      return;
    }
    await supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },
  redirectToLogin: (redirectUrl = window.location.href) => {
    if (!SUPABASE_AUTH_ENABLED) {
      return;
    }
    const next = encodeURIComponent(redirectUrl);
    window.location.href = `/login?redirect=${next}`;
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

const createEntity = (tableName) => ({
  list: async (orderBy, limit) => {
    let query = supabase.from(tableName).select('*');
    const order = parseOrder(orderBy);
    if (order) query = query.order(order.column, { ascending: order.ascending });
    if (typeof limit === 'number') query = query.limit(limit);
    const { data, error } = await query;
    handleSupabaseError(error);
    return data || [];
  },
  filter: async (filters, orderBy, limit) => {
    let query = supabase.from(tableName).select('*');
    query = applyFilters(query, filters);
    const order = parseOrder(orderBy);
    if (order) query = query.order(order.column, { ascending: order.ascending });
    if (typeof limit === 'number') query = query.limit(limit);
    const { data, error } = await query;
    handleSupabaseError(error);
    return data || [];
  },
  create: async (payload) => {
    let body = payload;
    if (CREATED_BY_TABLES.has(tableName)) {
      const authUser = await getAuthUser();
      const createdBy = payload?.created_by || authUser?.email || null;
      body = {
        ...payload,
        created_by: createdBy
      };
    }
    const { data, error } = await supabase
      .from(tableName)
      .insert(body)
      .select()
      .single();
    handleSupabaseError(error);
    return data;
  },
  update: async (id, payload) => {
    const { data, error } = await supabase
      .from(tableName)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    handleSupabaseError(error);
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
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
  AppSecrets: createEntity('app_secrets'),
  Plan: createEntity('plans'),
  User: createEntity('profiles'),
  Query: {}
};

const functions = {
  invoke: async (name, payload) => {
    const { data, error } = await supabase.functions.invoke(name, { body: payload });
    handleSupabaseError(error);
    return { data };
  }
};

const uploadFile = async ({ file, pathPrefix = 'uploads' }) => {
  if (!file) {
    throw new Error('No file provided for upload');
  }
  const ext = file.name?.split('.').pop() || 'bin';
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const path = `${pathPrefix}/${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from(storageBucket)
    .upload(path, file, { upsert: true });
  handleSupabaseError(uploadError);
  const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
  return { file_url: data.publicUrl, path, bucket: storageBucket };
};

const integrations = {
  Core: {
    InvokeLLM: async (payload) => {
      const { data, error } = await supabase.functions.invoke('invoke-llm', { body: payload });
      handleSupabaseError(error);
      return data;
    },
    SendEmail: async (payload) => {
      const { data, error } = await supabase.functions.invoke('send-email', { body: payload });
      handleSupabaseError(error);
      return data;
    },
    SendSMS: async (payload) => {
      const { data, error } = await supabase.functions.invoke('send-sms', { body: payload });
      handleSupabaseError(error);
      return data;
    },
    UploadFile: uploadFile,
    GenerateImage: async (payload) => {
      const { data, error } = await supabase.functions.invoke('generate-image', { body: payload });
      handleSupabaseError(error);
      return data;
    },
    ExtractDataFromUploadedFile: async (payload) => {
      const { data, error } = await supabase.functions.invoke('extract-data', { body: payload });
      handleSupabaseError(error);
      return data;
    }
  }
};

const appLogs = {
  logUserInApp: async (pageName) => {
    const authUser = await getAuthUser();
    if (!authUser?.email) return null;
    const { data, error } = await supabase.from('app_logs').insert({
      page_name: pageName,
      created_by: authUser.email,
      path: window.location.pathname
    });
    handleSupabaseError(error);
    return data;
  }
};

export const base44 = {
  auth,
  entities,
  functions,
  integrations,
  appLogs,
  asServiceRole: {
    entities
  }
};
