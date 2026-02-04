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
            taskId, 
            audioId, 
            trackId,
            type = 'separate_vocal' 
        } = await req.json();

        if (!taskId || !audioId || !trackId) {
            return Response.json({ 
                error: 'taskId, audioId, and trackId are required' 
            }, { status: 400 });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        const callbackUrl = `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/stemCallback`;

        const response = await fetch(`${SUNO_API_BASE}/vocal-removal/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                taskId,
                audioId,
                type,
                callBackUrl: callbackUrl,
            }),
        });

        const data = await response.json();

        if (data.code !== 200) {
            console.error('Suno API error:', data);
            return Response.json({ 
                error: data.msg || 'Vocal separation failed',
                details: data
            }, { status: 400 });
        }

        // Create StemSeparation record
        const separation = await base44.entities.StemSeparation.create({
            track_id: trackId,
            task_id: data.data.taskId,
            separation_type: type,
            status: 'pending',
        });

        return Response.json({
            success: true,
            taskId: data.data.taskId,
            separationId: separation.id,
        });

    } catch (error) {
        console.error('Error in separateVocals:', error);
        return Response.json({ 
            error: error.message || 'Failed to separate vocals'
        }, { status: 500 });
    }
});