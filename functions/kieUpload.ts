import { createClientFromRequest } from './_shared/supabaseClient.ts';
import { getAppSettings, getKieApiKey } from './_shared/appSettings.ts';

const FILE_API_BASE = 'https://kieai.redpandaai.co';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uploadType, fileUrl, base64Data, uploadPath = 'uploads', fileName } = await req.json();
    if (!uploadType) {
      return Response.json({ error: 'uploadType is required' }, { status: 400 });
    }

    const settings = await getAppSettings(base44);
    const apiKey = getKieApiKey(settings);
    if (!apiKey) {
      return Response.json({ error: 'KIE API key not configured' }, { status: 500 });
    }

    let endpoint = '';
    let body: BodyInit;
    let headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
    };

    if (uploadType === 'url') {
      endpoint = '/api/file-url-upload';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ fileUrl, uploadPath, fileName });
    } else if (uploadType === 'base64') {
      endpoint = '/api/file-base64-upload';
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ base64Data, uploadPath, fileName });
    } else {
      return Response.json({ error: 'Unsupported uploadType' }, { status: 400 });
    }

    const response = await fetch(`${FILE_API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body,
    });

    const data = await response.json();

    if (!response.ok || data.code !== 200) {
      return Response.json({ error: data.msg || 'Upload failed', details: data }, { status: 400 });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error('Error in kieUpload:', error);
    return Response.json({ error: error.message || 'Upload error' }, { status: 500 });
  }
});
