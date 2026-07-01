import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';
import {
  corsHeaders,
  jsonResponse,
  assertTextLength,
  normalizeModel,
  getCallbackBase,
  withCallbackSecret,
  enforceGenerationPolicy,
  incrementGenerationUsage,
  createGenerationJob,
} from '../_shared/security.ts';

const KIE_API_BASES = ['https://api.kie.ai/api/v1', 'https://kie.ai/suno-api', 'https://kie.ai'];
const SIMPLE_PROMPT_MAX = 495;
const STYLE_MAX = 995;
const LYRICS_MAX = 4995;

async function postWithFallback(apiKey: string, paths: string[], body: Record<string, unknown>) {
  let lastError: unknown = null;
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
        if (response.ok && data?.code === 200) return data;
        lastError = data;
      } catch (error) {
        lastError = error;
      }
    }
  }
  return lastError || { code: 500, msg: 'All KIE/Suno endpoints failed' };
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

    const apiKey = Deno.env.get('SUNO_API_KEY') || Deno.env.get('KIE_API_KEY');
    if (!apiKey) return jsonResponse({ error: 'SUNO_API_KEY is not configured' }, { status: 500 });

    const inferred = inferDefaults(style, prompt);
    const finalTitle = title.trim() || makeTitle(prompt || style || 'Untitled Track');
    const profile = await loadSoundProfile(base44, Boolean(body.hq), instrumental);
    const callbackBase = getCallbackBase();
    if (!callbackBase) return jsonResponse({ error: 'BASE44_FUNCTION_URL or BASE44_APP_ID is required for callbacks' }, { status: 500 });

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
    if (data.code !== 200) {
      console.error('Suno API error:', data);
      return jsonResponse({ error: data.msg || 'Music generation failed', details: data }, { status: 400 });
    }

    const taskId = data?.data?.taskId || data?.data?.task_id;
    if (!taskId) return jsonResponse({ error: 'Provider did not return taskId', details: data }, { status: 502 });

    const trackPayload = {
      title: finalTitle,
      prompt,
      style: customMode ? style : '',
      task_id: taskId,
      status: 'queued',
      is_instrumental: instrumental,
      model_version: finalModel,
      generation_settings: JSON.stringify({ customMode, negativeTags: finalNegativeTags || undefined, styleWeight: payload.styleWeight, weirdnessConstraint: payload.weirdnessConstraint }),
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
