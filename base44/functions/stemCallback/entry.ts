import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { code, msg, data } = await req.json();

        console.log('Received stem separation callback:', { code, msg, taskId: data?.task_id });

        if (code === 200 && data?.task_id && data?.vocal_separation_info) {
            const taskId = data.task_id;
            const stemInfo = data.vocal_separation_info;

            // Find the StemSeparation record
            const separations = await base44.asServiceRole.entities.StemSeparation.filter({ task_id: taskId });
            
            if (separations.length > 0) {
                const separation = separations[0];
                
                // Update with all stem URLs
                await base44.asServiceRole.entities.StemSeparation.update(separation.id, {
                    status: 'ready',
                    vocal_url: stemInfo.vocal_url || stemInfo.vocalUrl,
                    instrumental_url: stemInfo.instrumental_url || stemInfo.instrumentalUrl,
                    backing_vocals_url: stemInfo.backing_vocals_url || stemInfo.backingVocalsUrl,
                    drums_url: stemInfo.drums_url || stemInfo.drumsUrl,
                    bass_url: stemInfo.bass_url || stemInfo.bassUrl,
                    guitar_url: stemInfo.guitar_url || stemInfo.guitarUrl,
                    keyboard_url: stemInfo.keyboard_url || stemInfo.keyboardUrl,
                    percussion_url: stemInfo.percussion_url || stemInfo.percussionUrl,
                    strings_url: stemInfo.strings_url || stemInfo.stringsUrl,
                    synth_url: stemInfo.synth_url || stemInfo.synthUrl,
                    fx_url: stemInfo.fx_url || stemInfo.fxUrl,
                    brass_url: stemInfo.brass_url || stemInfo.brassUrl,
                    woodwinds_url: stemInfo.woodwinds_url || stemInfo.woodwindsUrl,
                });
            }
        } else if (code !== 200 && data?.task_id) {
            // Handle failures
            const separations = await base44.asServiceRole.entities.StemSeparation.filter({ task_id: data.task_id });
            if (separations.length > 0) {
                await base44.asServiceRole.entities.StemSeparation.update(separations[0].id, {
                    status: 'failed',
                });
            }
        }

        return Response.json({ status: 'received' }, { status: 200 });

    } catch (error) {
        console.error('Error in stemCallback:', error);
        return Response.json({ status: 'received', error: error.message }, { status: 200 });
    }
});