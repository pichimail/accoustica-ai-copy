// @ts-nocheck
// Singleton AudioContext manager — prevents "MediaElementSource already connected" errors
let _ctx = null;
let _analyser = null;
let _source = null;
let _connectedEl = null;

export function getAudioAnalyser(audioElement) {
  if (!audioElement) return null;

  // Reuse if already connected to same element
  if (_analyser && _connectedEl === audioElement) {
    if (_ctx?.state === 'suspended') _ctx.resume().catch(() => {});
    return _analyser;
  }

  try {
    if (!_ctx) {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});

    // Only create source once per element
    if (_connectedEl !== audioElement) {
      _analyser = _ctx.createAnalyser();
      _analyser.fftSize = 256;
      _analyser.smoothingTimeConstant = 0.8;
      _source = _ctx.createMediaElementSource(audioElement);
      _source.connect(_analyser);
      _analyser.connect(_ctx.destination);
      _connectedEl = audioElement;
    }

    return _analyser;
  } catch (e) {
    // Already connected — return whatever we have
    return _analyser;
  }
}

export function resumeAudioContext() {
  if (_ctx?.state === 'suspended') _ctx.resume().catch(() => {});
}