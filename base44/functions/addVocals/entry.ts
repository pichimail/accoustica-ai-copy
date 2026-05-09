import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
            title,
            negativeTags,
            style,
            model = 'V4_5PLUS',
            vocalGender,
            styleWeight,
            weirdnessConstraint,
            audioWeight
        } = await req.json();

        if (!uploadUrl || !prompt || !title || !negativeTags || !style) {
            return Response.json({ 
                error: 'uploadUrl, prompt, title, negativeTags, and style are required' 
            }, { status: 400 });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        const body = {
            uploadUrl,
            prompt,
            title,
            negativeTags,
            style,
            model,
            callBackUrl: `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/sunoCallback`,
        };

        if (vocalGender) body.vocalGender = vocalGender;
        if (styleWeight !== undefined) body.styleWeight = styleWeight;
        if (weirdnessConstraint !== undefined) body.weirdnessConstraint = weirdnessConstraint;
        if (audioWeight !== undefined) body.audioWeight = audioWeight;

        const response = await fetch(`${SUNO_API_BASE}/generate/add-vocals`, {
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
                error: data.msg || 'Add vocals failed',
                details: data
            }, { status: 400 });
        }

        return Response.json({
            success: true,
            taskId: data.data.taskId,
        });

    } catch (error) {
        console.error('Error in addVocals:', error);
        return Response.json({ 
            error: error.message || 'Failed to add vocals'
        }, { status: 500 });
    }
});