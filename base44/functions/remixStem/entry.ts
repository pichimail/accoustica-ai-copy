import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

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

    const body = await req.json();
    const track_id = body.track_id || body.trackId;
    const stem_type = body.stem_type || body.stemType;
    const stem_url = body.stem_url || body.stemUrl;
    const prompt = body.prompt || body.style;
    const section = body.section;

    if (!track_id || !stem_type || !stem_url || !prompt) {
      return Response.json({
        error: 'track_id, stem_type, stem_url, and prompt/style are required',
      }, { status: 400, headers: corsHeaders });
    }

    // In a real implementation, this would:
    // 1. Download the stem audio
    // 2. Use AI to transform it based on the prompt
    // 3. Upload the remixed stem
    // 4. Create a new track or update existing one

    console.log('Remixing stem:', { track_id, stem_type, prompt, section });

    // Create a durable record of the remix request and attach it to the track.
    await base44.asServiceRole.entities.Track.update(track_id, {
      prompt: `${prompt} (Stem remix: ${stem_type}${section ? `, section: ${section}` : ''})`,
    });

    await base44.asServiceRole.entities.TrackVersion.create({
      track_id,
      parent_track_id: track_id,
      changes_description: `AI stem remix queued for ${stem_type}: ${prompt}${section ? ` (${section})` : ''}`,
      edit_type: 'remix',
      edit_metadata: JSON.stringify({ stem_type, stem_url, prompt, section }),
      edited_by: user.email,
    });

    return Response.json({ 
      success: true, 
      message: 'Stem remix request saved and queued.'
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Remix error:', error);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
