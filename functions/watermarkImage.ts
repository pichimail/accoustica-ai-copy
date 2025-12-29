import { createClientFromRequest } from './_shared/supabaseClient.ts';
import { encode as base64Encode } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';
import { getAppSettings, getKieApiKey, isFeatureEnabled } from './_shared/appSettings.ts';

const FILE_API_BASE = 'https://kieai.redpandaai.co';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl, fileName = 'cover-watermarked.jpg' } = await req.json();
    if (!imageUrl) {
      return Response.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const settings = await getAppSettings(base44);
    if (!isFeatureEnabled(settings, 'cover_art')) {
      return Response.json({ error: 'Cover art is disabled' }, { status: 403 });
    }
    const apiKey = getKieApiKey(settings);
    if (!apiKey) {
      return Response.json({ error: 'KIE API key not configured' }, { status: 500 });
    }

    const logoUrl = settings.watermark_logo_url;
    if (!logoUrl) {
      return Response.json({ error: 'watermark_logo_url not configured' }, { status: 500 });
    }

    const [imageRes, logoRes] = await Promise.all([fetch(imageUrl), fetch(logoUrl)]);
    if (!imageRes.ok || !logoRes.ok) {
      return Response.json({ error: 'Failed to fetch image or logo' }, { status: 400 });
    }

    const imageBytes = new Uint8Array(await imageRes.arrayBuffer());
    const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
    const image = await Image.decode(imageBytes);
    const logo = await Image.decode(logoBytes);

    const targetWidth = Math.max(80, Math.floor(image.width * 0.18));
    const resizedLogo = logo.resize(targetWidth, Image.RESIZE_AUTO);

    const margin = Math.max(16, Math.floor(image.width * 0.02));
    const x = image.width - resizedLogo.width - margin;
    const y = image.height - resizedLogo.height - margin;

    image.composite(resizedLogo, x, y);

    const jpeg = await image.encodeJPEG(90);
    const base64 = base64Encode(jpeg);

    const uploadResponse = await fetch(`${FILE_API_BASE}/api/file-base64-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Data: `data:image/jpeg;base64,${base64}`,
        uploadPath: 'covers',
        fileName,
      }),
    });

    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok || uploadData.code !== 200) {
      return Response.json({ error: uploadData.msg || 'Upload failed' }, { status: 400 });
    }

    return Response.json({
      success: true,
      fileUrl: uploadData.data?.fileUrl,
    });
  } catch (error) {
    console.error('Error in watermarkImage:', error);
    return Response.json({ error: error.message || 'Watermarking failed' }, { status: 500 });
  }
});
