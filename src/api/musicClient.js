/**
 * Music Generation & Processing Client
 *
 * Abstracts all Base44 backend function calls for music generation,
 * mastering, stem separation, remixing, etc.
 *
 * Components must use this instead of calling base44.functions.invoke() directly.
 *
 * TODO_EXPORT_REPLACE_WITH_NEXT_API:
 *   Replace base44.functions.invoke('functionName', payload) with:
 *     fetch('/api/music/functionName', { method: 'POST', body: JSON.stringify(payload) })
 *   or custom Next.js API route handlers.
 *   The payload shapes and return structures should remain identical.
 *
 * TODO_EXPORT — MUSIC_PROVIDER:
 *   After export, the actual audio generation must remain provider-backed
 *   (Kie.ai / Suno API) and run server-side. These wrappers become
 *   thin fetch() calls to your Next.js API routes.
 */

import { base44 } from '@/api/base44Client';

// ─── Core Generation ─────────────────────────────────────────────────────────

/**
 * Generate a new music track.
 * Supports simple, advanced (custom), and full regeneration modes.
 *
 * @param {object} payload
 * @param {string} payload.mode - 'simple' or 'custom'
 * @param {string} [payload.prompt]
 * @param {string} [payload.style]
 * @param {string} [payload.title]
 * @param {boolean} [payload.instrumental]
 * @param {string} [payload.model] - e.g. 'V5_5'
 * @param {object} [payload.*]
 * @returns {Promise<{ data: { success: boolean, taskId?: string, error?: string } }>}
 */
export async function generate(payload) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API:
  //   const res = await fetch('/api/music/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  //   return res.json();
  return base44.functions.invoke('generateMusic', payload);
}

/**
 * Check the status of a generation task.
 *
 * @param {string} taskId
 * @returns {Promise<{ data: { success: boolean, tracks?: Array, error?: string } }>}
 */
export async function checkStatus(taskId) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('checkMusicStatus', { taskId });
}

/**
 * Retry a failed track generation using its original parameters.
 *
 * @param {object} track - The failed track record
 * @param {string} track.prompt
 * @param {string} [track.style]
 * @param {string} [track.title]
 * @returns {Promise<{ data: { success: boolean, taskId?: string, error?: string } }>}
 */
export async function retry(track) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('generateMusic', {
    mode: 'custom',
    model: 'V5_5',
    prompt: track.prompt || track.lyrics || '',
    style: track.style || track.tags || '',
    title: track.title || 'Retry',
    customMode: true,
    instrumental: track.is_instrumental || false,
  });
}

/**
 * Get detailed music information for a task.
 *
 * @param {string} taskId
 * @returns {Promise<{ data: { tracks?: Array, error?: string } }>}
 */
export async function getDetails(taskId) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('getMusicDetails', { taskId });
}

// ─── Remixing & Modification ─────────────────────────────────────────────────

/**
 * Remix/cover an uploaded audio source.
 *
 * @param {object} payload
 * @returns {Promise<{ data: { success: boolean, taskId?: string, error?: string } }>}
 */
export async function uploadAndCover(payload) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('uploadAndCoverAudio', payload);
}

/**
 * Generate a mashup from two tracks.
 *
 * @param {object} payload
 * @returns {Promise<{ data: { success: boolean, taskId?: string, error?: string } }>}
 */
export async function generateMashup(payload) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('generateMashup', payload);
}

/**
 * Replace a section of a track.
 *
 * @param {object} payload
 * @returns {Promise<{ data: { success: boolean, taskId?: string, error?: string } }>}
 */
export async function replaceSection(payload) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('replaceSection', payload);
}

/**
 * Extend a track from a given point.
 *
 * @param {object} payload
 * @returns {Promise<{ data: { success: boolean, taskId?: string, error?: string } }>}
 */
export async function extendMusic(payload) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('extendMusic', payload);
}

// ─── Audio Processing ────────────────────────────────────────────────────────

/**
 * Master a track with the given parameters.
 *
 * @param {object} payload
 * @returns {Promise<{ data: { success: boolean, processedUrl?: string, error?: string } }>}
 */
export async function master(payload) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('masterAudio', payload);
}

/**
 * Separate vocals from a track (stem separation).
 *
 * @param {object} payload
 * @returns {Promise<{ data: { success: boolean, error?: string } }>}
 */
export async function separateVocals(payload) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('separateVocals', payload);
}

/**
 * Get timestamped lyrics for a track.
 *
 * @param {string} trackId
 * @returns {Promise<{ data: { lyrics?: Array<{ text: string, start: number, end: number }>, error?: string } }>}
 */
export async function getTimestampedLyrics(trackId) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('getTimestampedLyrics', { trackId });
}

/**
 * Generate lyrics via the music provider.
 *
 * @param {object} payload
 * @returns {Promise<{ data: { success: boolean, lyrics?: string, error?: string } }>}
 */
export async function generateLyrics(payload) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('generateLyrics', payload);
}

// ─── Sound Profile ───────────────────────────────────────────────────────────

/**
 * Get the current sound profile.
 *
 * @returns {Promise<{ data: { profile?: object } }>}
 */
export async function getSoundProfile() {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('getSoundProfile', {});
}

/**
 * Save the sound profile.
 *
 * @param {object} profile
 * @returns {Promise<{ data: { success?: boolean } }>}
 */
export async function saveSoundProfile(profile) {
  // TODO_EXPORT_REPLACE_WITH_NEXT_API
  return base44.functions.invoke('saveSoundProfile', profile);
}

export default {
  generate,
  checkStatus,
  retry,
  getDetails,
  uploadAndCover,
  generateMashup,
  replaceSection,
  extendMusic,
  master,
  separateVocals,
  getTimestampedLyrics,
  generateLyrics,
  getSoundProfile,
  saveSoundProfile,
};