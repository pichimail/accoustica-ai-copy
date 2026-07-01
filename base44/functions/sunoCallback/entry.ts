import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';
import { getTaskId, verifyCallbackRequest, jsonResponse } from '../_shared/security.ts';

function normalizeAudioData(item: any) {
  return {
    audio_url: item?.audio_url || item?.audioUrl || '',
    stream_audio_url: item?.stream_audio_url || item?.streamAudioUrl || '',
    cover_image_url: item?.image_url || item?.imageUrl || '',
    lyrics: item?.prompt || item?.lyrics || '',
    tags: item?.tags || '',
    duration: item?.duration || 0,
    model_version: item?.model_name || item?.modelName || '',
    external_audio_id: item?.id || '',
    title: item?.title || '',
  };
}

async function markJob(base44: any, taskId: string, status: string, message = '') {
  try {
    const entity = base44.asServiceRole?.entities?.GenerationJob;
    if (!entity?.filter) return;
    const job = (await entity.filter({ task_id: taskId }))?.[0];
    if (job?.id) await entity.update(job.id, { status, last_callback_message: message, updated_date: new Date().toISOString() });
  } catch (error) {
    console.warn('GenerationJob update skipped:', error?.message || error);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  const rawBody = await req.text();
  try {
    await verifyCallbackRequest(req, rawBody);
    const base44 = createClientFromRequest(req);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const { code, msg, data } = payload;
    const taskId = getTaskId(payload);
    const callbackType = data?.callbackType || data?.callback_type || payload?.callbackType;

    if (!taskId) return jsonResponse({ status: 'received', ignored: 'missing_task_id' }, { status: 200 });

    const tracks = await base44.asServiceRole.entities.Track.filter({ task_id: taskId });
    if (!tracks?.length) return jsonResponse({ status: 'received', ignored: 'tracks_not_found' }, { status: 200 });

    const isSuccess = code === 200 || code === '200';
    const audioRows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.response?.sunoData) ? data.response.sunoData : [];

    if (isSuccess && (callbackType === 'complete' || callbackType === 'first') && audioRows.length > 0) {
      const max = callbackType === 'first' ? 1 : Math.min(tracks.length, audioRows.length);
      for (let i = 0; i < max; i += 1) {
        const audio = normalizeAudioData(audioRows[i]);
        const track = tracks[i];
        await base44.asServiceRole.entities.Track.update(track.id, {
          status: 'ready',
          audio_url: audio.audio_url || track.audio_url,
          stream_audio_url: audio.stream_audio_url || track.stream_audio_url,
          cover_image_url: audio.cover_image_url || track.cover_image_url,
          lyrics: audio.lyrics || track.lyrics,
          tags: audio.tags || track.tags,
          duration: audio.duration || track.duration,
          model_version: audio.model_version || track.model_version,
          external_audio_id: audio.external_audio_id || track.external_audio_id,
          title: audio.title || track.title,
        });
      }
      await markJob(base44, taskId, callbackType === 'first' ? 'partial_ready' : 'ready');
    } else if (isSuccess && callbackType === 'text') {
      for (const track of tracks) await base44.asServiceRole.entities.Track.update(track.id, { status: 'generating' });
      await markJob(base44, taskId, 'generating');
    } else if (!isSuccess || callbackType === 'error') {
      for (const track of tracks) {
        await base44.asServiceRole.entities.Track.update(track.id, { status: 'failed', error_message: msg || data?.errorMessage || 'Generation failed' });
      }
      await markJob(base44, taskId, 'failed', msg || data?.errorMessage || 'Generation failed');
    }

    return jsonResponse({ status: 'received' }, { status: 200 });
  } catch (error) {
    console.error('sunoCallback rejected:', error);
    return jsonResponse({ status: 'rejected', error: error.message }, { status: error.message === 'Invalid callback signature' ? 401 : 200 });
  }
});
