import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-base44-token',
};

function makeTitle(input = 'Mashup') {
  return (input || 'Mashup')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(' ')
    .slice(0, 80) || 'Mashup';
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

    const {
      trackIds = [],
      audioUrls = [],
      prompt = '',
      style = '',
      title = '',
      model = 'V5',
    } = await req.json();

    let resolvedUrls = audioUrls.filter(Boolean).slice(0, 2);
    let sourceTracks = [];

    if (resolvedUrls.length < 2 && trackIds.length >= 2) {
      sourceTracks = await Promise.all(
        trackIds.slice(0, 2).map(async (id) => {
          const found = await base44.entities.Track.filter({ id });
          return found[0];
        })
      );
      resolvedUrls = sourceTracks
        .map(track => track?.audio_url || track?.stream_audio_url)
        .filter(Boolean)
        .slice(0, 2);
    }

    if (resolvedUrls.length !== 2) {
      return Response.json({
        error: 'Mashup requires exactly two ready source tracks with public audio URLs',
      }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get('SUNO_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SUNO_API_KEY not configured' }, { status: 500, headers: corsHeaders });
    }

    const fallbackTitle = title || `Mashup: ${sourceTracks.map(t => t?.title).filter(Boolean).join(' x ') || makeTitle(prompt || style)}`;
    const body = {
      uploadUrlList: resolvedUrls,
      customMode: Boolean(style?.trim()),
      instrumental: false,
      model,
      callBackUrl: `${Deno.env.get('BASE44_FUNCTION_URL') || ''}/sunoCallback`,
    };
    if (prompt) body.prompt = prompt;
    if (style) {
      body.style = style;
      body.title = fallbackTitle;
    }

    const response = await fetch(`${SUNO_API_BASE}/generate/mashup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.code !== 200) {
      console.error('Kie mashup error:', data);
      return Response.json({
        error: data.msg || 'Mashup generation failed',
        details: data,
      }, { status: 400, headers: corsHeaders });
    }

    const tracks = await Promise.all([0, 1].map(() => base44.entities.Track.create({
      title: fallbackTitle,
      prompt,
      style: style || 'Mashup',
      task_id: data.data.taskId,
      status: 'queued',
      is_instrumental: false,
      model_version: model,
      generation_settings: JSON.stringify({
        mode: 'mashup',
        sourceTrackIds: trackIds.slice(0, 2),
        sourceAudioUrls: resolvedUrls,
      }),
    })));

    return Response.json({
      success: true,
      taskId: data.data.taskId,
      trackIds: tracks.map(track => track.id),
      track_count: tracks.length,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in generateMashup:', error);
    return Response.json({
      error: error.message || 'Failed to generate mashup',
    }, { status: 500, headers: corsHeaders });
  }
});
