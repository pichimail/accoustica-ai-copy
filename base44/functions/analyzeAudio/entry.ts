import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Use AI to analyze the audio track - using OpenRouter with fallback to OpenAI
    const apiKey = Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('OPENAI_API_KEY');
    const isOpenRouter = !!Deno.env.get('OPENROUTER_API_KEY');
    
    if (!apiKey) {
      throw new Error('No LLM API key configured (OPENROUTER_API_KEY or OPENAI_API_KEY)');
    }

    const url = isOpenRouter 
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const model = isOpenRouter
      ? Deno.env.get('OPENROUTER_MODEL') || 'openrouter/auto'
      : Deno.env.get('OPENAI_MODEL') || 'gpt-4-turbo-preview';

    const llmResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(isOpenRouter && { 'HTTP-Referer': 'https://accoustica-ai.app' }),
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional music analyst. Respond with valid JSON matching the schema provided.',
          },
          {
            role: 'user',
            content: `Analyze this audio file and provide detailed music characteristics. Based on audio analysis, identify:
      
1. Genre: Main genre and sub-genres (e.g., "Electronic/House", "Rock/Alternative")
2. Mood: Overall emotional tone (e.g., "Energetic", "Melancholic", "Uplifting")
3. Tempo: BPM (beats per minute) - estimate as accurately as possible
4. Key: Musical key (e.g., "C Major", "A Minor")
5. Energy Level: Rate from 1-10 (1=very calm, 10=very intense)
6. Style Tags: Array of relevant descriptive tags (e.g., ["upbeat", "synth-heavy", "danceable"])
7. Instruments: Main instruments you can hear
8. Vocal Style: If vocals present, describe them (or "instrumental" if none)

Be specific and accurate in your analysis. Return as JSON.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const llmData = await llmResponse.json();
    const content = llmData.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(content);

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