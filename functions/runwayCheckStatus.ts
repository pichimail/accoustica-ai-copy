import { createClientFromRequest } from './_shared/supabaseClient.ts';
import { getAppSettings, getKieApiKey } from './_shared/appSettings.ts';

const RUNWAY_API_BASE = 'https://api.kie.ai/api/v1/runway';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await req.json();
    if (!taskId) {
      return Response.json({ error: 'taskId is required' }, { status: 400 });
    }

    const settings = await getAppSettings(base44);
    const apiKey = getKieApiKey(settings);
    if (!apiKey) {
      return Response.json({ error: 'KIE API key not configured' }, { status: 500 });
    }

    const response = await fetch(`${RUNWAY_API_BASE}/record-detail?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      return Response.json({ error: data.msg || 'Status check failed' }, { status: 400 });
    }

    const taskData = data.data || {};
    const videoUrl = taskData.videoInfo?.videoUrl;
    const imageUrl = taskData.videoInfo?.imageUrl;
    const state = taskData.state;

    const videoRecords = await base44.asServiceRole.entities.VideoGeneration.filter({ task_id: taskId });
    if (videoRecords.length > 0) {
      const record = videoRecords[0];
      if (state === 'success' && videoUrl) {
        await base44.asServiceRole.entities.VideoGeneration.update(record.id, {
          status: 'ready',
          video_url: videoUrl,
          thumbnail_url: imageUrl || null,
        });
      } else if (state === 'fail') {
        await base44.asServiceRole.entities.VideoGeneration.update(record.id, {
          status: 'failed',
          error_message: taskData.failMsg || 'Runway generation failed',
        });
      }
    }

    return Response.json({
      success: true,
      status: state,
      video_url: videoUrl,
      image_url: imageUrl,
    });
  } catch (error) {
    console.error('Error in runwayCheckStatus:', error);
    return Response.json({ error: error.message || 'Runway status error' }, { status: 500 });
  }
});
