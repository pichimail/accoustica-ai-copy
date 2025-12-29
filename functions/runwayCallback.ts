import { createClientFromRequest } from './_shared/supabaseClient.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const code = payload.code || payload.status || 200;
    const data = payload.data || {};
    const taskId = data.task_id || data.taskId || payload.taskId;
    const videoUrl = data.video_url || data.videoUrl || payload.videoUrl;
    const imageUrl = data.image_url || data.imageUrl || payload.imageUrl;
    const errorMsg = payload.msg || payload.message || payload.error;

    if (!taskId) {
      console.error('Runway callback missing taskId:', payload);
      return Response.json({ status: 'received', error: 'No taskId' }, { status: 200 });
    }

    const videoRecords = await base44.asServiceRole.entities.VideoGeneration.filter({ task_id: taskId });
    if (videoRecords.length === 0) {
      console.error('Runway callback record not found:', taskId);
      return Response.json({ status: 'received', error: 'Record not found' }, { status: 200 });
    }

    if (code === 200 && videoUrl) {
      await base44.asServiceRole.entities.VideoGeneration.update(videoRecords[0].id, {
        status: 'ready',
        video_url: videoUrl,
        thumbnail_url: imageUrl || null,
      });
    } else {
      await base44.asServiceRole.entities.VideoGeneration.update(videoRecords[0].id, {
        status: 'failed',
        error_message: errorMsg || 'Runway generation failed',
      });
    }

    return Response.json({ status: 'received', success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in runwayCallback:', error);
    return Response.json({ status: 'received', error: error.message }, { status: 200 });
  }
});
