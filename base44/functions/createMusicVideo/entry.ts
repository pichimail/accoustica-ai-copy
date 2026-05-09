import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { taskId, audioId, author, domainName } = await req.json();

        if (!taskId || !audioId) {
            return Response.json({ error: 'taskId and audioId are required' }, { status: 400 });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        const body = {
            taskId,
            audioId,
            callBackUrl: `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/videoCallback`,
        };

        if (author) body.author = author;
        if (domainName) body.domainName = domainName;

        const response = await fetch(`${SUNO_API_BASE}/mp4/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (data.code !== 200 && data.code !== 0) {
            console.error('Suno API error:', data);
            return Response.json({ 
                error: data.msg || 'Music video creation failed',
                details: data
            }, { status: 400 });
        }

        return Response.json({
            success: true,
            taskId: data.data.taskId,
        });

    } catch (error) {
        console.error('Error in createMusicVideo:', error);
        return Response.json({ 
            error: error.message || 'Failed to create music video'
        }, { status: 500 });
    }
});