import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    // Use AI to analyze the audio track
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this audio file and provide detailed music characteristics. Listen carefully and identify:
      
1. Genre: Main genre and sub-genres (e.g., "Electronic/House", "Rock/Alternative")
2. Mood: Overall emotional tone (e.g., "Energetic", "Melancholic", "Uplifting")
3. Tempo: BPM (beats per minute) - estimate as accurately as possible
4. Key: Musical key (e.g., "C Major", "A Minor")
5. Energy Level: Rate from 1-10 (1=very calm, 10=very intense)
6. Style Tags: Array of relevant descriptive tags (e.g., ["upbeat", "synth-heavy", "danceable"])
7. Instruments: Main instruments you can hear
8. Vocal Style: If vocals present, describe them (or "instrumental" if none)

Be specific and accurate in your analysis.`,
      file_urls: audio_url,
      response_json_schema: {
        type: 'object',
        properties: {
          genre: { type: 'string' },
          mood: { type: 'string' },
          tempo: { type: 'number' },
          key: { type: 'string' },
          energy_level: { type: 'number' },
          style_tags: {
            type: 'array',
            items: { type: 'string' }
          },
          instruments: { type: 'string' },
          vocal_style: { type: 'string' }
        }
      }
    });

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