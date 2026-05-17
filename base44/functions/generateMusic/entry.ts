import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

const STYLE_AVOID_MAP = [
    { match: /lo-?fi|ambient|soft|acoustic|folk|ballad|dreamy|ethereal/i, avoid: 'harsh distortion, aggressive metal, over-compressed drums, noisy clipping', weirdness: 42, styleWeight: 78 },
    { match: /cinematic|orchestral|epic|score/i, avoid: 'thin synths, weak percussion, low dynamic range, casual pop arrangement', weirdness: 56, styleWeight: 86 },
    { match: /trap|hip.?hop|drill|rap|bass/i, avoid: 'folk acoustic, orchestral waltz, thin bass, weak drums', weirdness: 62, styleWeight: 82 },
    { match: /edm|club|house|techno|electronic|dance/i, avoid: 'slow ballad, acoustic-only arrangement, weak kick, muddy low end', weirdness: 66, styleWeight: 84 },
    { match: /jazz|soul|r.?b|blues/i, avoid: 'robotic vocals, harsh EDM drops, metal guitars, sterile quantized groove', weirdness: 48, styleWeight: 80 },
    { match: /rock|punk|metal|gritty/i, avoid: 'thin guitars, lounge jazz, soft lullaby, weak chorus impact', weirdness: 58, styleWeight: 83 },
];

function clampNumber(value, min, max, fallback) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
}

function toApiWeight(value) {
    return Number((clampNumber(value, 0, 100, 50) / 100).toFixed(2));
}

function normalizeVocalGender(value) {
    if (!value || value === 'Auto') return undefined;
    const normalized = String(value).toLowerCase();
    if (normalized.startsWith('m')) return 'm';
    if (normalized.startsWith('f')) return 'f';
    return undefined;
}

function inferSettings(style = '', prompt = '') {
    const source = `${style} ${prompt}`;
    const matched = STYLE_AVOID_MAP.find(item => item.match.test(source));
    return matched || {
        avoid: 'low fidelity artifacts, off-key vocals, weak rhythm, muddy mix, abrupt transitions',
        weirdness: 50,
        styleWeight: 75,
    };
}

/**
 * Auto-select Suno model based on style/prompt content.
 * V5_5 is the default (most expressive). V5_0 is used for styles that
 * benefit from the older model's stability (classical, traditional, folk, lo-fi).
 */
function autoSelectModel(requestedModel: string, style = '', prompt = '') {
    // If caller explicitly sets a specific model other than auto/V5, respect it
    if (requestedModel && requestedModel !== 'V5' && requestedModel !== 'auto') {
        return requestedModel;
    }
    const source = `${style} ${prompt}`.toLowerCase();
    // V5_0 for traditional / classical / low-complexity styles
    const v5_0Patterns = /raaga|raga|hindustani|carnatic|classical|folk|acoustic|lo-?fi|devotional|bhairavi|darbari|kafi|telugu.*70s|vintage|retro.*classic|shamanic.*traditional|sufi/i;
    if (v5_0Patterns.test(source)) return 'V5_0';
    // Default to V5_5 for everything else (modern, expressive, EDM, pop, synthwave, etc.)
    return 'V5_5';
}

function makeTitle(input = 'Untitled Track') {
    const cleaned = input
        .replace(/\[[^\]]+\]/g, ' ')
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .trim()
        .split(/\s+/)
        .slice(0, 6)
        .join(' ');
    return (cleaned || 'Untitled Track').slice(0, 60);
}

Deno.serve(async (req) => {
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
            mode = 'simple',
            model = 'V5_5',
            prompt, 
            style = '', 
            title = '', 
            customMode = false,
            instrumental = false,
            vocalGender,
            weirdness,
            weirdnessConstraint,
            styleInfluence,
            styleWeight,
            negativeTags,
            personaId,
            selectedPersonaId,
        } = await req.json();

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
        }

        const resolvedCustomMode = customMode === true || mode === 'custom' || mode === 'advanced' || instrumental;
        const inferred = inferSettings(style, prompt);
        const finalTitle = title?.trim() || makeTitle(prompt || style || 'Untitled Track');
        const finalNegativeTags = negativeTags?.trim() || inferred.avoid;
        const finalWeirdness = clampNumber(
            weirdnessConstraint ?? weirdness,
            0,
            100,
            inferred.weirdness
        );
        const finalStyleWeight = clampNumber(
            styleWeight ?? styleInfluence,
            0,
            100,
            inferred.styleWeight
        );

        // Auto-select model: V5_5 by default, V5_0 for traditional/classical styles
        const finalModel = autoSelectModel(model, style, prompt);

        // Build API payload based on mode
        let resolvedPersonaId = personaId;
        let linkedBase44PersonaId: string | null = null;

        if (selectedPersonaId) {
            const selectedPersona = await base44.entities.Persona.get(selectedPersonaId);
            if (!selectedPersona) {
                return Response.json({ error: 'Selected persona not found' }, { status: 404, headers: corsHeaders });
            }
            if (selectedPersona.status !== 'ready') {
                return Response.json({ error: 'Selected persona is not ready yet' }, { status: 400, headers: corsHeaders });
            }
            if (!selectedPersona.persona_id) {
                return Response.json({ error: 'Selected persona has no external voice ID' }, { status: 400, headers: corsHeaders });
            }
            resolvedPersonaId = selectedPersona.persona_id;
            linkedBase44PersonaId = selectedPersona.id;
        }

        const payload = {
            customMode: resolvedCustomMode,
            instrumental: instrumental,
            model: finalModel,
            callBackUrl: `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/sunoCallback`,
        };

        if (!resolvedCustomMode) {
            // Simple mode: only prompt required
            if (!prompt || !prompt.trim()) {
                return Response.json({ error: 'Prompt is required' }, { status: 400, headers: corsHeaders });
            }
            payload.prompt = prompt;
        } else {
            // Custom mode per Kie/Suno: style is required, title can be synthesized by the app.
            if (!style || !style.trim()) {
                return Response.json({ error: 'Style is required for advanced/custom generation' }, { status: 400, headers: corsHeaders });
            }
            if (!instrumental && (!prompt || !prompt.trim())) {
                return Response.json({ error: 'Lyrics/prompt are required when vocals are enabled' }, { status: 400, headers: corsHeaders });
            }
            if (prompt?.trim()) payload.prompt = prompt;
            payload.style = style;
            payload.title = finalTitle;
            payload.negativeTags = finalNegativeTags;
            payload.weirdnessConstraint = toApiWeight(finalWeirdness);
            payload.styleWeight = toApiWeight(finalStyleWeight);
            
            // Add optional parameters
            const apiVocalGender = normalizeVocalGender(vocalGender);
            if (apiVocalGender) payload.vocalGender = apiVocalGender;
            if (resolvedPersonaId) payload.personaId = resolvedPersonaId;
        }

        // Call Suno API to generate music
        const response = await fetch(`${SUNO_API_BASE}/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.code !== 200) {
            console.error('Suno API error:', data);
            return Response.json({ 
                error: data.msg || 'Music generation failed',
                details: data
            }, { status: 400, headers: corsHeaders });
        }

        // Create Track records (Suno generates 2 by default)
        const trackPromises = [];

        for (let i = 0; i < 2; i++) {
            trackPromises.push(
                base44.entities.Track.create({
                    title: `${finalTitle}`,
                    prompt: prompt || '',
                    style: resolvedCustomMode ? style : '',
                    task_id: data.data.taskId,
                    status: 'queued',
                    is_instrumental: instrumental,
                    model_version: finalModel,
                    generation_settings: JSON.stringify({
                        customMode: resolvedCustomMode,
                        negativeTags: resolvedCustomMode ? finalNegativeTags : undefined,
                        weirdnessConstraint: resolvedCustomMode ? finalWeirdness : undefined,
                        styleWeight: resolvedCustomMode ? finalStyleWeight : undefined,
                    }),
                    persona_id: linkedBase44PersonaId || undefined,
                })
            );
        }

        const tracks = await Promise.all(trackPromises);

        return Response.json({
            success: true,
            taskId: data.data.taskId,
            trackIds: tracks.map(t => t.id),
            track_count: tracks.length,
            appliedDefaults: resolvedCustomMode ? {
                title: finalTitle,
                negativeTags: finalNegativeTags,
                weirdnessConstraint: finalWeirdness,
                styleWeight: finalStyleWeight,
            } : undefined,
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Error in generateMusic:', error);
        return Response.json({ 
            error: error.message || 'Failed to generate music'
        }, { status: 500, headers: corsHeaders });
    }
});
