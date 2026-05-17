import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const taskId = payload?.data?.taskId;
    const status = String(payload?.data?.status || '').toLowerCase();

    if (!taskId) {
      return Response.json({ status: 'ignored' }, { status: 200 });
    }

    const matches = await base44.asServiceRole.entities.Persona.filter({ task_id: taskId });
    if (!Array.isArray(matches) || matches.length === 0) {
      return Response.json({ status: 'ignored' }, { status: 200 });
    }

    const persona = matches[0];

    if (status === 'fail' || status === 'failed' || status === 'processing_validate_fail' || payload?.code !== 200) {
      await base44.asServiceRole.entities.Persona.update(persona.id, {
        status: 'failed',
        error_message: payload?.data?.errorMessage || payload?.msg || 'Voice validation failed',
      });
    } else {
      await base44.asServiceRole.entities.Persona.update(persona.id, {
        status: 'validating',
        error_message: null,
      });
    }

    return Response.json({ status: 'received' }, { status: 200 });
  } catch (error) {
    console.error('Error in sunoVoiceValidateCallback:', error);
    return Response.json({ status: 'received', error: error?.message }, { status: 200 });
  }
});
