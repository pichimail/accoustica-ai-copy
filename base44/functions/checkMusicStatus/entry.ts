import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';
import { corsHeaders, jsonResponse, getTaskId, assertTaskOwnership } from '../_shared/security.ts';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const taskId = getTaskId(body);
    if (!taskId) return jsonResponse({ error: 'taskId is required' }, { status: 400 });

    const { tracks } = await assertTaskOwnership(base44, user, taskId);
    if (!tracks.length) return jsonResponse({ error: 'Task not found' }, { status: 404 });

    const apiKey = Deno.env.get('SUNO_API_KEY') || Deno.env.get('KIE_API_KEY');
    if (!apiKey) return jsonResponse({ error: 'SUNO_API_KEY is not configured' }, { status: 500 });

    const response = await fetch(`${SUNO_API_BASE}/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await response.json().catch(() => ({}));
    if (data.code !== 200) {
      console.error('Suno status error:', data);
      return jsonResponse({ error: data.msg || 'Failed to check status', details: data }, { status: 400 });
    }

    const taskStatus = data.data?.status;
    const audioDataArray = data.data?.response?.sunoData || data.data?.response?.data || [];
    const updatedTracks = [];

    if (Array.isArray(audioDataArray) && audioDataArray.length > 0) {
      for (let i = 0; i < tracks.length; i += 1) {
        const track = tracks[i];
        const audioData = audioDataArray[i];
        if (!audioData) {
          updatedTracks.push(await base44.asServiceRole.entities.Track.update(track.id, {
            status: taskStatus === 'SUCCESS' ? 'ready' : 'generating',
          }));
          continue;
        }

        const streamUrl = audioData.streamAudioUrl || audioData.stream_audio_url || '';
        const audioUrl = audioData.audioUrl || audioData.audio_url || '';
        const hasPlayableAudio = Boolean(streamUrl || audioUrl);

        updatedTracks.push(await base44.asServiceRole.entities.Track.update(track.id, {
          status: hasPlayableAudio ? 'ready' : (taskStatus === 'SUCCESS' ? 'ready' : 'generating'),
          audio_url: audioUrl || track.audio_url,
          stream_audio_url: streamUrl || track.stream_audio_url,
          cover_image_url: audioData.imageUrl || audioData.image_url || track.cover_image_url,
          duration: Math.round(audioData.duration || track.duration || 0),
          model_version: audioData.modelName || audioData.model_name || track.model_version,
          tags: audioData.tags || track.tags,
          external_audio_id: audioData.id || track.external_audio_id,
          lyrics: audioData.prompt || track.lyrics,
          title: audioData.title || track.title,
        }));
      }
    } else if (['GENERATE_AUDIO_FAILED', 'CREATE_TASK_FAILED', 'SENSITIVE_WORD_ERROR', 'FAILED'].includes(taskStatus)) {
      for (const track of tracks) {
        updatedTracks.push(await base44.asServiceRole.entities.Track.update(track.id, {
          status: 'failed',
          error_message: data.data?.errorMessage || 'Generation failed',
        }));
      }
    } else {
      for (const track of tracks) {
        updatedTracks.push(await base44.asServiceRole.entities.Track.update(track.id, { status: 'generating' }));
      }
    }

    return jsonResponse({ success: true, status: taskStatus, taskId, task_id: taskId, tracks: updatedTracks });
  } catch (error) {
    console.error('Error in checkMusicStatus:', error);
    return jsonResponse({ error: error.message || 'Failed to check status' }, { status: error.status || 500 });
  }
});
