import { createClient } from '@supabase/supabase-js';

const getEnv = (key, fallbacks = []) => {
  const keys = [key, ...fallbacks];
  for (const name of keys) {
    const value = process.env[name];
    if (value) return value;
  }
  return '';
};

const SUPABASE_URL = getEnv('SUPABASE_URL', ['VITE_SUPABASE_URL']);
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');
const DEFAULT_ADMIN_EMAIL = getEnv('DEFAULT_ADMIN_EMAIL', ['VITE_DEFAULT_ADMIN_EMAIL']);
const DEFAULT_ADMIN_PASSWORD = getEnv('DEFAULT_ADMIN_PASSWORD', ['VITE_DEFAULT_ADMIN_PASSWORD']);
const DEFAULT_ADMIN_NAME = getEnv('DEFAULT_ADMIN_NAME', ['VITE_DEFAULT_ADMIN_NAME']) || 'Admin';

const missing = [];
if (!SUPABASE_URL) missing.push('SUPABASE_URL (or VITE_SUPABASE_URL)');
if (!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (!DEFAULT_ADMIN_EMAIL) missing.push('DEFAULT_ADMIN_EMAIL (or VITE_DEFAULT_ADMIN_EMAIL)');
if (!DEFAULT_ADMIN_PASSWORD) missing.push('DEFAULT_ADMIN_PASSWORD (or VITE_DEFAULT_ADMIN_PASSWORD)');

if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const findUserByEmail = async (email) => {
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
};

const ensureAdminUser = async () => {
  let userId = null;
  let wasCreated = false;
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: DEFAULT_ADMIN_NAME }
  });

  if (createError) {
    const message = createError.message?.toLowerCase() || '';
    if (!message.includes('already') && createError.status !== 422) {
      throw createError;
    }
    const existing = await findUserByEmail(DEFAULT_ADMIN_EMAIL);
    if (!existing) {
      throw new Error('Admin user exists but could not be found.');
    }
    userId = existing.id;
  } else {
    userId = created?.user?.id || null;
    wasCreated = true;
  }

  if (!userId) {
    throw new Error('Unable to resolve admin user id.');
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: DEFAULT_ADMIN_EMAIL,
      full_name: DEFAULT_ADMIN_NAME,
      role: 'admin',
      updated_date: now,
      created_date: now
    }, { onConflict: 'id' });

  if (upsertError) throw upsertError;

  return { userId, wasCreated };
};

try {
  const result = await ensureAdminUser();
  console.log(
    `Admin user ${result.wasCreated ? 'created' : 'updated'}: ${DEFAULT_ADMIN_EMAIL}`
  );
} catch (error) {
  console.error('Failed to create admin user:', error.message || error);
  process.exit(1);
}
