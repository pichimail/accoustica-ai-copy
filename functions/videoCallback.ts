import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { code, msg, data } = await req.json();

        console.log('Received video callback:', { code, msg, taskId: data?.task_id, videoUrl: data?.video_url });

        if (code === 200 && data?.task_id && data?.video_url) {
            // Find and update the VideoGeneration record
            const videoRecords = await base44.asServiceRole.entities.VideoGeneration.filter({ 
                task_id: data.task_id 
            });

            if (videoRecords.length > 0) {
                await base44.asServiceRole.entities.VideoGeneration.update(videoRecords[0].id, {
                    status: 'ready',
                    video_url: data.video_url,
                });
                console.log('Video record updated:', videoRecords[0].id);
            }
        } else if (code !== 200) {
            // Handle failure
            const videoRecords = await base44.asServiceRole.entities.VideoGeneration.filter({ 
                task_id: data?.task_id 
            });

            if (videoRecords.length > 0) {
                await base44.asServiceRole.entities.VideoGeneration.update(videoRecords[0].id, {
                    status: 'failed',
                    error_message: msg || 'Video generation failed',
                });
            }
        }

        return Response.json({ status: 'received' }, { status: 200 });

    } catch (error) {
        console.error('Error in videoCallback:', error);
        return Response.json({ status: 'received', error: error.message }, { status: 200 });
    }
});