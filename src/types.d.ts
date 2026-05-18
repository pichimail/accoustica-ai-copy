// Global type augmentations for window properties
declare global {
  interface Window {
    __LLM_CALL_HISTORY_: string | Array<any>;
    __LLM_CALL_HISTORY__: string | Array<any>;
  }
}

export {};
