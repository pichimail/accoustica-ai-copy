import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { audio_url, title } = await req.json();
    if (!audio_url) return Response.json({ error: 'audio_url required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // Fetch the audio file
    const audioRes = await fetch(audio_url);
    if (!audioRes.ok) return Response.json({ error: 'Failed to fetch audio file' }, { status: 500 });
    const audioBuffer = await audioRes.arrayBuffer();

    const fileName = `${title || 'track'}.mp3`;
    const mimeType = 'audio/mpeg';

    // Ensure Accoustica folder exists
    const folderSearchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'Accoustica'%20and%20mimeType%3D'application%2Fvnd.google-apps.folder'%20and%20trashed%3Dfalse&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const folderData = await folderSearchRes.json();
    let folderId;

    if (folderData.files && folderData.files.length > 0) {
      folderId = folderData.files[0].id;
    } else {
      // Create folder
      const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Accoustica', mimeType: 'application/vnd.google-apps.folder' })
      });
      const newFolder = await createFolderRes.json();
      folderId = newFolder.id;
    }

    // Multipart upload
    const boundary = 'accoustica_boundary';
    const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
    const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
    const mediaPart = `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const closePart = `\r\n--${boundary}--`;

    const metaBytes = new TextEncoder().encode(metaPart);
    const mediaHeaderBytes = new TextEncoder().encode(mediaPart);
    const closeBytes = new TextEncoder().encode(closePart);
    const audioBytes = new Uint8Array(audioBuffer);

    const body = new Uint8Array(metaBytes.length + mediaHeaderBytes.length + audioBytes.length + closeBytes.length);
    let offset = 0;
    body.set(metaBytes, offset); offset += metaBytes.length;
    body.set(mediaHeaderBytes, offset); offset += mediaHeaderBytes.length;
    body.set(audioBytes, offset); offset += audioBytes.length;
    body.set(closeBytes, offset);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
      }
    );

    const result = await uploadRes.json();
    if (!uploadRes.ok) return Response.json({ error: result.error?.message || 'Upload failed' }, { status: 500 });

    return Response.json({ success: true, file_id: result.id, file_name: result.name, web_view_link: result.webViewLink });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});