import { createClientFromRequest } from './_shared/supabaseClient.ts';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audio_url } = await req.json();

    if (!audio_url) {
      return Response.json({ error: 'audio_url is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
    }

    const prompt = `Analyze this audio file and provide detailed music characteristics.
Audio URL: ${audio_url}

Identify:
1. Genre and sub-genres
2. Mood
3. Tempo (BPM estimate)
4. Key
5. Energy level (1-10)
6. Style tags (array)
7. Instruments
8. Vocal style (or "instrumental")

Return a JSON object with keys: genre, mood, tempo, key, energy_level, style_tags, instruments, vocal_style.`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data?.error?.message || 'Analysis failed' }, { status: 400 });
    }

    const content = data?.choices?.[0]?.message?.content || '{}';
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = { text: content };
    }

    return Response.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Audio analysis error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
