import { createClientFromRequest } from './_shared/supabaseClient.ts';
import { getAppSettings, getKieApiKey, getWatermark, isFeatureEnabled } from './_shared/appSettings.ts';

const RUNWAY_API_BASE = 'https://api.kie.ai/api/v1/runway';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      prompt,
      duration = 5,
      quality = '720p',
      aspectRatio = '16:9',
      imageUrl,
      generationType = 'text',
      trackId,
    } = await req.json();

    if (!prompt || !prompt.trim()) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const settings = await getAppSettings(base44);
    if (
      (generationType === 'text' && !isFeatureEnabled(settings, 'runway_text')) ||
      (generationType === 'image' && !isFeatureEnabled(settings, 'runway_image')) ||
      (generationType === 'music' && !isFeatureEnabled(settings, 'runway_music'))
    ) {
      return Response.json({ error: 'Runway generation is disabled' }, { status: 403 });
    }
    const apiKey = getKieApiKey(settings);
    if (!apiKey) {
      return Response.json({ error: 'KIE API key not configured' }, { status: 500 });
    }

    const body: Record<string, unknown> = {
      prompt,
      duration,
      quality,
      aspectRatio,
      waterMark: getWatermark(settings),
      callBackUrl: `${Deno.env.get('SUPABASE_FUNCTION_URL') || ''}/runwayCallback`,
    };

    if (imageUrl) {
      body.imageUrl = imageUrl;
    }

    const response = await fetch(`${RUNWAY_API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      console.error('Runway API error:', data);
      return Response.json({ error: data.msg || 'Runway generation failed' }, { status: 400 });
    }

    const taskId = data.data?.taskId;
    await base44.asServiceRole.entities.VideoGeneration.create({
      task_id: taskId,
      status: 'pending',
      provider: 'runway',
      generation_type: generationType,
      track_id: trackId || null,
      created_by: user.email,
      prompt,
      duration,
      quality,
      aspect_ratio: aspectRatio,
      image_url: imageUrl || null,
      is_public: false,
    });

    return Response.json({ success: true, taskId });
  } catch (error) {
    console.error('Error in runwayGenerate:', error);
    return Response.json({ error: error.message || 'Failed to start Runway generation' }, { status: 500 });
  }
});
