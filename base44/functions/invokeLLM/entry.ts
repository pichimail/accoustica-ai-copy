import { createClientFromRequest } from 'npm:@base44/sdk@0.8.32';
import { corsHeaders, jsonResponse, assertTextLength } from '../_shared/security.ts';

type Provider = 'openrouter' | 'openai';

type InvokeBody = {
  prompt?: string;
  model?: string | null;
  provider?: Provider;
  response_json_schema?: Record<string, unknown> | null;
  temperature?: number;
  max_tokens?: number;
};

function getEnv(name: string, fallback = '') {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : fallback;
}

function getProviderKey(provider: Provider) {
  return provider === 'openrouter'
    ? getEnv('OPENROUTER_API_KEY')
    : getEnv('OPENAI_API_KEY');
}

function getModel(provider: Provider, requested?: string | null) {
  if (requested && requested.trim()) return requested.trim();
  return provider === 'openrouter'
    ? getEnv('OPENROUTER_MODEL', 'openrouter/auto')
    : getEnv('OPENAI_MODEL', 'gpt-4o-mini');
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parseMaybeJson(content: string, wantsJson: boolean) {
  if (!wantsJson) return content;
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

async function callOpenRouter(body: InvokeBody) {
  const apiKey = getProviderKey('openrouter');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
  const wantsJson = Boolean(body.response_json_schema);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': getEnv('ACCOUSTICA_APP_URL', 'https://accoustica.ai'),
      'X-Title': 'Accoustica',
    },
    body: JSON.stringify({
      model: getModel('openrouter', body.model),
      messages: [
        {
          role: 'system',
          content: wantsJson
            ? `Return valid JSON matching this schema: ${JSON.stringify(body.response_json_schema)}.`
            : 'You are Accoustica, a precise music creation assistant. Return only the requested output.',
        },
        { role: 'user', content: body.prompt },
      ],
      temperature: clampNumber(body.temperature, 0, 2, 0.7),
      max_tokens: clampNumber(body.max_tokens, 1, 8000, 2000),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.message || 'OpenRouter request failed');
  const content = data?.choices?.[0]?.message?.content || '';
  return { output: parseMaybeJson(content, wantsJson), provider: 'openrouter', model: getModel('openrouter', body.model) };
}

async function callOpenAI(body: InvokeBody) {
  const apiKey = getProviderKey('openai');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  const wantsJson = Boolean(body.response_json_schema);
  const payload: Record<string, unknown> = {
    model: getModel('openai', body.model),
    messages: [
      {
        role: 'system',
        content: wantsJson
          ? `Return valid JSON matching this schema: ${JSON.stringify(body.response_json_schema)}.`
          : 'You are Accoustica, a precise music creation assistant. Return only the requested output.',
      },
      { role: 'user', content: body.prompt },
    ],
    temperature: clampNumber(body.temperature, 0, 2, 0.7),
    max_tokens: clampNumber(body.max_tokens, 1, 8000, 2000),
  };

  if (wantsJson) payload.response_format = { type: 'json_object' };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.message || 'OpenAI request failed');
  const content = data?.choices?.[0]?.message?.content || '';
  return { output: parseMaybeJson(content, wantsJson), provider: 'openai', model: getModel('openai', body.model) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as InvokeBody;
    assertTextLength('Prompt', body.prompt, 20000, true);

    const primary = (body.provider || getEnv('LLM_PRIMARY_PROVIDER', 'openrouter')) as Provider;
    const fallback = primary === 'openrouter' ? 'openai' : 'openrouter';
    const enableFallback = getEnv('LLM_ENABLE_FALLBACK', 'true') !== 'false';

    try {
      const result = primary === 'openrouter' ? await callOpenRouter(body) : await callOpenAI(body);
      return jsonResponse({ success: true, ...result });
    } catch (primaryError) {
      if (!enableFallback || !getProviderKey(fallback)) throw primaryError;
      const result = fallback === 'openrouter' ? await callOpenRouter({ ...body, provider: fallback }) : await callOpenAI({ ...body, provider: fallback });
      return jsonResponse({ success: true, fallback: true, primaryError: primaryError.message, ...result });
    }
  } catch (error) {
    console.error('invokeLLM failed:', error);
    return jsonResponse({ success: false, error: error.message || 'LLM request failed' }, { status: 500 });
  }
});
