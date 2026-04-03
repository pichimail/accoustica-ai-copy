import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500 });
        }

        // Check status from Suno API
        const response = await fetch(`https://api.kie.ai/api/v1/video/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        
        console.log('Video status check:', { taskId, data });

        // Update database based on API response
        const videoRecords = await base44.asServiceRole.entities.VideoGeneration.filter({ 
            task_id: taskId 
        });

        if (videoRecords.length > 0) {
            const videoRecord = videoRecords[0];
            
            if (data.code === 200 && data.data) {
                const videoData = data.data;
                
                // Check if video is ready
                if (videoData.video_url || videoData.videoUrl) {
                    await base44.asServiceRole.entities.VideoGeneration.update(videoRecord.id, {
                        status: 'ready',
                        video_url: videoData.video_url || videoData.videoUrl,
                    });
                    
                    return Response.json({
                        success: true,
                        status: 'ready',
                        video_url: videoData.video_url || videoData.videoUrl,
                    });
                } else if (videoData.status === 'failed' || videoData.status === 'error') {
                    await base44.asServiceRole.entities.VideoGeneration.update(videoRecord.id, {
                        status: 'failed',
                        error_message: videoData.error || 'Video generation failed',
                    });
                    
                    return Response.json({
                        success: false,
                        status: 'failed',
                        error: videoData.error || 'Video generation failed',
                    });
                } else {
                    // Still processing
                    return Response.json({
                        success: true,
                        status: 'processing',
                    });
                }
            }
        }

        return Response.json({
            success: true,
            status: 'processing',
        });

    } catch (error) {
        console.error('Error checking video status:', error);
        return Response.json({ 
            error: error.message,
            success: false,
        }, { status: 500 });
    }
});