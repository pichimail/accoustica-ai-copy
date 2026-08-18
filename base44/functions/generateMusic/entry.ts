import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';

// ─── Inlined shared utilities (backend functions deploy independently) ───────
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token, x-accoustica-callback-secret, x-accoustica-signature',
};

function jsonResponse(body: Record<string, unknown>, init: ResponseInit = {}): Response {
  return Response.json(body, { ...init, headers: { ...corsHeaders, ...(init.headers || {}) } });
}

function assertTextLength(label: string, value: unknown, max: number, required = false) {
  const text = String(value || '');
  if (required && !text.trim()) throw new Error(`${label} is required`);
  if (text.length > max) throw new Error(`${label} must be ${max} characters or less`);
}

function normalizeModel(model: unknown, fallback = 'V5_5'): string {
  const requested = String(model || fallback).trim();
  const allowed = new Set(['V5', 'V5_0', 'V5_5', 'V4', 'V4_5', 'V4_TURBO']);
  return allowed.has(requested) ? requested : fallback;
}

function getCallbackBase(): string {
  const explicit = Deno.env.get('BASE44_FUNCTION_URL') || Deno.env.get('ACCOUSTICA_FUNCTION_URL') || Deno.env.get('BASE_URL') || Deno.env.get('BASE44_APP_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const appId = Deno.env.get('BASE44_APP_ID');
  if (appId) return `https://base44.app/api/apps/${appId}/functions`;
  return '';
}

function withCallbackSecret(url: string): string {
  const secret = Deno.env.get('ACCOUSTICA_CALLBACK_SECRET') || Deno.env.get('SUNO_CALLBACK_SECRET');
  if (!secret || !url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(secret)}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getUserPlan(base44: any, user: any) {
  if (!user?.plan_id) return null;
  try {
    if (base44.entities?.Plan?.get) return await base44.entities.Plan.get(user.plan_id);
    const found = await base44.entities.Plan.filter({ id: user.plan_id });
    return found?.[0] || null;
  } catch { return null; }
}

async function enforceGenerationPolicy(base44: any, user: any, options: { model?: string; feature?: string } = {}) {
  if (!user) throw { status: 401, message: 'Unauthorized' };
  if (user.account_status === 'suspended' || user.status === 'suspended') throw { status: 403, message: 'Account is suspended' };
  const plan = await getUserPlan(base44, user);
  const dailyLimit = Number(plan?.daily_limit ?? user.daily_limit ?? 3);
  const monthlyLimit = Number(plan?.monthly_limit ?? user.monthly_limit ?? 30);
  const concurrentLimit = Number(plan?.concurrent_jobs ?? user.concurrent_jobs ?? 1);
  const day = todayKey();
  const dailyUsage = user.last_usage_reset === day ? Number(user.daily_usage || 0) : 0;
  const monthlyUsage = Number(user.monthly_usage || 0);
  if (dailyLimit >= 0 && dailyUsage >= dailyLimit) throw { status: 429, message: 'Daily generation limit reached' };
  if (monthlyLimit >= 0 && monthlyUsage >= monthlyLimit) throw { status: 429, message: 'Monthly generation limit reached' };
  try {
    const active = await base44.entities.Track.filter({ created_by: user.email }, '-created_date', 100);
    const activeCount = (active || []).filter((track: any) => ['queued', 'generating'].includes(track.status)).length;
    if (concurrentLimit >= 0 && activeCount >= concurrentLimit) throw { status: 429, message: 'Concurrent generation limit reached' };
  } catch (error) {
    console.warn('Concurrent generation check skipped:', error?.message || error);
  }
  const modelAccess = Array.isArray(plan?.model_access) ? plan.model_access : Array.isArray(user.model_access) ? user.model_access : null;
  if (modelAccess && options.model && !modelAccess.includes(options.model) && !modelAccess.includes('all')) {
    throw { status: 403, message: `Your plan does not include ${options.model}` };
  }
  return { plan, dailyUsage, monthlyUsage };
}

async function incrementGenerationUsage(base44: any, user: any, trackCount = 1) {
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

async function createGenerationJob(base44: any, input: Record<string, unknown>) {
  try {
    if (!base44.entities?.GenerationJob?.create) return null;
    return await base44.entities.GenerationJob.create({ ...input, status: input.status || 'queued', created_date: new Date().toISOString() });
  } catch (error) {
    console.warn('GenerationJob create skipped:', error?.message || error);
    return null;
  }
}

// ─── Generation logic ────────────────────────────────────────────────────────
const KIE_API_BASES = ['https://api.kie.ai/api/v1', 'https://kie.ai/suno-api', 'https://kie.ai'];
const SIMPLE_PROMPT_MAX = 495;
const STYLE_MAX = 995;
const LYRICS_MAX = 4995;

async function postWithFallback(apiKey: string, paths: string[], body: Record<string, unknown>) {
  let lastError: unknown = null;
  let lastErrorMsg = '';
  for (const base of KIE_API_BASES) {
    for (const rawPath of paths) {
      const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      try {
        const response = await fetch(`${base}${path}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        // Accept success if: HTTP ok AND (code===200 OR a taskId is present in any common location)
        const taskId = data?.data?.taskId || data?.data?.task_id || data?.taskId || data?.task_id;
        if (response.ok && (data?.code === 200 || taskId)) return data;
        lastErrorMsg = data?.msg || data?.message || `HTTP ${response.status}`;
        lastError = data;
      } catch (error) {
        lastErrorMsg = error?.message || String(error);
        lastError = error;
      }
    }
  }
  return lastError || { code: 500, msg: lastErrorMsg || 'All KIE/Suno endpoints failed' };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function toApiWeight(value: unknown) {
  return Number((clampNumber(value, 0, 100, 50) / 100).toFixed(2));
}

function normalizeVocalGender(value: unknown) {
  if (!value || value === 'Auto') return undefined;
  const normalized = String(value).toLowerCase();
  if (normalized.startsWith('m')) return 'm';
  if (normalized.startsWith('f')) return 'f';
  return undefined;
}

function makeTitle(input = 'Untitled Track') {
  const cleaned = input.replace(/\[[^\]]+\]/g, ' ').replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim().split(/\s+/).slice(0, 6).join(' ');
  return (cleaned || 'Untitled Track').slice(0, 60);
}

function inferDefaults(style = '', prompt = '') {
  const source = `${style} ${prompt}`;
  if (/lo-?fi|ambient|soft|acoustic|folk|ballad|dreamy|ethereal/i.test(source)) return { avoid: 'harsh distortion, aggressive metal, over-compressed drums, noisy clipping', weirdness: 42, styleWeight: 78 };
  if (/cinematic|orchestral|epic|score/i.test(source)) return { avoid: 'thin synths, weak percussion, low dynamic range, casual pop arrangement', weirdness: 56, styleWeight: 86 };
  if (/trap|hip.?hop|drill|rap|bass/i.test(source)) return { avoid: 'folk acoustic, orchestral waltz, thin bass, weak drums', weirdness: 62, styleWeight: 82 };
  if (/edm|club|house|techno|electronic|dance/i.test(source)) return { avoid: 'slow ballad, acoustic-only arrangement, weak kick, muddy low end', weirdness: 66, styleWeight: 84 };
  return { avoid: 'low fidelity artifacts, off-key vocals, weak rhythm, muddy mix, abrupt transitions', weirdness: 50, styleWeight: 75 };
}

function autoSelectModel(requestedModel: string, style = '', prompt = '') {
  const requested = normalizeModel(requestedModel, 'V5_5');
  if (requested && requested !== 'V5') return requested;
  const source = `${style} ${prompt}`.toLowerCase();
  if (/raaga|raga|hindustani|carnatic|classical|folk|acoustic|lo-?fi|devotional|bhairavi|darbari|kafi|telugu.*70s|vintage|sufi/i.test(source)) return 'V5_0';
  return 'V5_5';
}

async function loadSoundProfile(base44: any, hq: boolean, instrumental: boolean) {
  const directives: string[] = [];
  const avoidTags: string[] = [];
  try {
    const profiles = await base44.asServiceRole.entities.SoundProfile.filter({ scope: 'global' });
    const profile = profiles?.[0];
    if (profile && profile.is_active !== false) {
      if (profile.drum_style && profile.drum_intensity !== 'remove') directives.push(profile.drum_style);
      if (profile.guitar_style && profile.guitar_intensity !== 'remove') directives.push(profile.guitar_style);
      if (hq) {
        if (!instrumental && profile.hq_vocal_instructions) directives.push(profile.hq_vocal_instructions);
        if (profile.hq_music_instructions) directives.push(profile.hq_music_instructions);
      }
      if (profile.global_avoid_tags) profile.global_avoid_tags.split(',').map((t: string) => t.trim()).filter(Boolean).forEach((tag: string) => avoidTags.push(tag));
    }
  } catch (error) {
    console.warn('SoundProfile load skipped:', error?.message || error);
  }
  return { directives, avoidTags };
}

function appendDirectives(base = '', directives: string[] = []) {
  if (!directives.length) return base;
  return base?.trim() ? `${base.trim()}, ${directives.join(', ')}` : directives.join(', ');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const mode = body.mode || 'simple';
    const prompt = String(body.prompt || '');
    const style = String(body.style || '');
    const title = String(body.title || '');
    const instrumental = Boolean(body.instrumental);
    const customMode = body.customMode === true || mode === 'custom' || mode === 'advanced' || instrumental;

    if (!customMode) assertTextLength('Prompt', prompt, SIMPLE_PROMPT_MAX, true);
    if (customMode) {
      assertTextLength('Style', style, STYLE_MAX, true);
      if (!instrumental) assertTextLength('Lyrics/prompt', prompt, LYRICS_MAX, true);
      else assertTextLength('Instrumental structure prompt', prompt, LYRICS_MAX, false);
    }

    const finalModel = autoSelectModel(String(body.model || 'V5_5'), style, prompt);
    await enforceGenerationPolicy(base44, user, { model: finalModel, feature: customMode ? 'advanced_generation' : 'generation' });

    const apiKey = Deno.env.get('KIE_API_KEY') || Deno.env.get('SUNO_API_KEY');
    if (!apiKey) return jsonResponse({ error: 'KIE_API_KEY / SUNO_API_KEY is not configured' }, { status: 500 });

    const inferred = inferDefaults(style, prompt);
    const finalTitle = title.trim() || makeTitle(prompt || style || 'Untitled Track');
    const profile = await loadSoundProfile(base44, Boolean(body.hq), instrumental);
    const callbackBase = getCallbackBase();
    if (!callbackBase) return jsonResponse({ error: 'BASE_URL / BASE44_APP_URL / BASE44_APP_ID is required for callbacks' }, { status: 500 });

    const payload: Record<string, unknown> = {
      customMode,
      instrumental,
      model: finalModel,
      callBackUrl: withCallbackSecret(`${callbackBase}/sunoCallback`),
    };

    let finalNegativeTags = '';
    if (!customMode) {
      payload.prompt = appendDirectives(prompt, profile.directives);
    } else {
      finalNegativeTags = [String(body.negativeTags || inferred.avoid), ...profile.avoidTags].filter(Boolean).join(', ');
      if (prompt.trim()) payload.prompt = prompt;
      payload.style = appendDirectives(style, profile.directives);
      payload.title = finalTitle;
      payload.negativeTags = finalNegativeTags;
      payload.weirdnessConstraint = toApiWeight(body.weirdnessConstraint ?? body.weirdness ?? inferred.weirdness);
      payload.styleWeight = toApiWeight(body.styleWeight ?? body.styleInfluence ?? inferred.styleWeight);
      const apiVocalGender = normalizeVocalGender(body.vocalGender);
      if (apiVocalGender) payload.vocalGender = apiVocalGender;
      if (body.personaId) payload.personaId = body.personaId;
    }

    const data = await postWithFallback(apiKey, ['/generate-music', '/generate'], payload);
    const taskId = data?.data?.taskId || data?.data?.task_id || data?.taskId || data?.task_id;
    if (!taskId) {
      console.error('Suno API error:', JSON.stringify(data));
      const errMsg = data?.msg || data?.message || 'Music generation failed — provider did not return a task ID';
      return jsonResponse({ error: errMsg, details: data }, { status: 400 });
    }

    const trackPayload = {
      title: finalTitle,
      prompt,
      style: customMode ? style : '',
      task_id: taskId,
      status: 'queued',
      is_instrumental: instrumental,
      model_version: finalModel,
      persona_id: body.personaId || undefined,
    };

    const tracks = await Promise.all([0, 1].map(() => base44.entities.Track.create(trackPayload)));
    await createGenerationJob(base44, { task_id: taskId, track_ids: tracks.map((track: any) => track.id), provider: 'kie_suno', status: 'queued', model: finalModel });
    await incrementGenerationUsage(base44, user, tracks.length);

    return jsonResponse({ success: true, taskId, task_id: taskId, trackIds: tracks.map((track: any) => track.id), track_count: tracks.length });
  } catch (error) {
    console.error('Error in generateMusic:', error);
    return jsonResponse({ error: error.message || 'Failed to generate music' }, { status: error.status || 500 });
  }
});