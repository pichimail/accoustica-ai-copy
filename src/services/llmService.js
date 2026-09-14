/**
 * Universal LLM Service
 * Provides OpenRouter → OpenAI fallback capability
 * Preserves all original InvokeLLM prompts and behavior
 * 
 * Usage:
 * import { llmService } from '@/services/llmService';
 * const response = await llmService.invoke({ prompt, response_json_schema, ... });
 */

import axios from 'axios';
import { toast } from 'sonner';
import { classifyLLMError, formatErrorForUser } from './llmErrorHandler';

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
 * @property {LLMProvider} provider
 * @property {string} model
 * @property {number} duration
 * @property {number} promptLength
 * @property {boolean} success
 * @property {string} [error]
 */

/**
 * @typedef {LLMCallMeta & { timestamp: string }} LLMCallRecord
 */

/**
 * @param {unknown} value
 * @returns {string}
 */
function toErrorMessage(value) {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  return 'Unknown error';
}

/**
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function getEnv(key, fallback = '') {
  const env = /** @type {ImportMetaEnv} */ (import.meta.env);
  const value = env[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * @param {string} key
 * @returns {string | undefined}
 */
function getOptionalEnv(key) {
  const env = /** @type {ImportMetaEnv} */ (import.meta.env);
  const value = env[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

// Configuration from environment
const CONFIG = {
  primaryProvider: /** @type {LLMProvider} */ (getEnv('VITE_LLM_PRIMARY_PROVIDER', 'openrouter')),
  enableFallback: getEnv('VITE_LLM_ENABLE_FALLBACK', 'false') === 'true',
  timeoutMs: parseInt(getEnv('VITE_LLM_TIMEOUT_MS', '30000'), 10),
  maxRetries: parseInt(getEnv('VITE_LLM_MAX_RETRIES', '2'), 10),
  debug: getEnv('VITE_LLM_DEBUG', 'false') === 'true',
};

// API Keys
const KEYS = {
  openrouter: getOptionalEnv('VITE_OPENROUTER_API_KEY'),
  openai: getOptionalEnv('VITE_OPENAI_API_KEY'),
};

// Models
const MODELS = {
  openrouter: getEnv('VITE_OPENROUTER_MODEL', 'openrouter/auto'),
  openai: getEnv('VITE_OPENAI_MODEL', 'gpt-4-turbo-preview'),
};

class LLMService {
  constructor() {
    /** @type {LLMCallRecord[]} */
    this.callHistory = [];
    /** @type {LLMProvider | null} */
    this.lastProvider = null;
    /** @type {unknown} */
    this.lastError = null;
    /** @type {number} */
    this.retryCount = 0;
  }

  /**
   * Main invoke method - handles both OpenRouter and OpenAI
   * Maintains backward compatibility with InvokeLLM interface
   */
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
      provider = CONFIG.primaryProvider,
    } = params;

    if (!prompt) throw new Error('Prompt is required');

    // Validate API keys
    if (!KEYS[provider]) {
      const error = new Error(`No API key configured for ${provider}`);
      console.error('[LLM Service]', error.message);
      throw error;
    }

    const callId = this._generateCallId();
    const startTime = Date.now();
    /** @type {LLMProvider} */
    let usedProvider = provider;

    if (CONFIG.debug) {
      console.log(`[LLM] Starting call:`, {
        callId,
        provider,
        prompt: prompt.substring(0, 100) + '...',
      });
    }

    try {
      // Try primary provider
      let response;
      let error = null;

      try {
        if (provider === 'openrouter') {
          response = await this._invokeOpenRouter({
            prompt,
            model,
            response_json_schema,
            temperature,
            max_tokens,
          });
        } else {
          response = await this._invokeOpenAI({
            prompt,
            model,
            response_json_schema,
            temperature,
            max_tokens,
          });
        }
        this.lastProvider = usedProvider;
        this.lastError = null;
      } catch (primaryError) {
        error = primaryError;

        // Try fallback if enabled
        if (CONFIG.enableFallback && this.retryCount < CONFIG.maxRetries) {
          const fallbackProvider = provider === 'openrouter' ? 'openai' : 'openrouter';

          if (!KEYS[fallbackProvider]) {
            throw primaryError; // Fallback not configured
          }

          if (CONFIG.debug) {
            console.log(`[LLM] Fallback to ${fallbackProvider}:`, {
              callId,
              reason: toErrorMessage(primaryError),
            });
          }

          this.retryCount++;

          try {
            if (fallbackProvider === 'openrouter') {
              response = await this._invokeOpenRouter({
                prompt,
                model,
                response_json_schema,
                temperature,
                max_tokens,
              });
            } else {
              response = await this._invokeOpenAI({
                prompt,
                model,
                response_json_schema,
                temperature,
                max_tokens,
              });
            }

            usedProvider = fallbackProvider;
            this.lastProvider = usedProvider;
            this.lastError = null;
            toast.info(`Using ${fallbackProvider} (fallback)`, { duration: 2000 });
          } catch (fallbackError) {
            this.lastError = fallbackError;
            throw new Error(
              `Both providers failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`
            );
          }
        } else {
          this.lastError = error;
          throw error;
        }
      }

      const duration = Date.now() - startTime;

      // Log successful call
      this._logCall({
        callId,
        provider: usedProvider,
        model: model || MODELS[usedProvider],
        duration,
        promptLength: prompt.length,
        success: true,
      });

      this.retryCount = 0;

      if (CONFIG.debug) {
        console.log(`[LLM] Success (${duration}ms):`, response);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed call
      this._logCall({
        callId,
        provider: usedProvider,
        model: model || MODELS[usedProvider],
        duration,
        promptLength: prompt.length,
        success: false,
        error: toErrorMessage(error),
      });

      const userMessage = formatErrorForUser(error);
      console.error(`[LLM] Error:`, error);

      // Only show toast for first error, not retries
      if (this.retryCount === 0) {
        toast.error(userMessage, { duration: 4000 });
      }

      throw error;
    }
  }

  /**
   * OpenRouter API call
   */
  /**
   * @param {{ prompt: string; model: string | null; response_json_schema: JsonSchema; temperature: number; max_tokens: number }} params
   * @returns {Promise<any>}
   */
  async _invokeOpenRouter({ prompt, model, response_json_schema, temperature, max_tokens }) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const selectedModel = model || MODELS.openrouter;

    const systemMessage = response_json_schema
      ? `You are a helpful AI assistant. Respond with valid JSON matching this schema: ${JSON.stringify(response_json_schema)}.`
      : 'You are a helpful AI assistant.';

    const payload = {
      model: selectedModel,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${KEYS.openrouter}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'app',
          'Content-Type': 'application/json',
        },
        timeout: CONFIG.timeoutMs,
      });

      const content = response.data.choices[0]?.message?.content || '';

      if (response_json_schema) {
        try {
          return JSON.parse(content);
        } catch {
          return content;
        }
      }

      return content;
    } catch (error) {
      const e = /** @type {any} */ (error);
      const errorMsg = e?.response?.data?.error?.message || toErrorMessage(error);
      throw new Error(`OpenRouter: ${errorMsg}`);
    }
  }

  /**
   * OpenAI API call
   */
  /**
   * @param {{ prompt: string; model: string | null; response_json_schema: JsonSchema; temperature: number; max_tokens: number }} params
   * @returns {Promise<any>}
   */
  async _invokeOpenAI({ prompt, model, response_json_schema, temperature, max_tokens }) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const selectedModel = model || MODELS.openai;

    const systemMessage = response_json_schema
      ? `You are a helpful AI assistant. Respond with valid JSON matching this schema: ${JSON.stringify(response_json_schema)}.`
      : 'You are a helpful AI assistant.';

    const payload = {
      model: selectedModel,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens,
    };

    if (response_json_schema && selectedModel.includes('gpt-4')) {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const response = await axios.post(url, /** @type {any} */ (payload), {
        headers: {
          'Authorization': `Bearer ${KEYS.openai}`,
          'Content-Type': 'application/json',
        },
        timeout: CONFIG.timeoutMs,
      });

      const content = response.data.choices[0]?.message?.content || '';

      if (response_json_schema) {
        try {
          return JSON.parse(content);
        } catch {
          return content;
        }
      }

      return content;
    } catch (error) {
      const e = /** @type {any} */ (error);
      const errorMsg = e?.response?.data?.error?.message || toErrorMessage(error);
      throw new Error(`OpenAI: ${errorMsg}`);
    }
  }

  /**
   * Logging & Monitoring
   */
  _generateCallId() {
    return `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * @param {LLMCallMeta} meta
   * @returns {void}
   */
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

  /**
   * Get call statistics
   */
  getStats() {
    const stats = {
      totalCalls: this.callHistory.length,
      successCount: this.callHistory.filter((c) => c.success).length,
      errorCount: this.callHistory.filter((c) => !c.success).length,
      averageDuration: 0,
      lastProvider: this.lastProvider,
      lastError: this.lastError,
    };

    if (stats.successCount > 0) {
      const totalDuration = this.callHistory
        .filter((c) => c.success)
        .reduce((sum, c) => sum + c.duration, 0);
      stats.averageDuration = Math.round(totalDuration / stats.successCount);
    }

    return stats;
  }

  /**
   * Get call history
   */
  /**
   * @param {{ provider?: LLMProvider; success?: boolean }} [filter]
   * @returns {LLMCallRecord[]}
   */
  getHistory(filter = {}) {
    let filtered = [...this.callHistory];

    if (filter.provider) {
      filtered = filtered.filter((c) => c.provider === filter.provider);
    }
    if (filter.success !== undefined) {
      filtered = filtered.filter((c) => c.success === filter.success);
    }

    return filtered;
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.callHistory = [];
    this.lastProvider = null;
    this.lastError = null;
  }
}

export const llmService = new LLMService();
export default llmService;
