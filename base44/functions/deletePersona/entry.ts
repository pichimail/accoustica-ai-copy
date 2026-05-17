import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, POST, OPTIONS',
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

    const payload = req.method === 'DELETE'
      ? Object.fromEntries(new URL(req.url).searchParams.entries())
      : await req.json();

    const personaId = String(payload?.personaId || '').trim();

    if (!personaId) {
      return Response.json({ error: 'personaId is required' }, { status: 400, headers: corsHeaders });
    }

    const persona = await base44.entities.Persona.get(personaId);

    if (!persona) {
      return Response.json({ error: 'Persona not found' }, { status: 404, headers: corsHeaders });
    }

    await base44.entities.Persona.delete(personaId);

    return Response.json({
      success: true,
      deletedPersonaId: personaId,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error in deletePersona:', error);
    return Response.json({
      error: error?.message || 'Failed to delete persona',
    }, { status: 500, headers: corsHeaders });
  }
});
