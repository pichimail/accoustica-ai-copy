import { useEffect } from 'react';
import { toast } from 'sonner';

const STORAGE_KEY = 'accoustica_generation_last_click_at';
const COOLDOWN_MS = 5000;
const ACTION_LABELS = new Set(['generate', 'generating...', 'remix', 'mashup']);

function getActionButton(target) {
  const button = target?.closest?.('button');
  if (!button) return null;

  const label = String(button.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!ACTION_LABELS.has(label)) return null;
  return button;
}

export default function GenerationClickGuard() {
  useEffect(() => {
    const onClickCapture = (event) => {
      const button = getActionButton(event.target);
      if (!button) return;
      if (button.disabled || button.getAttribute('aria-busy') === 'true') return;

      const now = Date.now();
      const lastClick = Number(sessionStorage.getItem(STORAGE_KEY) || 0);
      const remainingMs = COOLDOWN_MS - (now - lastClick);

      if (remainingMs > 0) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        toast.warning(`Generation is cooling down. Try again in ${Math.ceil(remainingMs / 1000)}s.`);
        return;
      }

      sessionStorage.setItem(STORAGE_KEY, String(now));
    };

    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, []);

  return null;
}
