import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            audioId, 
            prompt, 
            style, 
            title, 
            continueAt,
            defaultParamFlag = true,
            model = 'V4_5',
            negativeTags,
            vocalGender,
            styleWeight,
            weirdnessConstraint,
            audioWeight,
            personaId
        } = await req.json();

        if (!audioId) {
            return Response.json({ error: 'audioId is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        const body = {
            audioId,
            defaultParamFlag,
            model,
            callBackUrl: `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/sunoCallback`,
        };

        if (defaultParamFlag) {
            if (!prompt || !style || !title || continueAt === undefined) {
                return Response.json({ 
                    error: 'prompt, style, title, and continueAt are required when defaultParamFlag is true' 
                }, { status: 400 });
            }
            Object.assign(body, { prompt, style, title, continueAt });
        }

        if (negativeTags) body.negativeTags = negativeTags;
        if (vocalGender) body.vocalGender = vocalGender;
        if (styleWeight !== undefined) body.styleWeight = styleWeight;
        if (weirdnessConstraint !== undefined) body.weirdnessConstraint = weirdnessConstraint;
        if (audioWeight !== undefined) body.audioWeight = audioWeight;
        if (personaId) body.personaId = personaId;

        const response = await fetch(`${SUNO_API_BASE}/generate/extend`, {
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
                error: data.msg || 'Music extension failed',
                details: data
            }, { status: 400 });
        }

        return Response.json({
            success: true,
            taskId: data.data.taskId,
        });

    } catch (error) {
        console.error('Error in extendMusic:', error);
        return Response.json({ 
            error: error.message || 'Failed to extend music'
        }, { status: 500 });
    }
});