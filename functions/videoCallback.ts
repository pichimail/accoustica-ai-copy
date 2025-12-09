import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { code, msg, data } = await req.json();

        console.log('Received video callback:', { code, msg, taskId: data?.task_id, videoUrl: data?.video_url });

        if (code === 200 && data?.task_id && data?.video_url) {
            // Update track with video URL
            // Note: We'd need to store the video task mapping to the track
            // For now, we'll store this in a separate entity or update based on external tracking
            console.log('Video generated:', data.video_url);
        }

        return Response.json({ status: 'received' }, { status: 200 });

    } catch (error) {
        console.error('Error in videoCallback:', error);
        return Response.json({ status: 'received', error: error.message }, { status: 200 });
    }
});