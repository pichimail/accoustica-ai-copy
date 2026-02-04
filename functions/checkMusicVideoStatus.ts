import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { taskId } = await req.json();

        if (!taskId) {
            return Response.json({ error: 'taskId is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        const response = await fetch(
            `${SUNO_API_BASE}/mp4/record-info?taskId=${taskId}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            }
        );

        const data = await response.json();

        if (data.code !== 200) {
            return Response.json({ 
                error: data.msg || 'Failed to check status',
                details: data
            }, { status: 400 });
        }

        return Response.json({
            success: true,
            status: data.data.successFlag,
            videoUrl: data.data.response?.videoUrl,
            taskId: data.data.taskId,
        });

    } catch (error) {
        console.error('Error in checkMusicVideoStatus:', error);
        return Response.json({ 
            error: error.message || 'Failed to check video status'
        }, { status: 500 });
    }
});