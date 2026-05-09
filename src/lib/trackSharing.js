export function slugifyTrack(text = 'track') {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'track';
}

export function getTrackPublicSlug(track) {
  if (!track) return 'track';
  return track.public_slug || `${slugifyTrack(track.title)}-${String(track.id || '').slice(0, 8)}`;
}

export function getPublicTrackUrl(track, origin = window.location.origin) {
  const slug = getTrackPublicSlug(track);
  return `${origin}/PublicTrack?id=${encodeURIComponent(track.id)}&slug=${encodeURIComponent(slug)}`;
}

export function getSeoDescription(track) {
  const style = track?.style || track?.tags || 'AI generated music';
  const prompt = track?.prompt ? ` Created from: ${track.prompt}` : '';
  return `${track?.title || 'Track'} by ${track?.created_by?.split('@')[0] || 'Accoustica'} - ${style}.${prompt}`.slice(0, 220);
}
