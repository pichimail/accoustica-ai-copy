import { createClientFromRequest } from './_shared/supabaseClient.ts';
import { getAppSettings, getKieApiKey, getWatermark, isFeatureEnabled } from './_shared/appSettings.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, audioId, author, domainName, prompt, visualStyle, aspectRatio, effects } = await req.json();

    if (!taskId || !audioId) {
      return Response.json({ 
        success: false, 
        error: 'taskId and audioId are required' 
      }, { status: 400 });
    }

    const settings = await getAppSettings(base44);
    if (!isFeatureEnabled(settings, 'lyric_video')) {
      return Response.json({
        success: false,
        error: 'Music video generation is disabled',
      }, { status: 403 });
    }
    const SUNO_API_KEY = getKieApiKey(settings);
    if (!SUNO_API_KEY) {
      return Response.json({
        success: false,
        error: 'KIE API key not configured'
      }, { status: 500 });
    }

    // Get track details including lyrics
    const tracks = await base44.entities.Track.filter({ task_id: taskId });
    const track = tracks.find(t => t.external_audio_id === audioId) || tracks[0];

    // Build video generation payload
    const videoPayload = {
      author: author || 'Accoustica',
      domain_name: domainName || 'accoustica.app',
      // Additional video parameters
      prompt: prompt || `${visualStyle || 'cinematic'} music video with dynamic visuals`,
      aspect_ratio: aspectRatio || '16:9',
      effects: effects || [],
    };

    // Call Suno API to generate video
    const response = await fetch('https://api.kie.ai/api/v1/mp4/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: taskId,
        audioId: audioId,
        author: videoPayload.author,
        domainName: videoPayload.domain_name,
        waterMark: getWatermark(settings),
        callBackUrl: `${Deno.env.get('SUPABASE_FUNCTION_URL') || ''}/videoCallback`,
      }),
    });

    const data = await response.json();

    if (data.code !== 200 && data.code !== 0) {
      console.error('Suno API error:', data);
      return Response.json({
        success: false,
        error: data.msg || 'Failed to start video generation',
        details: data
      }, { status: 400 });
    }

    // Create VideoGeneration record
    const videoTaskId = data.data?.taskId || taskId;
    await base44.asServiceRole.entities.VideoGeneration.create({
      track_id: track.id,
      task_id: videoTaskId,
      status: 'pending',
      provider: 'suno',
      generation_type: 'music',
      author: videoPayload.author,
      domain_name: videoPayload.domain_name,
      created_by: user.email,
      is_public: false,
    });

    return Response.json({
      success: true,
      taskId: videoTaskId,
      message: 'Video generation started',
    });

  } catch (error) {
    console.error('Video generation error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
});
