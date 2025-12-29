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
            return Response.json({ error: 'uploadUrl is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        // Get callback URL from environment or construct it
        const callbackUrl = `${Deno.env.get('SUPABASE_FUNCTION_URL') || ''}/sunoCallback`;

        const body = {
            uploadUrl,
            prompt,
            customMode,
            instrumental,
            model,
            callBackUrl: callbackUrl,
        };

        if (customMode) {
            if (!style || !title) {
                return Response.json({ 
                    error: 'style and title are required in customMode' 
                }, { status: 400 });
            }
            body.style = style;
            body.title = title;
        }

        if (negativeTags) body.negativeTags = negativeTags;
        if (vocalGender) body.vocalGender = vocalGender;
        if (styleWeight !== undefined) body.styleWeight = styleWeight;
        if (weirdnessConstraint !== undefined) body.weirdnessConstraint = weirdnessConstraint;
        if (audioWeight !== undefined) body.audioWeight = audioWeight;
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
            }, { status: 400 });
        }

        // Create track records
        const track1 = await base44.entities.Track.create({
            title: title || 'Covered Track',
            prompt: prompt,
            style: style || 'Cover',
            task_id: data.data.taskId,
            status: 'queued',
            is_instrumental: instrumental,
        });

        const track2 = await base44.entities.Track.create({
            title: title || 'Covered Track',
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
        });

    } catch (error) {
        console.error('Error in uploadAndCoverAudio:', error);
        return Response.json({ 
            error: error.message || 'Failed to upload and cover audio'
        }, { status: 500 });
    }
});