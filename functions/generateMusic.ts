import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { prompt, style, title, instrumental = false } = await req.json();

        if (!prompt) {
            return Response.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        // Call Suno API to generate music
        const response = await fetch(`${SUNO_API_BASE}/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                customMode: true,
                instrumental: instrumental,
                model: 'V4_5',
                callBackUrl: 'https://webhook.site/unique-url-here',
                style: style || 'AI Generated Music',
                title: title || 'Untitled Track',
            }),
        });

        const data = await response.json();

        if (data.code !== 200) {
            console.error('Suno API error:', data);
            return Response.json({ 
                error: data.msg || 'Music generation failed',
                details: data
            }, { status: 400 });
        }

        // Create Track record in database
        const track = await base44.entities.Track.create({
            title: title || 'Untitled Track',
            prompt: prompt,
            style: style || 'AI Generated',
            task_id: data.data.taskId,
            status: 'queued',
            is_instrumental: instrumental,
        });

        return Response.json({
            success: true,
            taskId: data.data.taskId,
            trackId: track.id,
        });

    } catch (error) {
        console.error('Error in generateMusic:', error);
        return Response.json({ 
            error: error.message || 'Failed to generate music'
        }, { status: 500 });
    }
});