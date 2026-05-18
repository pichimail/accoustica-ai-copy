import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function pickTaskId(payload: any): string {
  return String(payload?.taskId || payload?.task_id || payload?.data?.taskId || payload?.data?.task_id || '').trim();
}

function pickStatus(payload: any): string {
  return String(payload?.status || payload?.data?.status || '').toLowerCase();
}

function pickVoiceId(payload: any): string | null {
  const value = payload?.voiceId || payload?.voice_id || payload?.personaId || payload?.persona_id || payload?.data?.voiceId || payload?.data?.voice_id || payload?.data?.personaId || payload?.data?.persona_id;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function pickAudioId(payload: any): string | null {
  const value = payload?.audioId || payload?.audio_id || payload?.data?.audioId || payload?.data?.audio_id;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const taskId = pickTaskId(payload);
    const status = pickStatus(payload);
    const voiceId = pickVoiceId(payload);
    const audioId = pickAudioId(payload);

    if (!taskId) {
      return Response.json({ status: 'ignored' }, { status: 200 });
    }

    const matches = await base44.asServiceRole.entities.Persona.filter({ task_id: taskId });
    if (!Array.isArray(matches) || matches.length === 0) {
      return Response.json({ status: 'ignored' }, { status: 200 });
    }

    const persona = matches[0];

    if ((status === 'success' || payload?.code === 200) && voiceId) {
      await base44.asServiceRole.entities.Persona.update(persona.id, {
        status: 'ready',
        persona_id: voiceId,
        audio_id: audioId || persona.audio_id || null,
        error_message: null,
      });
    } else if (status === 'fail' || status === 'failed' || payload?.code !== 200) {
      await base44.asServiceRole.entities.Persona.update(persona.id, {
        status: 'failed',
        error_message: payload?.data?.errorMessage || payload?.msg || 'Voice generation failed',
      });
    } else {
      await base44.asServiceRole.entities.Persona.update(persona.id, {
        status: 'generating',
      });
    }

    return Response.json({ status: 'received' }, { status: 200 });
  } catch (error) {
    console.error('Error in sunoVoiceGenerateCallback:', error);
    return Response.json({ status: 'received', error: error?.message }, { status: 200 });
  }
});
