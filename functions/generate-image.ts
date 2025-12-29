import { createClientFromRequest } from './_shared/supabaseClient.ts';

const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const prompt = payload?.prompt;
    const size = payload?.size || '1024x1024';
    const model = payload?.model || Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1';

    if (!prompt || !prompt.trim()) {
      return Response.json({ error: 'prompt is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const response = await fetch(OPENAI_IMAGE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        size
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data?.error?.message || 'Image generation failed' }, { status: 400 });
    }

    const url = data?.data?.[0]?.url;
    if (!url) {
      return Response.json({ error: 'No image URL returned' }, { status: 500 });
    }

    return Response.json({ url });
  } catch (error) {
    console.error('Error in generate-image:', error);
    return Response.json({ error: error.message || 'Image generation error' }, { status: 500 });
  }
});
