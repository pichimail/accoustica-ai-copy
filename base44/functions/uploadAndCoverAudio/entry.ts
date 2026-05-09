import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

function toApiWeight(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return undefined;
    return Number((Math.max(0, Math.min(100, num)) / 100).toFixed(2));
}

function normalizeVocalGender(value) {
    if (!value || value === 'Auto') return undefined;
    const normalized = String(value).toLowerCase();
    if (normalized.startsWith('m')) return 'm';
    if (normalized.startsWith('f')) return 'f';
    return undefined;
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
            uploadUrl,
            prompt,
            customMode = true,
            instrumental = false,
            model = 'V4_5',
            style,
            title,
            negativeTags,
            vocalGender,
            styleWeight,
            weirdnessConstraint,
            audioWeight,
            personaId
        } = await req.json();

        if (!uploadUrl) {
            return Response.json({ error: 'uploadUrl is required' }, { status: 400, headers: corsHeaders });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
        }

        const finalTitle = title?.trim() || (prompt || style || 'Remixed Track').trim().split(/\s+/).slice(0, 6).join(' ');

        // Get callback URL from environment or construct it
        const callbackUrl = `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/sunoCallback`;

        const body = {
            uploadUrl,
            prompt,
            customMode,
            instrumental,
            model,
            callBackUrl: callbackUrl,
        };

        if (customMode) {
            if (!style) {
                return Response.json({ 
                    error: 'style is required in customMode' 
                }, { status: 400, headers: corsHeaders });
            }
            body.style = style;
            body.title = finalTitle;
        }

        if (negativeTags) body.negativeTags = negativeTags;
        const apiVocalGender = normalizeVocalGender(vocalGender);
        if (apiVocalGender) body.vocalGender = apiVocalGender;
        if (styleWeight !== undefined) body.styleWeight = toApiWeight(styleWeight);
        if (weirdnessConstraint !== undefined) body.weirdnessConstraint = toApiWeight(weirdnessConstraint);
        if (audioWeight !== undefined) body.audioWeight = toApiWeight(audioWeight);
        if (personaId) body.personaId = personaId;

        const response = await fetch(`${SUNO_API_BASE}/generate/upload-cover`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (data.code !== 200) {
            console.error('Suno API error:', data);
            return Response.json({ 
                error: data.msg || 'Upload and cover failed',
                details: data
            }, { status: 400, headers: corsHeaders });
        }

        // Create track records
        const track1 = await base44.entities.Track.create({
            title: finalTitle || 'Covered Track',
            prompt: prompt,
            style: style || 'Cover',
            task_id: data.data.taskId,
            status: 'queued',
            is_instrumental: instrumental,
        });

        const track2 = await base44.entities.Track.create({
            title: finalTitle || 'Covered Track',
            prompt: prompt,
            style: style || 'Cover',
            task_id: data.data.taskId,
            status: 'queued',
            is_instrumental: instrumental,
        });

        return Response.json({
            success: true,
            taskId: data.data.taskId,
            trackIds: [track1.id, track2.id],
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Error in uploadAndCoverAudio:', error);
        return Response.json({ 
            error: error.message || 'Failed to upload and cover audio'
        }, { status: 500, headers: corsHeaders });
    }
});
