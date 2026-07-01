export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token, x-accoustica-callback-secret, x-accoustica-signature',
};

const encoder = new TextEncoder();

export function jsonResponse(body: Record<string, unknown>, init: ResponseInit = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init.headers || {}),
    },
  });
}

export function getTaskId(value: any): string {
  return String(
    value?.taskId
    || value?.task_id
    || value?.data?.taskId
    || value?.data?.task_id
    || value?.data?.taskId
    || ''
  ).trim();
}

export function getCallbackBase(): string {
  const explicit = Deno.env.get('BASE44_FUNCTION_URL') || Deno.env.get('ACCOUSTICA_FUNCTION_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const appId = Deno.env.get('BASE44_APP_ID');
  if (appId) return `https://base44.app/api/apps/${appId}/functions`;
  return '';
}

export function withCallbackSecret(url: string): string {
  const secret = Deno.env.get('ACCOUSTICA_CALLBACK_SECRET') || Deno.env.get('SUNO_CALLBACK_SECRET');
  if (!secret || !url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(secret)}`;
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEquals(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
}

export async function verifyCallbackRequest(req: Request, rawBody: string): Promise<void> {
  const secret = Deno.env.get('ACCOUSTICA_CALLBACK_SECRET') || Deno.env.get('SUNO_CALLBACK_SECRET');
  if (!secret) {
    console.warn('ACCOUSTICA_CALLBACK_SECRET is not configured; callback signature validation is disabled.');
    return;
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token') || req.headers.get('x-accoustica-callback-secret') || req.headers.get('x-callback-secret') || '';
  if (token && safeEquals(token, secret)) return;

  const providedSig = (req.headers.get('x-accoustica-signature') || '').replace(/^sha256=/i, '').trim();
  if (providedSig) {
    const expectedSig = await hmacSha256Hex(secret, rawBody);
    if (safeEquals(providedSig, expectedSig)) return;
  }

  throw new Error('Invalid callback signature');
}

export function assertTextLength(label: string, value: unknown, max: number, required = false) {
  const text = String(value || '');
  if (required && !text.trim()) throw new Error(`${label} is required`);
  if (text.length > max) throw new Error(`${label} must be ${max} characters or less`);
}

export function normalizeModel(model: unknown, fallback = 'V5_5') {
  const requested = String(model || fallback).trim();
  const allowed = new Set(['V5', 'V5_0', 'V5_5', 'V4', 'V4_5', 'V4_TURBO', 'chinnaaudio/accoustica', 'chinnaaudio/accoustica-v5', 'chinnaaudio/accoustica-pro']);
  return allowed.has(requested) ? requested : fallback;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function requireAdmin(base44: any) {
  const user = await base44.auth.me();
  if (!user) throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  if (user.role !== 'admin') throw new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });
  return user;
}

async function getUserPlan(base44: any, user: any) {
  if (!user?.plan_id) return null;
  try {
    if (base44.entities?.Plan?.get) return await base44.entities.Plan.get(user.plan_id);
    const found = await base44.entities.Plan.filter({ id: user.plan_id });
    return found?.[0] || null;
  } catch {
    return null;
  }
}

export async function enforceGenerationPolicy(base44: any, user: any, options: { model?: string; feature?: string } = {}) {
  if (!user) throw new Error('Unauthorized');
  if (user.account_status === 'suspended' || user.status === 'suspended') throw new Error('Account is suspended');

  const plan = await getUserPlan(base44, user);
  const dailyLimit = Number(plan?.daily_limit ?? user.daily_limit ?? 3);
  const monthlyLimit = Number(plan?.monthly_limit ?? user.monthly_limit ?? 30);
  const concurrentLimit = Number(plan?.concurrent_jobs ?? user.concurrent_jobs ?? 1);

  const day = todayKey();
  const dailyUsage = user.last_usage_reset === day ? Number(user.daily_usage || 0) : 0;
  const monthlyUsage = Number(user.monthly_usage || 0);

  if (dailyLimit >= 0 && dailyUsage >= dailyLimit) throw new Error('Daily generation limit reached');
  if (monthlyLimit >= 0 && monthlyUsage >= monthlyLimit) throw new Error('Monthly generation limit reached');

  try {
    const active = await base44.entities.Track.filter({ created_by: user.email }, '-created_date', 100);
    const activeCount = (active || []).filter((track: any) => ['queued', 'generating'].includes(track.status)).length;
    if (concurrentLimit >= 0 && activeCount >= concurrentLimit) throw new Error('Concurrent generation limit reached');
  } catch (error) {
    console.warn('Concurrent generation check skipped:', error?.message || error);
  }

  const modelAccess = Array.isArray(plan?.model_access) ? plan.model_access : Array.isArray(user.model_access) ? user.model_access : null;
  if (modelAccess && options.model && !modelAccess.includes(options.model) && !modelAccess.includes('all')) {
    throw new Error(`Your plan does not include ${options.model}`);
  }

  return { plan, dailyUsage, monthlyUsage };
}

export async function incrementGenerationUsage(base44: any, user: any, trackCount = 1) {
  const day = todayKey();
  const dailyUsage = user.last_usage_reset === day ? Number(user.daily_usage || 0) : 0;
  try {
    await base44.auth.updateMe({
      daily_usage: dailyUsage + 1,
      last_usage_reset: day,
      monthly_usage: Number(user.monthly_usage || 0) + 1,
      total_tracks: Number(user.total_tracks || 0) + trackCount,
      last_active: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Usage increment failed:', error?.message || error);
  }
}

export async function createGenerationJob(base44: any, input: Record<string, unknown>) {
  try {
    if (!base44.entities?.GenerationJob?.create) return null;
    return await base44.entities.GenerationJob.create({
      ...input,
      status: input.status || 'queued',
      created_date: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('GenerationJob create skipped:', error?.message || error);
    return null;
  }
}

export async function findGenerationJob(base44: any, taskId: string) {
  try {
    const entity = base44.asServiceRole?.entities?.GenerationJob || base44.entities?.GenerationJob;
    if (!entity?.filter) return null;
    const jobs = await entity.filter({ task_id: taskId });
    return jobs?.[0] || null;
  } catch {
    return null;
  }
}

export async function assertTaskOwnership(base44: any, user: any, taskId: string) {
  const job = await findGenerationJob(base44, taskId);
  if (job && job.created_by && job.created_by !== user.email) throw new Error('Task does not belong to this user');

  const tracks = await base44.asServiceRole.entities.Track.filter({ task_id: taskId });
  if (!tracks || tracks.length === 0) return { job, tracks: [] };
  const unauthorized = tracks.some((track: any) => track.created_by && track.created_by !== user.email);
  if (unauthorized) throw new Error('Task does not belong to this user');
  return { job, tracks };
}
