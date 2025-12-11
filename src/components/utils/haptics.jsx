// Haptic feedback utility for mobile-like experience
export const haptics = {
  // Light tap feedback
  light: () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  // Medium impact feedback
  medium: () => {
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  },

  // Heavy impact feedback
  heavy: () => {
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  },

  // Success feedback
  success: () => {
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  // Error feedback
  error: () => {
    if (navigator.vibrate) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  // Selection feedback
  selection: () => {
    if (navigator.vibrate) {
      navigator.vibrate(5);
    }
  },
};