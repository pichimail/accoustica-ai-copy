/**
 * Centralized Track Status Labels
 * Replaces raw status strings and "Loading..." / "Placeholder" text across the app.
 *
 * TODO_EXPORT: This utility is fully portable — no Base44 dependencies.
 * It can be copied directly into the Next.js export as-is.
 */

const STATUS_LABEL_MAP = {
  queued: 'Queued for Generation',
  generating: 'Generating your track...',
  ready: 'Ready',
  failed: 'Generation Failed',
};

/**
 * Returns a human-readable label for a track status.
 * Falls back to the raw status string if unknown.
 *
 * @param {string} status - The Track.status field value
 * @returns {string}
 */
export function getTrackStatusLabel(status) {
  return STATUS_LABEL_MAP[status] || status || 'Unknown Status';
}

/**
 * Returns a CSS-safe color key for a status, usable for styling.
 *
 * @param {string} status
 * @returns {{ color: string, bg: string }}
 */
export function getTrackStatusStyle(status) {
  const styles = {
    ready: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    generating: { color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
    queued: { color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
    failed: { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  };
  return styles[status] || { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' };
}