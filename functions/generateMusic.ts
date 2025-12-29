import { createClientFromRequest } from './_shared/supabaseClient.ts';
import { getAppSettings, getKieApiKey, isFeatureEnabled } from './_shared/appSettings.ts';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            mode = 'simple',
            model = 'V5',
            prompt, 
            style = '', 
            title = '', 
            customMode = false,
            instrumental = false,
            vocalGender,
            weirdness,
            styleInfluence,
        } = await req.json();

        const settings = await getAppSettings(base44);
        if (!isFeatureEnabled(settings, 'music_generation')) {
            return Response.json({ error: 'Music generation is disabled' }, { status: 403 });
        }
        const apiKey = getKieApiKey(settings);
        if (!apiKey) {
            return Response.json({ error: 'KIE API key not configured' }, { status: 500 });
        }

        // Build API payload based on mode
        const payload = {
            customMode: customMode,
            instrumental: instrumental,
            model: model,
            callBackUrl: `${Deno.env.get('SUPABASE_FUNCTION_URL') || ''}/sunoCallback`,
        };

        if (mode === 'simple') {
            // Simple mode: only prompt required
            if (!prompt || !prompt.trim()) {
                return Response.json({ error: 'Prompt is required' }, { status: 400 });
            }
            payload.prompt = prompt;
        } else if (mode === 'custom') {
            // Custom mode: prompt (lyrics), style, title required
            if (!prompt || !prompt.trim()) {
                return Response.json({ error: 'Lyrics (prompt) are required' }, { status: 400 });
            }
            if (!style || !style.trim()) {
                return Response.json({ error: 'Style is required' }, { status: 400 });
            }
            if (!title || !title.trim()) {
                return Response.json({ error: 'Title is required' }, { status: 400 });
            }
            payload.prompt = prompt;
            payload.style = style;
            payload.title = title;
            
            // Add optional parameters
            if (vocalGender) payload.vocalGender = vocalGender;
            if (typeof weirdness === 'number') payload.weirdnessConstraint = weirdness;
            if (typeof styleInfluence === 'number') payload.styleWeight = styleInfluence;
        } else if (mode === 'instrumental') {
            // Instrumental mode: style and title required
            if (!style || !style.trim()) {
                return Response.json({ error: 'Style is required' }, { status: 400 });
            }
            if (!title || !title.trim()) {
                return Response.json({ error: 'Title is required' }, { status: 400 });
            }
            payload.style = style;
            payload.title = title;
        }

        // Call Suno API to generate music
        const response = await fetch(`${SUNO_API_BASE}/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.code !== 200) {
            console.error('Suno API error:', data);
            return Response.json({ 
                error: data.msg || 'Music generation failed',
                details: data
            }, { status: 400 });
        }

        // Create Track records (Suno generates 2 by default)
        const trackPromises = [];
        
        // Generate auto title from prompt if not provided
        let finalTitle = title;
        if (!finalTitle && prompt) {
            // Create title from first 4-5 words of prompt
            const words = prompt.trim().split(/\s+/).slice(0, 5).join(' ');
            finalTitle = words.length > 40 ? words.substring(0, 40) + '...' : words;
        }
        if (!finalTitle) {
            finalTitle = 'Untitled Track';
        }
        
        for (let i = 0; i < 2; i++) {
            trackPromises.push(
                base44.entities.Track.create({
                    title: `${finalTitle}`,
                    prompt: prompt || '',
                    style: style || user.full_name,
                    task_id: data.data.taskId,
                    status: 'queued',
                    is_instrumental: instrumental,
                    model_version: model,
                })
            );
        }

        const tracks = await Promise.all(trackPromises);

        return Response.json({
            success: true,
            taskId: data.data.taskId,
            trackIds: tracks.map(t => t.id),
            track_count: tracks.length,
        });

    } catch (error) {
        console.error('Error in generateMusic:', error);
        return Response.json({ 
            error: error.message || 'Failed to generate music'
        }, { status: 500 });
    }
});
