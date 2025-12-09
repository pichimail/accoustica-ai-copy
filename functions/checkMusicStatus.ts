import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

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
        const response = await fetch(
            `${SUNO_API_BASE}/generate/record-info?taskId=${taskId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            }
        );

        const data = await response.json();

        if (data.code !== 200) {
            console.error('Suno API error:', data);
            return Response.json({ 
                error: data.msg || 'Failed to check status',
                details: data
            }, { status: 400 });
        }

        const taskStatus = data.data.status;
        let trackUpdate = {};

        if (taskStatus === 'SUCCESS' && data.data.response?.sunoData?.[0]) {
            const sunoTrack = data.data.response.sunoData[0];
            trackUpdate = {
                status: 'ready',
                audio_url: sunoTrack.audioUrl,
                stream_audio_url: sunoTrack.streamAudioUrl,
                cover_image_url: sunoTrack.imageUrl,
                duration: Math.round(sunoTrack.duration),
                tags: sunoTrack.tags,
                external_audio_id: sunoTrack.id,
                title: sunoTrack.title || trackUpdate.title,
            };
        } else if (taskStatus === 'FAILED') {
            trackUpdate = {
                status: 'failed',
                error_message: 'Music generation failed',
            };
        } else if (taskStatus === 'PROCESSING' || taskStatus === 'PENDING') {
            trackUpdate = {
                status: 'generating',
            };
        }

        // Update track in database
        const updatedTrack = await base44.entities.Track.update(trackId, trackUpdate);

        return Response.json({
            success: true,
            status: taskStatus,
            track: updatedTrack,
        });

    } catch (error) {
        console.error('Error in checkMusicStatus:', error);
        return Response.json({ 
            error: error.message || 'Failed to check status'
        }, { status: 500 });
    }
});