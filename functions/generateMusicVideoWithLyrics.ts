import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      return Response.json({ 
        success: false, 
        error: 'SUNO_API_KEY not configured' 
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
    const response = await fetch('https://studio-api.suno.ai/api/generate/video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_id: taskId,
        audio_id: audioId,
        ...videoPayload,
        callback: {
          url: `${Deno.env.get('BASE44_CALLBACK_URL')}/functions/videoCallback`,
          events: ['video.succeeded', 'video.failed'],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({
        success: false,
        error: data.detail || 'Failed to start video generation',
      }, { status: response.status });
    }

    // Create VideoGeneration record
    await base44.asServiceRole.entities.VideoGeneration.create({
      track_id: track.id,
      task_id: data.id || taskId,
      status: 'pending',
      author: videoPayload.author,
      domain_name: videoPayload.domain_name,
    });

    return Response.json({
      success: true,
      taskId: data.id || taskId,
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