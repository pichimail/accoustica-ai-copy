import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

        const profiles = await base44.asServiceRole.entities.SoundProfile.filter({ scope: 'global' });
        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        return Response.json({ success: true, profile }, { headers: corsHeaders });
    } catch (error) {
        return Response.json({ error: error.message || 'Failed to load sound profile' }, { status: 500, headers: corsHeaders });
    }
});