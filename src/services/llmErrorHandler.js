/**
 * LLM Error Handler
 * Classifies errors and provides recovery strategies
 */

export class LLMError extends Error {
  constructor(message, code, provider, originalError) {
    super(message);
    this.name = 'LLMError';
    this.code = code;
    this.provider = provider;
    this.originalError = originalError;
    this.recoveryAction = this._getRecoveryAction(code);
  }

  _getRecoveryAction(code) {
    const actions = {
      'INVALID_KEY': {
        message: 'API key invalid or expired',
        action: 'contact_support',
      },
      'RATE_LIMITED': {
        message: 'Rate limit exceeded, retrying...',
        action: 'retry_later',
        delayMs: 30000,
      },
      'TIMEOUT': {
        message: 'Request timed out, using fallback provider...',
        action: 'fallback_or_retry',
      },
      'NETWORK_ERROR': {
        message: 'Network error, checking connection...',
        action: 'fallback_or_retry',
      },
      'MODEL_NOT_FOUND': {
        message: 'Model not found, using default...',
        action: 'use_default_model',
      },
      'INSUFFICIENT_QUOTA': {
        message: 'API quota exceeded',
        action: 'contact_support',
      },
    };

    return actions[code] || {
      message: 'An error occurred',
      action: 'retry_or_fallback',
    };
  }
}

export function classifyLLMError(error, provider) {
  const message = String(error?.message || error || '').toLowerCase();
  const status = error?.response?.status;

  let code = 'UNKNOWN_ERROR';

  if (message.includes('api key') || message.includes('unauthorized') || status === 401) {
    code = 'INVALID_KEY';
  } else if (message.includes('rate limit') || message.includes('429') || status === 429) {
    code = 'RATE_LIMITED';
  } else if (message.includes('timeout') || message.includes('timed out')) {
    code = 'TIMEOUT';
  } else if (message.includes('network') || message.includes('connection') || message.includes('econnrefused')) {
    code = 'NETWORK_ERROR';
  } else if (message.includes('model not found') || status === 404) {
    code = 'MODEL_NOT_FOUND';
  } else if (message.includes('quota') || message.includes('insufficient')) {
    code = 'INSUFFICIENT_QUOTA';
  }

  return {
    code,
    provider,
    isRetryable: ['TIMEOUT', 'RATE_LIMITED', 'NETWORK_ERROR'].includes(code),
    isFallbackable: ['TIMEOUT', 'RATE_LIMITED', 'NETWORK_ERROR', 'MODEL_NOT_FOUND'].includes(code),
  };
}

export function formatErrorForUser(error) {
  const msg = String(error?.message || error || '').toLowerCase();

  if (msg.includes('rate limit')) {
    return 'Too many requests. Please try again in a moment.';
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Request took too long. Trying alternate provider...';
  }
  if (msg.includes('network') || msg.includes('connection')) {
    return 'Connection issue. Retrying...';
  }
  if (msg.includes('api key') || msg.includes('unauthorized')) {
    return 'API configuration error. Contact support.';
  }
  if (msg.includes('model')) {
    return 'Model configuration error. Using default.';
  }
  if (msg.includes('both providers failed')) {
    return 'All AI providers are temporarily unavailable. Please try again later.';
  }

  return 'An error occurred while processing your request.';
}
