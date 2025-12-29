import { createClientFromRequest } from './_shared/supabaseClient.ts';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            uploadUrl,
            defaultParamFlag = true,
            instrumental = false,
            continueAt,
            model = 'V4_5',
            prompt,
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
            return Response.json({ error: 'uploadUrl is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        const callbackUrl = `${Deno.env.get('SUPABASE_FUNCTION_URL') || ''}/sunoCallback`;

        const body = {
            uploadUrl,
            defaultParamFlag,
            instrumental,
            model,
            callBackUrl: callbackUrl,
        };

        if (defaultParamFlag) {
            if (!style || !title || continueAt === undefined) {
                return Response.json({ 
                    error: 'style, title, and continueAt are required when defaultParamFlag is true' 
                }, { status: 400 });
            }
            body.style = style;
            body.title = title;
            body.continueAt = continueAt;
            if (!instrumental && prompt) {
                body.prompt = prompt;
            }
        } else {
            if (!prompt) {
                return Response.json({ error: 'prompt is required when defaultParamFlag is false' }, { status: 400 });
            }
            body.prompt = prompt;
        }

        if (negativeTags) body.negativeTags = negativeTags;
        if (vocalGender) body.vocalGender = vocalGender;
        if (styleWeight !== undefined) body.styleWeight = styleWeight;
        if (weirdnessConstraint !== undefined) body.weirdnessConstraint = weirdnessConstraint;
        if (audioWeight !== undefined) body.audioWeight = audioWeight;
        if (personaId) body.personaId = personaId;

        const response = await fetch(`${SUNO_API_BASE}/generate/upload-extend`, {
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
                error: data.msg || 'Upload and extend failed',
                details: data
            }, { status: 400 });
        }

        // Create track records
        const track1 = await base44.entities.Track.create({
            title: title || 'Extended Track',
            prompt: prompt || '',
            style: style || 'Extended',
            task_id: data.data.taskId,
            status: 'queued',
            is_instrumental: instrumental,
        });

        const track2 = await base44.entities.Track.create({
            title: title || 'Extended Track',
            prompt: prompt || '',
            style: style || 'Extended',
            task_id: data.data.taskId,
            status: 'queued',
            is_instrumental: instrumental,
        });

        return Response.json({
            success: true,
            taskId: data.data.taskId,
            trackIds: [track1.id, track2.id],
        });

    } catch (error) {
        console.error('Error in uploadAndExtendAudio:', error);
        return Response.json({ 
            error: error.message || 'Failed to upload and extend audio'
        }, { status: 500 });
    }
});