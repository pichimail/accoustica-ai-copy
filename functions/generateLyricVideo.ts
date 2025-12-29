import { createClientFromRequest } from './_shared/supabaseClient.ts';
import { getAppSettings, getKieApiKey, getWatermark, isFeatureEnabled } from './_shared/appSettings.ts';

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

    const settings = await getAppSettings(base44);
    if (!isFeatureEnabled(settings, 'lyric_video')) {
      return Response.json({ error: 'Lyric video generation is disabled' }, { status: 403 });
    }
    const apiKey = getKieApiKey(settings);
    if (!apiKey) {
      return Response.json({ error: 'KIE API key not configured' }, { status: 500 });
    }

    const response = await fetch(`${SUNO_API_BASE}/mp4/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        audioId,
        author: author || 'Accoustica',
        domainName: domainName || 'accoustica.app',
        waterMark: getWatermark(settings),
        callBackUrl: `${Deno.env.get('SUPABASE_FUNCTION_URL') || ''}/videoCallback`,
      }),
    });

    const data = await response.json();

    if (data.code !== 200 && data.code !== 0) {
      console.error('Lyric video API error:', data);
      return Response.json({ error: data.msg || 'Lyric video generation failed' }, { status: 400 });
    }

    const videoTaskId = data.data?.taskId || taskId;
    const tracks = await base44.entities.Track.filter({ task_id: taskId });
    const track = tracks.find((t) => t.external_audio_id === audioId) || tracks[0];

    await base44.asServiceRole.entities.VideoGeneration.create({
      track_id: track?.id || null,
      task_id: videoTaskId,
      status: 'pending',
      provider: 'suno',
      generation_type: 'lyric',
      author: author || 'Accoustica',
      domain_name: domainName || 'accoustica.app',
      created_by: user.email,
      is_public: false,
    });

    return Response.json({ success: true, taskId: videoTaskId });
  } catch (error) {
    console.error('Error in generateLyricVideo:', error);
    return Response.json({ error: error.message || 'Failed to generate lyric video' }, { status: 500 });
  }
});
