import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const KIE_API_BASES = ['https://kie.ai/suno-api', 'https://api.kie.ai/api/v1', 'https://kie.ai'];
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

const FINAL_FAILURE_STATUSES = new Set(['fail', 'failed', 'processing_validate_fail', 'generate_audio_failed', 'create_task_failed']);

function normalizeStatus(status: unknown): string {
  return typeof status === 'string' ? status.toLowerCase() : '';
}

function extractTaskId(payload: any): string {
  return String(
    payload?.taskId
    || payload?.task_id
    || payload?.data?.taskId
    || payload?.data?.task_id
    || ''
  ).trim();
}

function extractVoiceId(payload: any): string {
  return String(
    payload?.voiceId
    || payload?.voice_id
    || payload?.personaId
    || payload?.persona_id
    || payload?.data?.voiceId
    || payload?.data?.voice_id
    || payload?.data?.personaId
    || payload?.data?.persona_id
    || ''
  ).trim();
}

function extractAudioId(payload: any): string {
  return String(
    payload?.audioId
    || payload?.audio_id
    || payload?.data?.audioId
    || payload?.data?.audio_id
    || ''
  ).trim();
}

function extractStatus(payload: any): string {
  return normalizeStatus(
    payload?.status
    || payload?.taskStatus
    || payload?.state
    || payload?.data?.status
    || payload?.data?.taskStatus
    || payload?.data?.state
  );
}

function extractPhrase(payload: any): string {
  return String(
    payload?.verifyPhrase
    || payload?.verify_phrase
    || payload?.phrase
    || payload?.data?.verifyPhrase
    || payload?.data?.verify_phrase
    || payload?.data?.phrase
    || ''
  ).trim();
}

function isApiSuccess(payload: any): boolean {
  return payload?.code === 200 || payload?.success === true;
}

async function getWithFallback(apiKey: string, paths: string[]) {
  let lastError: unknown = null;

  for (const base of KIE_API_BASES) {
    for (const rawPath of paths) {
      const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      try {
        const response = await fetch(`${base}${path}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && isApiSuccess(data)) {
          return data;
        }
        lastError = data;
      } catch (error) {
        lastError = error;
      }
    }
  }

  return lastError || { code: 500, msg: 'All Kie GET endpoints failed' };
}

async function postWithFallback(apiKey: string, paths: string[], body: Record<string, unknown>) {
  let lastError: unknown = null;

  for (const base of KIE_API_BASES) {
    for (const rawPath of paths) {
      const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      try {
        const response = await fetch(`${base}${path}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && isApiSuccess(data)) {
          return data;
        }
        lastError = data;
      } catch (error) {
        lastError = error;
      }
    }
  }

  return lastError || { code: 500, msg: 'All Kie POST endpoints failed' };
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

    if (persona.status === 'validating' || persona.status === 'pending') {
      const validateInfo = await getWithFallback(apiKey, [
        `/suno-voice-validate-info?taskId=${encodeURIComponent(currentTaskId)}`,
        `/voice/validate-info?taskId=${encodeURIComponent(currentTaskId)}`,
        `/market/common/get-task-detail?taskId=${encodeURIComponent(currentTaskId)}`,
      ]);

      const validateStatus = extractStatus(validateInfo);
      const validatePhrase = extractPhrase(validateInfo) || persona.verification_phrase || '';
      const validateVoiceId = extractVoiceId(validateInfo);

      if (!isApiSuccess(validateInfo)) {
        return Response.json({
          error: (validateInfo as any)?.msg || 'Failed to query validation status',
          details: validateInfo,
        }, { status: 400, headers: corsHeaders });
      }

      if (FINAL_FAILURE_STATUSES.has(validateStatus)) {
        const failedPersona = await base44.entities.Persona.update(persona.id, {
          status: 'failed',
          error_message: (validateInfo as any)?.data?.errorMessage || (validateInfo as any)?.msg || 'Validation failed',
        });
        return Response.json({ success: true, persona: failedPersona }, { headers: corsHeaders });
      }

      const requiresVerification = (
        validateStatus === 'wait_validating'
        || validateStatus === 'waiting_verification'
        || (!validateVoiceId && !!validatePhrase)
      );

      if (requiresVerification) {
        const waitingPersona = await base44.entities.Persona.update(persona.id, {
          status: 'validating',
          verification_phrase: validatePhrase || null,
          error_message: null,
        });

        return Response.json({
          success: true,
          persona: waitingPersona,
          requiresVerification: true,
          verifyPhrase: validatePhrase || null,
        }, { headers: corsHeaders });
      }

      // If provider returns voice_id directly after validation, move straight to generation stage.
      if (validateVoiceId || validateStatus === 'success') {
        const callbackRoot = Deno.env.get('BASE44_FUNCTION_URL') || '';
        const callbackUrl = callbackRoot ? `${callbackRoot}/sunoVoiceGenerateCallback` : undefined;

        const generatePayload = {
          voiceId: validateVoiceId || undefined,
          voice_id: validateVoiceId || undefined,
          taskId: currentTaskId,
          personaName: persona.name,
          voiceName: persona.name,
          description: persona.description || `Voice persona: ${persona.name}`,
          ...(callbackUrl ? { callbackUrl } : {}),
          ...(callbackUrl ? { callBackUrl: callbackUrl } : {}),
        };

        const generateResult = await postWithFallback(apiKey, [
          '/suno-voice-generate',
          '/voice/generate',
        ], generatePayload);

        if (!isApiSuccess(generateResult)) {
          const failedPersona = await base44.entities.Persona.update(persona.id, {
            status: 'failed',
            error_message: (generateResult as any)?.msg || 'Voice generation failed',
          });
          return Response.json({ success: true, persona: failedPersona, details: generateResult }, { headers: corsHeaders });
        }

        const generateTaskId = extractTaskId(generateResult) || currentTaskId;
        const generatedVoiceId = extractVoiceId(generateResult);
        const generatedAudioId = extractAudioId(generateResult);

        // Some APIs return the final voice/persona id immediately.
        if (generatedVoiceId) {
          const readyPersona = await base44.entities.Persona.update(persona.id, {
            status: 'ready',
            task_id: generateTaskId,
            persona_id: generatedVoiceId,
            audio_id: generatedAudioId || persona.audio_id || null,
            error_message: null,
          });
          return Response.json({ success: true, persona: readyPersona }, { headers: corsHeaders });
        }

        const generatingPersona = await base44.entities.Persona.update(persona.id, {
          status: 'generating',
          task_id: generateTaskId,
          error_message: null,
        });

        return Response.json({ success: true, persona: generatingPersona }, { headers: corsHeaders });
      }

      const unchangedPersona = await base44.entities.Persona.update(persona.id, {
        status: 'validating',
        verification_phrase: validatePhrase || persona.verification_phrase || null,
        error_message: null,
      });
      return Response.json({ success: true, persona: unchangedPersona }, { headers: corsHeaders });
    }

    // Generating stage
    const voiceRecord = await getWithFallback(apiKey, [
      `/suno-voice-check-voice?taskId=${encodeURIComponent(currentTaskId)}`,
      `/voice/record-info?taskId=${encodeURIComponent(currentTaskId)}`,
      `/market/common/get-task-detail?taskId=${encodeURIComponent(currentTaskId)}`,
    ]);

    // Backward-compatible fallback that some older Kie endpoints still require.
    const checkVoiceData = await postWithFallback(apiKey, ['/voice/check-voice'], {
      task_id: currentTaskId,
      taskId: currentTaskId,
    });

    const combinedStatus = extractStatus(checkVoiceData) || extractStatus(voiceRecord);
    const combinedVoiceId = extractVoiceId(checkVoiceData) || extractVoiceId(voiceRecord);
    const combinedAudioId = extractAudioId(checkVoiceData) || extractAudioId(voiceRecord);

    if (FINAL_FAILURE_STATUSES.has(combinedStatus)) {
      const failedPersona = await base44.entities.Persona.update(persona.id, {
        status: 'failed',
        error_message:
          (checkVoiceData as any)?.data?.errorMessage
          || (voiceRecord as any)?.data?.errorMessage
          || (checkVoiceData as any)?.msg
          || (voiceRecord as any)?.msg
          || 'Voice generation failed',
      });
      return Response.json({ success: true, persona: failedPersona }, { headers: corsHeaders });
    }

    if (combinedVoiceId) {
      const readyPersona = await base44.entities.Persona.update(persona.id, {
        status: 'ready',
        persona_id: combinedVoiceId,
        audio_id: combinedAudioId || persona.verification_audio_url || persona.audio_id || null,
        error_message: null,
      });

      return Response.json({ success: true, persona: readyPersona }, { headers: corsHeaders });
    }

    const isAvailable = (checkVoiceData as any)?.data?.isAvailable;
    if (combinedStatus === 'success' && isAvailable === true) {
      // Provider says successful+available but did not return a voice id yet.
      const generatingPersona = await base44.entities.Persona.update(persona.id, {
        status: 'generating',
        error_message: null,
      });
      return Response.json({ success: true, persona: generatingPersona }, { headers: corsHeaders });
    }

    const generatingPersona = await base44.entities.Persona.update(persona.id, {
      status: 'generating',
      error_message: null,
    });

    return Response.json({ success: true, persona: generatingPersona }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in checkPersonaStatus:', error);
    return Response.json({
      error: (error as Error)?.message || 'Failed to check persona status',
    }, { status: 500, headers: corsHeaders });
  }
});
