import { createClientFromRequest } from './_shared/supabaseClient.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { code, msg, data } = await req.json();

        console.log('Received cover callback:', { code, msg, taskId: data?.taskId });

        if (code === 200 && data?.taskId && data?.images) {
            // Find tracks with the original taskId and update their cover images
            // Note: The cover callback returns a different taskId, so we'd need to store the mapping
            // For now, we'll just log the images
            console.log('Cover images generated:', data.images);
        }

        return Response.json({ status: 'received' }, { status: 200 });

    } catch (error) {
        console.error('Error in coverCallback:', error);
        return Response.json({ status: 'received', error: error.message }, { status: 200 });
    }
});