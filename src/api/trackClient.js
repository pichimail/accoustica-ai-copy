/**
 * Track & Entity Client
 *
 * Provides a clean abstraction over Track and related entity CRUD operations.
 * Components must use this instead of calling base44.entities.Track.* directly.
 *
 * TODO_EXPORT_REPLACE_WITH_NEON_DB:
 *   Replace all base44.entities.Track.* calls with NeonDB queries.
 *   Use Drizzle ORM or a simple query builder.
 *
 *   Example replacement:
 *     trackClient.list(query, sort, limit)
 *       → db.select().from(tracks).where(eq(tracks.created_by, user.email)).orderBy(desc(tracks.created_date)).limit(limit)
 *
 *     trackClient.create(data)
 *       → db.insert(tracks).values({ ...data, created_by: user.email }).returning()
 *
 *     trackClient.update(id, data)
 *       → db.update(tracks).set(data).where(eq(tracks.id, id))
 *
 *     trackClient.delete(id)
 *       → db.delete(tracks).where(eq(tracks.id, id))
 */

import { base44 } from '@/api/base44Client';

// ─── Track Operations ────────────────────────────────────────────────────────

/**
 * List user's tracks with optional sort and limit.
 * @param {object} query - Filter query (e.g. { created_by: user.email })
 * @param {string} [sort='-created_date']
 * @param {number} [limit=100]
 * @returns {Promise<Array>}
 */
export async function listTracks(query, sort = '-created_date', limit = 100) {
  return base44.entities.Track.filter(query, sort, limit);
}

/**
 * Get a single track by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getTrack(id) {
  try {
    const results = await base44.entities.Track.filter({ id }, undefined, 1);
    return results[0] || null;
  } catch {
    return null;
  }
}

/**
 * Create a new track record.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createTrack(data) {
  return base44.entities.Track.create(data);
}

/**
 * Update an existing track.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function updateTrack(id, data) {
  return base44.entities.Track.update(id, data);
}

/**
 * Delete a track.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteTrack(id) {
  return base44.entities.Track.delete(id);
}

/**
 * Subscribe to real-time track changes.
 * @param {function} callback - Receives { id, type: 'create'|'update'|'delete', data }
 * @returns {function} Unsubscribe function
 */
export function subscribeToTracks(callback) {
  return base44.entities.Track.subscribe(callback);
}

// ─── Related Entity Operations ───────────────────────────────────────────────

/**
 * List TrackVersion records for a parent track.
 * @param {string} parentTrackId
 * @param {number} [limit=15]
 * @returns {Promise<Array>}
 */
export async function listTrackVersions(parentTrackId, limit = 15) {
  // TODO_EXPORT_REPLACE_WITH_NEON_DB:
  //   db.select().from(trackVersions).where(eq(trackVersions.parent_track_id, parentTrackId))
  return base44.entities.TrackVersion.filter({ parent_track_id: parentTrackId }, '-created_date', limit);
}

/**
 * Create a TrackVersion record.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createTrackVersion(data) {
  return base44.entities.TrackVersion.create(data);
}

/**
 * List TrackComment records for a track.
 * @param {string} trackId
 * @returns {Promise<Array>}
 */
export async function listTrackComments(trackId) {
  return base44.entities.TrackComment.filter({ track_id: trackId }, '-created_date', 100);
}

/**
 * Create a TrackComment.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createTrackComment(data) {
  return base44.entities.TrackComment.create(data);
}

/**
 * Create a TrackLike.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createTrackLike(data) {
  return base44.entities.TrackLike.create(data);
}

/**
 * Delete a TrackLike by ID.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteTrackLike(id) {
  return base44.entities.TrackLike.delete(id);
}

/**
 * Create a TrackPlay record.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createTrackPlay(data) {
  return base44.entities.TrackPlay.create(data);
}

// ─── Persona Operations ──────────────────────────────────────────────────────

/**
 * List personas for the current user.
 * @returns {Promise<Array>}
 */
export async function listPersonas() {
  return base44.entities.Persona.list('-created_date', 100);
}

// ─── Aggregate Queries (cross-entity) ────────────────────────────────────────

/**
 * Get all public ready tracks (for discovery feeds).
 * @param {string} [sort='-plays']
 * @param {number} [limit=200]
 * @returns {Promise<Array>}
 */
export async function listPublicTracks(sort = '-plays', limit = 200) {
  return base44.entities.Track.filter({ is_public: true, status: 'ready' }, sort, limit);
}

/**
 * Get all TrackLikes.
 * @param {number} [limit=2000]
 * @returns {Promise<Array>}
 */
export async function listAllLikes(limit = 2000) {
  return base44.entities.TrackLike.list('-created_date', limit);
}

/**
 * Get all TrackComments.
 * @param {number} [limit=2000]
 * @returns {Promise<Array>}
 */
export async function listAllComments(limit = 2000) {
  return base44.entities.TrackComment.list('-created_date', limit);
}

export default {
  listTracks,
  getTrack,
  createTrack,
  updateTrack,
  deleteTrack,
  subscribeToTracks,
  listTrackVersions,
  createTrackVersion,
  listTrackComments,
  createTrackComment,
  createTrackLike,
  deleteTrackLike,
  createTrackPlay,
  listPersonas,
  listPublicTracks,
  listAllLikes,
  listAllComments,
};