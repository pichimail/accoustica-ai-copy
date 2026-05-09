import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

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
            taskId, 
            audioId, 
            trackId,
            audioUrl,
            separationType,
            type = separationType || 'separate_vocal'
        } = await req.json();

        if (!taskId || !audioId || !trackId) {
            return Response.json({ 
                error: audioUrl
                    ? 'Uploaded audio was saved, but this provider requires Suno taskId/audioId for stem separation. Generate or import a provider-backed track before separating stems.'
                    : 'taskId, audioId, and trackId are required'
            }, { status: 400, headers: corsHeaders });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
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
            }, { status: 400, headers: corsHeaders });
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
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Error in separateVocals:', error);
        return Response.json({ 
            error: error.message || 'Failed to separate vocals'
        }, { status: 500, headers: corsHeaders });
    }
});