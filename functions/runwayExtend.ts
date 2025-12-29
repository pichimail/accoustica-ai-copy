import { createClientFromRequest } from './_shared/supabaseClient.ts';
import { getAppSettings, getKieApiKey, getWatermark, isFeatureEnabled } from './_shared/appSettings.ts';

const RUNWAY_API_BASE = 'https://api.kie.ai/api/v1/runway';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, prompt, quality = '720p' } = await req.json();

    if (!taskId || !prompt) {
      return Response.json({ error: 'taskId and prompt are required' }, { status: 400 });
    }

    const settings = await getAppSettings(base44);
    if (!isFeatureEnabled(settings, 'runway_extend')) {
      return Response.json({ error: 'Runway extension is disabled' }, { status: 403 });
    }
    const apiKey = getKieApiKey(settings);
    if (!apiKey) {
      return Response.json({ error: 'KIE API key not configured' }, { status: 500 });
    }

    const response = await fetch(`${RUNWAY_API_BASE}/extend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        prompt,
        quality,
        waterMark: getWatermark(settings),
        callBackUrl: `${Deno.env.get('SUPABASE_FUNCTION_URL') || ''}/runwayCallback`,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      console.error('Runway extend error:', data);
      return Response.json({ error: data.msg || 'Runway extension failed' }, { status: 400 });
    }

    const newTaskId = data.data?.taskId;
    await base44.asServiceRole.entities.VideoGeneration.create({
      task_id: newTaskId,
      status: 'pending',
      provider: 'runway',
      generation_type: 'extend',
      parent_task_id: taskId,
      created_by: user.email,
      prompt,
      quality,
      is_public: false,
    });

    return Response.json({ success: true, taskId: newTaskId });
  } catch (error) {
    console.error('Error in runwayExtend:', error);
    return Response.json({ error: error.message || 'Failed to extend Runway video' }, { status: 500 });
  }
});
