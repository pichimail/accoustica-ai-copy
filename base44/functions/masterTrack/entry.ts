import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      track_id, 
      audio_url, 
      loudness, 
      compression, 
      bass_boost, 
      high_boost, 
      stereo_width,
      spectral_repair,
      multiband_compression
    } = await req.json();

    // Get original track
    const originalTrack = await base44.asServiceRole.entities.Track.filter({ id: track_id });
    if (!originalTrack || originalTrack.length === 0) {
      return Response.json({ error: 'Original track not found' }, { status: 404 });
    }
    
    const track = originalTrack[0];

    // Create a mastered track record with "Mastered" tag
    const masteredTrack = await base44.asServiceRole.entities.Track.create({
      title: `${track.title} (Mastered)`,
      prompt: track.prompt,
      style: track.style,
      tags: 'Mastered',
      audio_url: audio_url,
      stream_audio_url: track.stream_audio_url,
      cover_image_url: track.cover_image_url,
      duration: track.duration,
      status: 'ready',
      created_by: user.email,
      parent_track_id: track_id,
      is_instrumental: track.is_instrumental,
      model_version: track.model_version,
      lyrics: track.lyrics,
    });

    // Store mastering preset
    await base44.asServiceRole.entities.MasteringPreset.create({
      preset_name: `Master - ${track.title}`,
      description: `Mastered: ${loudness} LUFS, ${compression}% comp, Bass: ${bass_boost}dB, Highs: ${high_boost}dB`,
      loudness: loudness,
      compression: compression,
      bass_boost: bass_boost,
      high_boost: high_boost,
      stereo_width: stereo_width,
      created_by: user.email,
    });

    return Response.json({ 
      success: true, 
      mastered_url: audio_url,
      mastered_track_id: masteredTrack.id,
      message: 'Track mastered and saved separately'
    });
  } catch (error) {
    console.error('Mastering error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});