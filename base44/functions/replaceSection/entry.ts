import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
            prompt,
            tags,
            title,
            infillStartS,
            infillEndS,
            negativeTags,
            fullLyrics
        } = await req.json();

        if (!taskId || !audioId || !prompt || !tags || !title || infillStartS === undefined || infillEndS === undefined) {
            return Response.json({ 
                error: 'taskId, audioId, prompt, tags, title, infillStartS, and infillEndS are required' 
            }, { status: 400, headers: corsHeaders });
        }

        if (infillStartS >= infillEndS) {
            return Response.json({ 
                error: 'infillStartS must be less than infillEndS' 
            }, { status: 400, headers: corsHeaders });
        }

        const duration = infillEndS - infillStartS;
        if (duration < 6 || duration > 60) {
            return Response.json({ 
                error: 'Replacement duration must be between 6 and 60 seconds' 
            }, { status: 400, headers: corsHeaders });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
        }

        const body = {
            taskId,
            audioId,
            prompt,
            tags,
            title,
            infillStartS,
            infillEndS,
            callBackUrl: `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/sunoCallback`,
        };

        if (negativeTags) body.negativeTags = negativeTags;
        if (fullLyrics) body.fullLyrics = fullLyrics;

        const response = await fetch(`${SUNO_API_BASE}/generate/replace-section`, {
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
                error: data.msg || 'Section replacement failed',
                details: data
            }, { status: 400, headers: corsHeaders });
        }

        return Response.json({
            success: true,
            taskId: data.data.taskId,
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Error in replaceSection:', error);
        return Response.json({ 
            error: error.message || 'Failed to replace section'
        }, { status: 500, headers: corsHeaders });
    }
});
