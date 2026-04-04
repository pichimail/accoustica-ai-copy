import { useEffect, useRef } from 'react';

/**
 * Extracts dominant color from album art and calls onColor with { r, g, b, css }
 */
export function useAlbumColor(imageUrl, onColor) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!imageUrl) {
      onColor(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 24, 24);
        const data = ctx.getImageData(0, 0, 24, 24).data;

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2];
          // Skip very dark or very light pixels
          const brightness = 0.299 * pr + 0.587 * pg + 0.114 * pb;
          if (brightness > 20 && brightness < 235) {
            r += pr; g += pg; b += pb; count++;
          }
        }
        if (count === 0) { onColor(null); return; }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Boost saturation
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (sat < 0.15) {
          // desaturated — use violet fallback
          onColor({ r: 124, g: 58, b: 237, css: 'rgba(124,58,237' });
          return;
        }

        onColor({ r, g, b, css: `rgba(${r},${g},${b}` });
      } catch {
        onColor(null);
      }
    };

    img.onerror = () => onColor(null);
  }, [imageUrl]);
}