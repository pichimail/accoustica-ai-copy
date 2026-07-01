/**
 * Accoustica LLM service.
 *
 * Security note: this client deliberately does not read OpenRouter/OpenAI keys.
 * All provider calls go through the Base44 `invokeLLM` server function.
 */

import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { formatErrorForUser } from './llmErrorHandler';

/**
 * @typedef {'openrouter' | 'openai'} LLMProvider
 */

/**
 * @typedef {Record<string, unknown> | null} JsonSchema
 */

/**
 * @typedef {object} InvokeParams
 * @property {string} prompt
 * @property {string | null} [model]
 * @property {JsonSchema} [response_json_schema]
 * @property {boolean} [add_context_from_internet]
 * @property {string[] | null} [file_urls]
 * @property {number} [temperature]
 * @property {number} [max_tokens]
 * @property {LLMProvider} [provider]
 */

/**
 * @typedef {object} LLMCallMeta
 * @property {string} callId
 * @property {LLMProvider | string} provider
 * @property {string} model
 * @property {number} duration
 * @property {number} promptLength
 * @property {boolean} success
 * @property {string} [error]
 */

function toErrorMessage(value) {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'message' in value) return String(value.message);
  return 'Unknown error';
}

class LLMService {
  constructor() {
    /** @type {Array<LLMCallMeta & { timestamp: string }>} */
    this.callHistory = [];
    this.lastProvider = null;
    this.lastError = null;
  }

  /**
   * @param {InvokeParams} params
   * @returns {Promise<any>}
   */
  async invoke(params) {
    const {
      prompt,
      model = null,
      response_json_schema = null,
      add_context_from_internet = false,
      file_urls = null,
      temperature = 0.7,
      max_tokens = 2000,
      provider = 'openrouter',
    } = params || {};

    if (!prompt || !String(prompt).trim()) throw new Error('Prompt is required');

    const callId = this._generateCallId();
    const startTime = Date.now();

    try {
      const res = await base44.functions.invoke('invokeLLM', {
        prompt,
        model,
        response_json_schema,
        add_context_from_internet,
        file_urls,
        temperature,
        max_tokens,
        provider,
      });

      const payload = res?.data || res;
      if (!payload?.success) {
        throw new Error(payload?.error || 'LLM request failed');
      }

      const duration = Date.now() - startTime;
      this.lastProvider = payload.provider || provider;
      this.lastError = null;
      this._logCall({
        callId,
        provider: payload.provider || provider,
        model: payload.model || model || 'server-default',
        duration,
        promptLength: String(prompt).length,
        success: true,
      });

      if (payload.fallback) {
        toast.info(`Using ${payload.provider} fallback`, { duration: 2000 });
      }

      return payload.output;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.lastError = error;
      this._logCall({
        callId,
        provider,
        model: model || 'server-default',
        duration,
        promptLength: String(prompt).length,
        success: false,
        error: toErrorMessage(error),
      });

      const userMessage = formatErrorForUser(error);
      console.error('[LLM] Error:', error);
      toast.error(userMessage, { duration: 4000 });
      throw error;
    }
  }

  _generateCallId() {
    return `llm_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /** @param {LLMCallMeta} meta */
  _logCall(meta) {
    this.callHistory.push({
      ...meta,
      timestamp: new Date().toISOString(),
    });

    if (this.callHistory.length > 100) {
      this.callHistory = this.callHistory.slice(-100);
    }

    if (typeof window !== 'undefined') {
      window.__LLM_CALL_HISTORY__ = this.callHistory;
    }
  }

  getStats() {
    const successCalls = this.callHistory.filter((c) => c.success);
    return {
      totalCalls: this.callHistory.length,
      successCount: successCalls.length,
      errorCount: this.callHistory.length - successCalls.length,
      averageDuration: successCalls.length
        ? Math.round(successCalls.reduce((sum, c) => sum + c.duration, 0) / successCalls.length)
        : 0,
      lastProvider: this.lastProvider,
      lastError: this.lastError,
    };
  }

  getHistory(filter = {}) {
    let rows = [...this.callHistory];
    if (filter.provider) rows = rows.filter((c) => c.provider === filter.provider);
    if (filter.success !== undefined) rows = rows.filter((c) => c.success === filter.success);
    return rows;
  }

  clearHistory() {
    this.callHistory = [];
    this.lastProvider = null;
    this.lastError = null;
  }
}

export const llmService = new LLMService();
export default llmService;
