import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { content } = await req.json();

        if (!content) {
            return Response.json({ error: 'Content is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        const response = await fetch(`${SUNO_API_BASE}/style/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
        });

        const data = await response.json();

        if (data.code !== 200) {
            console.error('Suno API error:', data);
            return Response.json({ 
                error: data.msg || 'Style boost failed',
                details: data
            }, { status: 400 });
        }

        return Response.json({
            success: true,
            result: data.data.result,
            taskId: data.data.taskId,
        });

    } catch (error) {
        console.error('Error in boostMusicStyle:', error);
        return Response.json({ 
            error: error.message || 'Failed to boost style'
        }, { status: 500 });
    }
});