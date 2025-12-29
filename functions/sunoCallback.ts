import { createClientFromRequest } from './_shared/supabaseClient.ts';

Deno.serve(async (req) => {
    try {
        // Extract request details
        const base44 = createClientFromRequest(req);
        const { code, msg, data } = await req.json();

        console.log('Received Suno callback:', { code, msg, taskId: data?.task_id, callbackType: data?.callbackType });

        if (code === 200 && data?.task_id) {
            const taskId = data.task_id;
            const callbackType = data.callbackType;

            // Handle different callback types
            if (callbackType === 'complete' && data.data && Array.isArray(data.data)) {
                // Update tracks for completed generation
                const tracks = await base44.asServiceRole.entities.Track.filter({ task_id: taskId });
                
                // Update each track with the corresponding audio data
                for (let i = 0; i < Math.min(tracks.length, data.data.length); i++) {
                    const audioData = data.data[i];
                    const track = tracks[i];
                    
                    await base44.asServiceRole.entities.Track.update(track.id, {
                        status: 'ready',
                        audio_url: audioData.audio_url,
                        stream_audio_url: audioData.stream_audio_url,
                        cover_image_url: audioData.image_url,
                        lyrics: audioData.prompt,
                        tags: audioData.tags,
                        duration: audioData.duration,
                        model_version: audioData.model_name,
                        external_audio_id: audioData.id,
                    });
                }
            } else if (callbackType === 'first' && data.data && data.data.length > 0) {
                // First track completed
                const tracks = await base44.asServiceRole.entities.Track.filter({ task_id: taskId });
                if (tracks.length > 0) {
                    const audioData = data.data[0];
                    await base44.asServiceRole.entities.Track.update(tracks[0].id, {
                        status: 'ready',
                        audio_url: audioData.audio_url,
                        stream_audio_url: audioData.stream_audio_url,
                        cover_image_url: audioData.image_url,
                        lyrics: audioData.prompt,
                        tags: audioData.tags,
                        duration: audioData.duration,
                        model_version: audioData.model_name,
                        external_audio_id: audioData.id,
                    });
                }
            } else if (callbackType === 'text') {
                // Text generation completed - update status
                const tracks = await base44.asServiceRole.entities.Track.filter({ task_id: taskId });
                for (const track of tracks) {
                    await base44.asServiceRole.entities.Track.update(track.id, {
                        status: 'generating',
                    });
                }
            } else if (callbackType === 'error') {
                // Handle errors
                const tracks = await base44.asServiceRole.entities.Track.filter({ task_id: taskId });
                for (const track of tracks) {
                    await base44.asServiceRole.entities.Track.update(track.id, {
                        status: 'failed',
                        error_message: msg || 'Generation failed',
                    });
                }
            }
        } else if (code !== 200) {
            // Handle failure callbacks
            if (data?.task_id) {
                const tracks = await base44.asServiceRole.entities.Track.filter({ task_id: data.task_id });
                for (const track of tracks) {
                    await base44.asServiceRole.entities.Track.update(track.id, {
                        status: 'failed',
                        error_message: msg || 'Generation failed',
                    });
                }
            }
        }

        // Always return success to acknowledge callback
        return Response.json({ status: 'received' }, { status: 200 });

    } catch (error) {
        console.error('Error in sunoCallback:', error);
        // Still return success to avoid retries
        return Response.json({ status: 'received', error: error.message }, { status: 200 });
    }
});