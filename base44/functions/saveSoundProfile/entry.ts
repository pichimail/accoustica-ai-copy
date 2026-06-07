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
        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403, headers: corsHeaders });
        }

        const body = await req.json();
        const allowed = [
            'is_active', 'drum_style', 'drum_intensity', 'guitar_style', 'guitar_intensity',
            'hq_vocal_instructions', 'hq_music_instructions', 'global_avoid_tags',
        ];
        const data = { scope: 'global' };
        for (const key of allowed) {
            if (body[key] !== undefined) data[key] = body[key];
        }

        const existing = await base44.asServiceRole.entities.SoundProfile.filter({ scope: 'global' });
        let profile;
        if (existing && existing.length > 0) {
            profile = await base44.asServiceRole.entities.SoundProfile.update(existing[0].id, data);
        } else {
            profile = await base44.asServiceRole.entities.SoundProfile.create(data);
        }

        return Response.json({ success: true, profile }, { headers: corsHeaders });
    } catch (error) {
        return Response.json({ error: error.message || 'Failed to save sound profile' }, { status: 500, headers: corsHeaders });
    }
});