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
        callBackUrl: `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/videoCallback`,
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
      author: videoPayload.author,
      domain_name: videoPayload.domain_name,
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