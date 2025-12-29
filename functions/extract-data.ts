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
    const text = payload?.text || payload?.content;
    const responseSchema = payload?.response_json_schema;
    const model = payload?.model || Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

    if (!text) {
      return Response.json({ error: 'text is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const messages = [
      {
        role: 'system',
        content: responseSchema
          ? `Extract structured data matching this schema: ${JSON.stringify(responseSchema)}`
          : 'Extract structured data in JSON format.'
      },
      {
        role: 'user',
        content: text
      }
    ];

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data?.error?.message || 'Extraction failed' }, { status: 400 });
    }

    const content = data?.choices?.[0]?.message?.content || '';
    try {
      const parsed = JSON.parse(content);
      return Response.json(parsed);
    } catch {
      return Response.json({ text: content });
    }
  } catch (error) {
    console.error('Error in extract-data:', error);
    return Response.json({ error: error.message || 'Extraction error' }, { status: 500 });
  }
});
