import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
        }

        const { taskId } = await req.json();

        if (!taskId) {
            return Response.json({ error: 'taskId is required' }, { status: 400, headers: corsHeaders });
        }

        const apiKey = Deno.env.get('SUNO_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
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
            }, { status: 400, headers: corsHeaders });
        }

        const taskStatus = data.data.status;
        
        // Get all tracks with this task_id
        const tracks = await base44.asServiceRole.entities.Track.filter({ task_id: taskId });
        
        // Update tracks based on status
        let updatedTracks = [];
        
        if (taskStatus === 'SUCCESS' && data.data.response?.sunoData) {
            const audioDataArray = data.data.response.sunoData;
            
            // Update each track with corresponding audio data
            for (let i = 0; i < audioDataArray.length && i < tracks.length; i++) {
                const audioData = audioDataArray[i];
                const track = tracks[i];
                
                const updatedTrack = await base44.asServiceRole.entities.Track.update(track.id, {
                    status: 'ready',
                    audio_url: audioData.audioUrl,
                    stream_audio_url: audioData.streamAudioUrl,
                    cover_image_url: audioData.imageUrl,
                    duration: Math.round(audioData.duration || 0),
                    model_version: audioData.modelName,
                    tags: audioData.tags,
                    external_audio_id: audioData.id,
                    lyrics: audioData.prompt,
                    title: audioData.title || track.title,
                });
                updatedTracks.push(updatedTrack);
            }
        } else if (taskStatus === 'GENERATE_AUDIO_FAILED' || taskStatus === 'CREATE_TASK_FAILED' || taskStatus === 'SENSITIVE_WORD_ERROR' || taskStatus === 'FAILED') {
            for (const track of tracks) {
                const updatedTrack = await base44.asServiceRole.entities.Track.update(track.id, {
                    status: 'failed',
                    error_message: data.data.errorMessage || 'Generation failed',
                });
                updatedTracks.push(updatedTrack);
            }
        } else {
            for (const track of tracks) {
                const updatedTrack = await base44.asServiceRole.entities.Track.update(track.id, {
                    status: 'generating',
                });
                updatedTracks.push(updatedTrack);
            }
        }

        return Response.json({
            success: true,
            status: taskStatus,
            tracks: updatedTracks,
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('Error in checkMusicStatus:', error);
        return Response.json({ 
            error: error.message || 'Failed to check status'
        }, { status: 500, headers: corsHeaders });
    }
});
