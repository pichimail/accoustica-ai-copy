import { createClientFromRequest } from './_shared/supabaseClient.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();
        
        console.log('Received video callback - Full payload:', JSON.stringify(payload));

        // Handle multiple possible payload formats
        const code = payload.code || payload.status || 200;
        const taskId = payload.taskId || payload.task_id || payload.data?.taskId || payload.data?.task_id;
        const videoUrl = payload.videoUrl || payload.video_url || payload.data?.videoUrl || payload.data?.video_url;
        const imageUrl = payload.imageUrl || payload.image_url || payload.data?.imageUrl || payload.data?.image_url;
        const errorMsg = payload.msg || payload.message || payload.error;

        console.log('Parsed callback:', { code, taskId, videoUrl, errorMsg });

        if (!taskId) {
            console.error('No taskId found in callback');
            return Response.json({ status: 'received', error: 'No taskId' }, { status: 200 });
        }

        // Find the VideoGeneration record
        const videoRecords = await base44.asServiceRole.entities.VideoGeneration.filter({ 
            task_id: taskId 
        });

        if (videoRecords.length === 0) {
            console.error('No video record found for taskId:', taskId);
            return Response.json({ status: 'received', error: 'Record not found' }, { status: 200 });
        }

        // Update based on success/failure
        if (videoUrl && (code === 200 || code === 0)) {
            await base44.asServiceRole.entities.VideoGeneration.update(videoRecords[0].id, {
                status: 'ready',
                video_url: videoUrl,
                thumbnail_url: imageUrl || null,
            });
            console.log('✅ Video record updated successfully:', videoRecords[0].id);
        } else {
            await base44.asServiceRole.entities.VideoGeneration.update(videoRecords[0].id, {
                status: 'failed',
                error_message: errorMsg || 'Video generation failed',
            });
            console.log('❌ Video marked as failed:', videoRecords[0].id);
        }

        return Response.json({ status: 'received', success: true }, { status: 200 });

    } catch (error) {
        console.error('❌ Error in videoCallback:', error);
        return Response.json({ status: 'received', error: error.message }, { status: 200 });
    }
});
