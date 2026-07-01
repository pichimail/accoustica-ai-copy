/// <reference types="vite/client" />
import 'react';

interface ImportMetaEnv {
  readonly VITE_BASE44_APP_ID?: string;
  readonly VITE_BASE44_BACKEND_URL?: string;
  readonly VITE_LLM_PRIMARY_PROVIDER?: string;
  readonly VITE_LLM_ENABLE_FALLBACK?: string;
  readonly VITE_LLM_TIMEOUT_MS?: string;
  readonly VITE_LLM_MAX_RETRIES?: string;
  readonly VITE_LLM_DEBUG?: string;
  readonly VITE_OPENROUTER_MODEL?: string;
  readonly VITE_OPENAI_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global type augmentations for window properties
declare global {
  interface Window {
    __LLM_CALL_HISTORY_: string | Array<any>;
    __LLM_CALL_HISTORY__: string | Array<any>;
    webkitAudioContext?: typeof AudioContext;
  }
}

declare module 'react' {
  // Loosen JS forwardRef inference in checkJs projects to avoid overly narrow Ref-only props.
  function forwardRef(render: any): any;

  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}

export {};
