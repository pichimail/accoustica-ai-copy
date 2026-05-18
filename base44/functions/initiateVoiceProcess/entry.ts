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

function normalizeLanguage(input: string): string {
  const value = (input || '').trim().toLowerCase();
  if (value === 'hindi' || value === 'hi') return 'hi';
  if (value === 'tamil' || value === 'ta') return 'ta';
  if (value === 'telugu' || value === 'te') return 'te';
  if (value === 'tinglish' || value === 'telugu+english' || value === 'te-en') return 'en';
  return 'en';
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

    let audioUrl = '';
    let personaName = '';
    let language = 'en';
    let file: File | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const possibleFile = formData.get('file');
      file = possibleFile instanceof File ? possibleFile : null;
      audioUrl = getString(formData.get('audioUrl'));
      personaName = getString(formData.get('personaName'));
      language = normalizeLanguage(getString(formData.get('language')));
    } else {
      const body = await req.json();
      audioUrl = getString(body?.audioUrl);
      personaName = getString(body?.personaName);
      language = normalizeLanguage(getString(body?.language));
      file = body?.file instanceof File ? body.file : null;
    }

    if (!personaName) {
      return Response.json({ error: 'personaName is required' }, { status: 400, headers: corsHeaders });
    }

    let finalAudioUrl = audioUrl;

    if (!finalAudioUrl && file) {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      finalAudioUrl = uploaded?.file_url || uploaded?.file_uri || '';
    }

    if (!finalAudioUrl) {
      return Response.json({ error: 'Either file or audioUrl is required' }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('SUNO_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    const callbackRoot = Deno.env.get('BASE44_FUNCTION_URL') || '';
    const callbackUrl = callbackRoot ? `${callbackRoot}/sunoVoiceValidateCallback` : undefined;

    const validateData = await postWithFallback(apiKey, [
      '/suno-voice-validate',
      '/voice/validate',
    ], {
      voiceUrl: finalAudioUrl,
      audioUrl: finalAudioUrl,
      file_url: finalAudioUrl,
      vocalStartS: 0,
      vocalEndS: 10,
      language,
      ...(callbackUrl ? { callbackUrl } : {}),
      ...(callbackUrl ? { callBackUrl: callbackUrl } : {}),
    });

    if (validateData?.code !== 200 || !validateData?.data?.taskId) {
      return Response.json({
        error: validateData?.msg || 'Voice validation failed',
        details: validateData,
      }, { status: 400, headers: corsHeaders });
    }

    const createdPersona = await base44.entities.Persona.create({
      name: personaName,
      description: 'Voice model in validation flow',
      status: 'validating',
      task_id: validateData.data.taskId,
      source_audio_url: finalAudioUrl,
      verification_audio_url: null,
      verification_phrase: null,
      validation_language: language,
      audio_id: null,
      persona_id: null,
      track_id: null,
      error_message: null,
    });

    return Response.json({
      success: true,
      personaId: createdPersona.id,
      taskId: validateData.data.taskId,
      language,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in initiateVoiceProcess:', error);
    return Response.json({
      error: error?.message || 'Failed to initiate voice process',
    }, { status: 500, headers: corsHeaders });
  }
});
