import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

// Style-based inference for optimal mashup params
const STYLE_INFER_MAP = [
  { match: /lo-?fi|ambient|soft|acoustic|folk|ballad|dreamy|ethereal/i,  weirdness: 42, styleWeight: 78, audioWeight: 0.62 },
  { match: /cinematic|orchestral|epic|score/i,                            weirdness: 56, styleWeight: 86, audioWeight: 0.70 },
  { match: /trap|hip.?hop|drill|rap|bass/i,                               weirdness: 62, styleWeight: 82, audioWeight: 0.68 },
  { match: /edm|club|house|techno|electronic|dance/i,                     weirdness: 66, styleWeight: 84, audioWeight: 0.65 },
  { match: /jazz|soul|r.?b|blues/i,                                       weirdness: 48, styleWeight: 80, audioWeight: 0.60 },
  { match: /rock|punk|metal|gritty/i,                                     weirdness: 58, styleWeight: 83, audioWeight: 0.63 },
];

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/** Convert a 0–100 percentage to a 0–1 two-decimal API weight */
function toApiWeight(value: number): number {
  return Number((clamp(value, 0, 100, 50) / 100).toFixed(2));
}

/** Accept both 0–1 and 0–100 inputs and normalise to 0–1 */
function normaliseRawWeight(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const normalised = num > 1 ? num / 100 : num;
  return Number(Math.max(0, Math.min(1, normalised)).toFixed(2));
}

function normaliseVocalGender(value: unknown): 'm' | 'f' | undefined {
  if (!value || value === 'Auto') return undefined;
  const v = String(value).toLowerCase();
  if (v.startsWith('m')) return 'm';
  if (v.startsWith('f')) return 'f';
  return undefined;
}

function inferStyle(style = '', prompt = '') {
  const src = `${style} ${prompt}`;
  return STYLE_INFER_MAP.find(r => r.match.test(src)) ?? {
    weirdness: 50,
    styleWeight: 75,
    audioWeight: 0.65,
  };
}

function makeTitle(input = 'Mashup'): string {
  const cleaned = (input || 'Mashup')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(' ');
  return (cleaned || 'Mashup').slice(0, 80);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const {
      trackIds = [],
      audioUrls = [],
      prompt = '',
      style = '',
      title = '',
      model = 'V5',
      instrumental = false,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight,       // 0–1 or 0–100; controls audio feature blend in the mashup
    } = await req.json();

    // ── Resolve the two source audio URLs ──────────────────────────────────────
    // Prefer audio_url (direct file link) over stream_audio_url (may be a
    // short-lived CDN stream that the KIE API cannot download).
    let resolvedUrls: string[] = (audioUrls as string[]).filter(Boolean).slice(0, 2);
    let sourceTracks: Array<{ title?: string; audio_url?: string; stream_audio_url?: string } | undefined> = [];

    if (resolvedUrls.length < 2 && (trackIds as string[]).length >= 2) {
      sourceTracks = await Promise.all(
        (trackIds as string[]).slice(0, 2).map(async (id: string) => {
          const found = await base44.entities.Track.filter({ id });
          return found[0];
        })
      );
      resolvedUrls = sourceTracks
        .map(track => track?.audio_url || track?.stream_audio_url)
        .filter((u): u is string => Boolean(u))
        .slice(0, 2);
    }

    if (resolvedUrls.length !== 2) {
      return Response.json({
        error: 'Mashup requires exactly two source tracks with publicly accessible audio URLs. ' +
               'Make sure both selected tracks have finished generating before creating a mashup.',
      }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('SUNO_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    // ── Mode decision ──────────────────────────────────────────────────────────
    // Use customMode when style is provided; this unlocks title, styleWeight,
    // weirdnessConstraint, audioWeight, and vocalGender.
    const customMode = Boolean((style as string)?.trim());

    const inferred = inferStyle(style as string, prompt as string);

    const fallbackTitle =
      (title as string)?.trim() ||
      (sourceTracks.length >= 2
        ? `Mashup: ${sourceTracks.map(t => t?.title).filter(Boolean).join(' x ')}`
        : makeTitle((prompt as string) || (style as string) || 'Mashup'));

    const finalTitle = makeTitle(fallbackTitle);

    const callbackBase = Deno.env.get('BASE44_FUNCTION_URL') || '';

    // ── Build request body per KIE API spec ───────────────────────────────────
    // Ref: https://docs.kie.ai/suno-api/generate-mashup
    const body: Record<string, unknown> = {
      uploadUrlList: resolvedUrls,        // exactly 2 public audio URLs — required
      customMode,                          // required boolean
      instrumental: Boolean(instrumental), // whether to generate instrumental audio
      model,
      callBackUrl: `${callbackBase}/sunoCallback`,
    };

    if (!customMode) {
      // Non-custom mode: only prompt is accepted (max 500 chars).
      // Do NOT include style, title, or weight params — API will reject them.
      const nonCustomPrompt = String(prompt || '').trim().slice(0, 500);
      if (!nonCustomPrompt) {
        return Response.json(
          { error: 'A prompt is required to describe the desired mashup.' },
          { status: 400, headers: corsHeaders }
        );
      }
      body.prompt = nonCustomPrompt;
    } else {
      // Custom mode: style + title are required; prompt required if vocal.
      if (!instrumental && !String(prompt || '').trim()) {
        return Response.json(
          { error: 'Prompt/lyrics are required in custom mode when vocals are enabled.' },
          { status: 400, headers: corsHeaders }
        );
      }

      body.style = String(style).slice(0, 1000);  // required in customMode
      body.title = finalTitle;                      // required in customMode (max 80)

      const promptStr = String(prompt || '').trim();
      if (promptStr) {
        body.prompt = promptStr.slice(0, 5000);
      }

      // ── Optional weighted params (0–1 range) ─────────────────────────────
      // styleWeight: how closely the model sticks to the style tag
      const finalStyleWeight = styleWeight != null
        ? toApiWeight(clamp(styleWeight, 0, 100, inferred.styleWeight))
        : toApiWeight(inferred.styleWeight);
      body.styleWeight = finalStyleWeight;

      // weirdnessConstraint: creative deviation / experimental level
      const finalWeirdness = weirdnessConstraint != null
        ? toApiWeight(clamp(weirdnessConstraint, 0, 100, inferred.weirdness))
        : toApiWeight(inferred.weirdness);
      body.weirdnessConstraint = finalWeirdness;

      // audioWeight: blend weight of audio features from the source files.
      // Accepts 0–1 or 0–100 from the frontend; normalised to 0–1 for the API.
      const finalAudioWeight = audioWeight != null
        ? normaliseRawWeight(audioWeight, inferred.audioWeight)
        : inferred.audioWeight;
      body.audioWeight = finalAudioWeight;

      const vg = normaliseVocalGender(vocalGender);
      if (vg) body.vocalGender = vg;
    }

    console.log('Mashup API request body:', JSON.stringify({
      ...body,
      uploadUrlList: resolvedUrls.map(u => u.substring(0, 60) + '…'), // truncate for log safety
    }));

    // ── Call KIE Mashup API ────────────────────────────────────────────────────
    const response = await fetch(`${SUNO_API_BASE}/generate/mashup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const apiData = await response.json();
    console.log('KIE mashup response:', JSON.stringify(apiData));

    if (apiData.code !== 200) {
      console.error('KIE mashup error:', apiData);
      return Response.json({
        error: apiData.msg || 'Mashup generation failed',
        details: apiData,
      }, { status: 400, headers: corsHeaders });
    }

    // ── Create placeholder Track records ─────────────────────────────────────
    // The mashup API generates up to 2 variations; create 2 records that the
    // sunoCallback will populate when the task completes.
    const trackRecords = await Promise.all(
      [0, 1].map(() =>
        base44.entities.Track.create({
          title: finalTitle,
          prompt: String(prompt || ''),
          style: customMode ? String(style) : '',
          task_id: apiData.data.taskId,
          status: 'queued',
          is_instrumental: Boolean(instrumental),
          model_version: model,
          generation_settings: JSON.stringify({
            mode: 'mashup',
            customMode,
            sourceTrackIds: (trackIds as string[]).slice(0, 2),
            sourceAudioUrls: resolvedUrls,
            ...(customMode && {
              styleWeight: body.styleWeight,
              weirdnessConstraint: body.weirdnessConstraint,
              audioWeight: body.audioWeight,
            }),
          }),
        })
      )
    );

    return Response.json({
      success: true,
      taskId: apiData.data.taskId,
      trackIds: trackRecords.map(t => t.id),
      track_count: trackRecords.length,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in generateMashup:', error);
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to generate mashup',
    }, { status: 500, headers: corsHeaders });
  }
});
