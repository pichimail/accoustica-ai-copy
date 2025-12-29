import { createClientFromRequest } from './_shared/supabaseClient.ts';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const prompt = payload?.prompt;
    const systemPrompt = payload?.system_prompt;
    const responseSchema = payload?.response_json_schema;
    const temperature = typeof payload?.temperature === 'number' ? payload.temperature : 0.7;
    const model = payload?.model || Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

    if (!prompt || !prompt.trim()) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const messages = [];
    if (responseSchema) {
      messages.push({
        role: 'system',
        content: `Return JSON that matches this schema exactly: ${JSON.stringify(responseSchema)}`
      });
    }
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature,
        messages
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data?.error?.message || 'LLM request failed' }, { status: 400 });
    }

    const content = data?.choices?.[0]?.message?.content || '';
    try {
      const parsed = JSON.parse(content);
      return Response.json(parsed);
    } catch {
      return Response.json({ text: content });
    }
  } catch (error) {
    console.error('Error in invoke-llm:', error);
    return Response.json({ error: error.message || 'LLM error' }, { status: 500 });
  }
});
