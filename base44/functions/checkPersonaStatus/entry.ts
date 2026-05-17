import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

const FINAL_FAILURE_STATUSES = new Set(['fail', 'failed', 'processing_validate_fail']);

function normalizeStatus(status: unknown): string {
  return typeof status === 'string' ? status.toLowerCase() : '';
}

async function kieGet(apiKey: string, path: string) {
  const response = await fetch(`${SUNO_API_BASE}${path}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  return response.json();
}

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

    const params = req.method === 'GET'
      ? Object.fromEntries(new URL(req.url).searchParams.entries())
      : await req.json();

    const personaId = String(params?.personaId || '').trim();
    if (!personaId) {
      return Response.json({ error: 'personaId is required' }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('SUNO_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    const persona = await base44.entities.Persona.get(personaId);
    if (!persona) {
      return Response.json({ error: 'Persona not found' }, { status: 404, headers: corsHeaders });
    }

    if (persona.status === 'ready' || persona.status === 'failed') {
      return Response.json({ success: true, persona }, { headers: corsHeaders });
    }

    const currentTaskId = String(persona.task_id || params?.kieTaskId || '').trim();
    if (!currentTaskId) {
      return Response.json({ error: 'No Kie task id available for this persona' }, { status: 400, headers: corsHeaders });
    }

    // 1) Phrase validation stage
    if (persona.status === 'validating' || persona.status === 'pending') {
      const validateInfo = await kieGet(apiKey, `/voice/validate-info?taskId=${encodeURIComponent(currentTaskId)}`);

      if (validateInfo?.code !== 200) {
        return Response.json({
          error: validateInfo?.msg || 'Failed to query validation status',
          details: validateInfo,
        }, { status: 400, headers: corsHeaders });
      }

      const status = normalizeStatus(validateInfo?.data?.status);

      if (FINAL_FAILURE_STATUSES.has(status)) {
        const failedPersona = await base44.entities.Persona.update(persona.id, {
          status: 'failed',
          error_message: validateInfo?.data?.errorMessage || validateInfo?.msg || 'Validation failed',
        });
        return Response.json({ success: true, persona: failedPersona }, { headers: corsHeaders });
      }

      if (status === 'wait_validating') {
        const phrase = validateInfo?.data?.verifyPhrase || validateInfo?.data?.phrase || persona.verification_phrase || null;
        const waitingPersona = await base44.entities.Persona.update(persona.id, {
          status: 'validating',
          verification_phrase: phrase,
          error_message: null,
        });

        return Response.json({
          success: true,
          persona: waitingPersona,
          requiresVerification: true,
          verifyPhrase: phrase,
        }, { headers: corsHeaders });
      }

      // wait_processing / processing_validate / success -> keep validating until user submits phrase recording.
      const unchangedPersona = await base44.entities.Persona.update(persona.id, {
        status: 'validating',
        error_message: null,
      });
      return Response.json({ success: true, persona: unchangedPersona }, { headers: corsHeaders });
    }

    // 2) Voice generation stage after submitPersonaVerification
    const voiceRecord = await kieGet(apiKey, `/voice/record-info?taskId=${encodeURIComponent(currentTaskId)}`);

    if (voiceRecord?.code !== 200) {
      return Response.json({
        error: voiceRecord?.msg || 'Failed to query voice generation status',
        details: voiceRecord,
      }, { status: 400, headers: corsHeaders });
    }

    const voiceStatus = normalizeStatus(voiceRecord?.data?.status);

    if (FINAL_FAILURE_STATUSES.has(voiceStatus)) {
      const failedPersona = await base44.entities.Persona.update(persona.id, {
        status: 'failed',
        error_message: voiceRecord?.data?.errorMessage || voiceRecord?.msg || 'Voice generation failed',
      });
      return Response.json({ success: true, persona: failedPersona }, { headers: corsHeaders });
    }

    if (voiceStatus === 'success') {
      const voiceId = voiceRecord?.data?.voiceId || voiceRecord?.data?.voice_id || null;

      if (!voiceId) {
        const failedPersona = await base44.entities.Persona.update(persona.id, {
          status: 'failed',
          error_message: 'Voice generation succeeded but no voiceId returned',
        });
        return Response.json({ success: true, persona: failedPersona }, { headers: corsHeaders });
      }

      const checkVoiceResponse = await fetch(`${SUNO_API_BASE}/voice/check-voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task_id: currentTaskId }),
      });

      const checkVoiceData = await checkVoiceResponse.json();
      const isAvailable = checkVoiceData?.code === 200
        ? Boolean(checkVoiceData?.data?.isAvailable)
        : true;

      if (!isAvailable) {
        const pendingPersona = await base44.entities.Persona.update(persona.id, {
          status: 'generating',
          error_message: null,
        });
        return Response.json({ success: true, persona: pendingPersona }, { headers: corsHeaders });
      }

      const readyPersona = await base44.entities.Persona.update(persona.id, {
        status: 'ready',
        persona_id: voiceId,
        audio_id: persona.verification_audio_url || persona.audio_id || null,
        error_message: null,
      });

      return Response.json({ success: true, persona: readyPersona }, { headers: corsHeaders });
    }

    const generatingPersona = await base44.entities.Persona.update(persona.id, {
      status: 'generating',
      error_message: null,
    });

    return Response.json({ success: true, persona: generatingPersona }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in checkPersonaStatus:', error);
    return Response.json({
      error: error?.message || 'Failed to check persona status',
    }, { status: 500, headers: corsHeaders });
  }
});
