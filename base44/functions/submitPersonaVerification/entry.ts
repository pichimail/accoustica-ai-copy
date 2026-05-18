import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const KIE_API_BASES = ['https://kie.ai/suno-api', 'https://api.kie.ai/api/v1', 'https://kie.ai'];
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

async function postWithFallback(
  apiKey: string,
  paths: string[],
  body: Record<string, unknown>,
) {
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
        if (response.ok && data?.code === 200) {
          return data;
        }
        lastError = data;
      } catch (error) {
        lastError = error;
      }
    }
  }

  return lastError || { code: 500, msg: 'All Kie/Suno endpoints failed' };
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

    let personaId = '';
    let audioUrl = '';
    let file: File | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      personaId = getString(formData.get('personaId'));
      audioUrl = getString(formData.get('audioUrl'));
      const possibleFile = formData.get('file');
      file = possibleFile instanceof File ? possibleFile : null;
    } else {
      const body = await req.json();
      personaId = getString(body?.personaId);
      audioUrl = getString(body?.audioUrl);
      file = body?.file instanceof File ? body.file : null;
    }

    if (!personaId) {
      return Response.json({ error: 'personaId is required' }, { status: 400, headers: corsHeaders });
    }

    let verifyAudioUrl = audioUrl;
    if (!verifyAudioUrl && file) {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      verifyAudioUrl = uploaded?.file_url || uploaded?.file_uri || '';
    }

    if (!verifyAudioUrl) {
      return Response.json({ error: 'Either file or audioUrl is required' }, { status: 400, headers: corsHeaders });
    }

    const persona = await base44.entities.Persona.get(personaId);
    if (!persona) {
      return Response.json({ error: 'Persona not found' }, { status: 404, headers: corsHeaders });
    }

    if (persona.status === 'ready') {
      return Response.json({ error: 'Persona is already ready' }, { status: 400, headers: corsHeaders });
    }

    if (persona.status === 'failed') {
      return Response.json({ error: 'Persona is failed. Restart from voice upload.' }, { status: 400, headers: corsHeaders });
    }

    if (!persona.task_id) {
      return Response.json({ error: 'Missing validation task id on persona' }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('SUNO_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    const callbackRoot = Deno.env.get('BASE44_FUNCTION_URL') || '';
    const callbackUrl = callbackRoot ? `${callbackRoot}/sunoVoiceGenerateCallback` : undefined;

    const generateData = await postWithFallback(apiKey, [
      '/suno-voice-generate',
      '/voice/generate',
    ], {
      taskId: persona.task_id,
      verifyUrl: verifyAudioUrl,
      voiceName: persona.name,
      personaName: persona.name,
      description: persona.description || `Voice persona: ${persona.name}`,
      style: 'Custom Voice',
      ...(callbackUrl ? { callbackUrl } : {}),
      ...(callbackUrl ? { callBackUrl: callbackUrl } : {}),
    });

    if (generateData?.code !== 200 || !generateData?.data?.taskId) {
      return Response.json({
        error: generateData?.msg || 'Voice generation failed',
        details: generateData,
      }, { status: 400, headers: corsHeaders });
    }

    const updatedPersona = await base44.entities.Persona.update(persona.id, {
      status: 'generating',
      task_id: generateData.data.taskId,
      verification_audio_url: verifyAudioUrl,
      audio_id: verifyAudioUrl,
      error_message: null,
    });

    return Response.json({
      success: true,
      taskId: generateData.data.taskId,
      persona: updatedPersona,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in submitPersonaVerification:', error);
    return Response.json({
      error: error?.message || 'Failed to submit persona verification audio',
    }, { status: 500, headers: corsHeaders });
  }
});
