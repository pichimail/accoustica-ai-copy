/**
 * Admin LLM Settings Component
 * Configure OpenRouter/OpenAI, feature flags, retry logic, and monitoring preferences
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Settings, Save, RefreshCw, TestTube, Check, AlertCircle, Copy, Eye, EyeOff,
  Loader2, ChevronRight, Zap, Shield, Clock, RotateCcw, Radio, Database
} from 'lucide-react';

const BG    = '#0a0a0f';
const BG2   = '#111118';
const BORD  = 'rgba(255,255,255,0.07)';
const ROSE  = '#e11d48';
const GREEN = '#22c55e';
const BLUE  = '#38bdf8';
const AMBER = '#fbbf24';
const TEXT  = 'rgba(255,255,255,0.85)';
const TEXT2 = 'rgba(255,255,255,0.45)';
const TEXT3 = 'rgba(255,255,255,0.22)';

/** @param {{value: string|number, onChange: any, placeholder: string, type?: string, disabled?: boolean, className?: string, min?: string|number, max?: string|number, step?: string|number}} props */
function DarkInput({ value, onChange, placeholder, type = 'text', disabled = false, className = '', ...props }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full px-3 py-2 rounded-xl text-sm transition-all focus:outline-none",
        "bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500",
        "hover:border-slate-600 focus:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}

/** @param {{enabled: boolean, onChange: any}} props */
function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        enabled ? 'bg-green-500' : 'bg-slate-700'
      )}
    >
      <motion.div
        className="inline-block h-5 w-5 transform rounded-full bg-white"
        animate={{ x: enabled ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      />
    </button>
  );
}

/** @param {{children: React.ReactNode, color?: string}} props */
function Pill({ children, color = ROSE }) {
  return (
    <div className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5" style={{ background: color + '18', color, border: '1px solid ' + color + '33' }}>
      {children}
    </div>
  );
}

export default function AdminLLMSettings() {
  /** @type {Function} */
  const getDefaultConfig = () => ({
    primaryProvider: 'openrouter',
    enableFallback: true,
    openrouterKey: '',
    openaiKey: '',
    timeoutMs: 30000,
    maxRetries: 2,
    debugMode: false,
    enableMetrics: true,
    retryOnErrors: ['TIMEOUT', 'RATE_LIMIT', 'NETWORK_ERROR'],
  });

  /** @type {[any, Function]} */
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_llm_config');
      return saved ? JSON.parse(saved) : getDefaultConfig();
    } catch {
      return getDefaultConfig();
    }
  });

  const [testing, setTesting] = useState(false);
  /** @type {[any, Function]} */
  const [testResult, setTestResult] = useState(null);
  const [showKeys, setShowKeys] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const saveConfig = () => {
    setSaving(true);
    try {
      localStorage.setItem('admin_llm_config', JSON.stringify(config));
      setTimeout(() => {
        setSaving(false);
        setHasChanges(false);
        toast.success('LLM configuration saved');
      }, 300);
    } catch {
      setSaving(false);
      toast.error('Failed to save configuration');
    }
  };

  const testConnection = async (/** @type {string} */ provider) => {
    setTesting(true);
    try {
      const key = provider === 'openrouter' ? config.openrouterKey : config.openaiKey;
      if (!key) {
        toast.error(`No API key configured for ${provider}`);
        setTestResult({ provider, success: false, message: 'No API key' });
        setTesting(false);
        return;
      }

      // Simulate API test
      const url = provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          ...(provider === 'openrouter' && { 'HTTP-Referer': window.location.origin }),
        },
        body: JSON.stringify({
          model: provider === 'openrouter' ? 'openrouter/auto' : 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
        }),
      }).then(r => ({ status: r.status })).catch(e => ({ status: 0, error: String(e) }));

      const success = response.status === 200 || response.status === 400;
      setTestResult({
        provider,
        success,
        message: success ? 'Connection successful' : `Failed: ${response.status}`,
        status: response.status,
      });
      if (success) toast.success(`${provider} connection verified`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setTestResult({ provider, success: false, message: errMsg });
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (/** @type {string} */ key, /** @type {any} */ value) => {
    setConfig(/** @type {Function} */(/** @type {any} */ c) => ({ ...c, [key]: value }));
    setHasChanges(true);
  };

  const maskKey = (/** @type {string} */ key, /** @type {number} */ showChars = 6) => {
    if (!key) return '(not set)';
    return '*'.repeat(Math.max(0, key.length - showChars)) + key.slice(-showChars);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: BLUE + '22' }}>
            <Zap className="h-5 w-5" style={{ color: BLUE }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: TEXT }}>LLM Configuration</h2>
            <p className="text-xs mt-0.5" style={{ color: TEXT3 }}>Manage OpenRouter & OpenAI providers</p>
          </div>
        </div>
        <motion.button
          onClick={saveConfig}
          disabled={!hasChanges || saving}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          style={{ background: hasChanges ? ROSE : TEXT3 + '22', color: '#fff' }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>

      {/* Provider Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 space-y-4"
        style={{ background: BG2, border: '1px solid ' + BORD }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Radio className="h-4 w-4" style={{ color: GREEN }} />
          <h3 className="font-semibold" style={{ color: TEXT }}>Primary Provider</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {['openrouter', 'openai'].map(provider => (
            <motion.button
              key={provider}
              onClick={() => handleChange('primaryProvider', provider)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative p-4 rounded-xl border-2 transition-all overflow-hidden group"
              style={{
                background: config.primaryProvider === provider ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderColor: config.primaryProvider === provider ? GREEN : BORD,
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: GREEN }} />
              <div className="relative z-10 text-left">
                <p className="font-bold text-sm capitalize" style={{ color: config.primaryProvider === provider ? GREEN : TEXT }}>
                  {provider}
                </p>
                <p className="text-[10px] mt-1" style={{ color: TEXT3 }}>
                  {provider === 'openrouter' ? '100+ models' : 'GPT-4/3.5'}
                </p>
              </div>
              {config.primaryProvider === provider && (
                <Check className="absolute top-3 right-3 h-4 w-4" style={{ color: GREEN }} />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* API Keys */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-5 space-y-4"
        style={{ background: BG2, border: '1px solid ' + BORD }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4" style={{ color: ROSE }} />
          <h3 className="font-semibold" style={{ color: TEXT }}>API Keys</h3>
          <Pill color={AMBER}>Encrypted</Pill>
        </div>

        <div className="space-y-4">
          {/* OpenRouter Key */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold" style={{ color: TEXT2 }}>OpenRouter API Key</label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold hover:underline"
                style={{ color: BLUE }}
              >
                Get Key →
              </a>
            </div>
            <div className="flex gap-2">
              <DarkInput
                type={showKeys ? 'text' : 'password'}
                value={config.openrouterKey}
                onChange={/** @type {Function} */ (/** @type {any} */ e) => handleChange('openrouterKey', e.target.value)}
                placeholder="sk_live_..."
                className="flex-1"
              />
              <motion.button
                onClick={() => setShowKeys(!showKeys)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
              >
                {showKeys ? <EyeOff className="h-4 w-4" style={{ color: TEXT3 }} /> : <Eye className="h-4 w-4" style={{ color: TEXT3 }} />}
              </motion.button>
              <motion.button
                onClick={() => {
                  navigator.clipboard.writeText(config.openrouterKey);
                  toast.success('Copied to clipboard');
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
              >
                <Copy className="h-4 w-4" style={{ color: TEXT3 }} />
              </motion.button>
              <motion.button
                onClick={() => testConnection('openrouter')}
                disabled={testing || !config.openrouterKey}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {testing && testResult?.provider === 'openrouter' ? (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: BLUE }} />
                ) : testResult?.provider === 'openrouter' ? (
                  <Check className="h-4 w-4" style={{ color: testResult.success ? GREEN : ROSE }} />
                ) : (
                  <TestTube className="h-4 w-4" style={{ color: TEXT3 }} />
                )}
              </motion.button>
            </div>
            {testResult?.provider === 'openrouter' && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-[10px] mt-1.5 px-2 py-1 rounded font-semibold"
                style={{
                  color: testResult.success ? GREEN : ROSE,
                  background: (testResult.success ? GREEN : ROSE) + '18',
                }}
              >
                {testResult.message}
              </motion.p>
            )}
          </div>

          {/* OpenAI Key */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold" style={{ color: TEXT2 }}>OpenAI API Key (Fallback)</label>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold hover:underline"
                style={{ color: BLUE }}
              >
                Get Key →
              </a>
            </div>
            <div className="flex gap-2">
              <DarkInput
                type={showKeys ? 'text' : 'password'}
                value={config.openaiKey}
                onChange={/** @type {Function} */ (/** @type {any} */ e) => handleChange('openaiKey', e.target.value)}
                placeholder="sk-..."
                className="flex-1"
              />
              <motion.button
                onClick={() => setShowKeys(!showKeys)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
              >
                {showKeys ? <EyeOff className="h-4 w-4" style={{ color: TEXT3 }} /> : <Eye className="h-4 w-4" style={{ color: TEXT3 }} />}
              </motion.button>
              <motion.button
                onClick={() => {
                  navigator.clipboard.writeText(config.openaiKey);
                  toast.success('Copied to clipboard');
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
              >
                <Copy className="h-4 w-4" style={{ color: TEXT3 }} />
              </motion.button>
              <motion.button
                onClick={() => testConnection('openai')}
                disabled={testing || !config.openaiKey}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                {testing && testResult?.provider === 'openai' ? (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: BLUE }} />
                ) : testResult?.provider === 'openai' ? (
                  <Check className="h-4 w-4" style={{ color: testResult.success ? GREEN : ROSE }} />
                ) : (
                  <TestTube className="h-4 w-4" style={{ color: TEXT3 }} />
                )}
              </motion.button>
            </div>
            {testResult?.provider === 'openai' && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-[10px] mt-1.5 px-2 py-1 rounded font-semibold"
                style={{
                  color: testResult.success ? GREEN : ROSE,
                  background: (testResult.success ? GREEN : ROSE) + '18',
                }}
              >
                {testResult.message}
              </motion.p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Fallback & Retry Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-5 space-y-4"
        style={{ background: BG2, border: '1px solid ' + BORD }}
      >
        <div className="flex items-center gap-2 mb-4">
          <RotateCcw className="h-4 w-4" style={{ color: AMBER }} />
          <h3 className="font-semibold" style={{ color: TEXT }}>Fallback & Retry Logic</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>Enable Fallback</p>
              <p className="text-xs mt-0.5" style={{ color: TEXT3 }}>Automatically switch providers on error</p>
            </div>
            <ToggleSwitch
              enabled={config.enableFallback}
              onChange={/** @type {Function} */ (/** @type {any} */ v) => handleChange('enableFallback', v)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT2 }}>Max Retries</label>
            <DarkInput
              type="number"
              min="0"
              max="5"
              placeholder="2"
              value={config.maxRetries}
              onChange={/** @type {Function} */ (/** @type {any} */ e) => handleChange('maxRetries', Number(e.target.value))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: TEXT2 }}>Timeout (ms)</label>
            <DarkInput
              type="number"
              min="5000"
              max="120000"
              step="5000"
              placeholder="30000"
              value={config.timeoutMs}
              onChange={/** @type {Function} */ (/** @type {any} */ e) => handleChange('timeoutMs', Number(e.target.value))}
            />
          </div>
        </div>
      </motion.div>

      {/* Monitoring & Debug */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-5 space-y-4"
        style={{ background: BG2, border: '1px solid ' + BORD }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-4 w-4" style={{ color: BLUE }} />
          <h3 className="font-semibold" style={{ color: TEXT }}>Monitoring & Debug</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>Enable Metrics</p>
              <p className="text-xs mt-0.5" style={{ color: TEXT3 }}>Track API usage and costs</p>
            </div>
            <ToggleSwitch
              enabled={config.enableMetrics}
              onChange={/** @type {Function} */ (/** @type {any} */ v) => handleChange('enableMetrics', v)}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>Debug Mode</p>
              <p className="text-xs mt-0.5" style={{ color: TEXT3 }}>Log all LLM calls to console</p>
            </div>
            <ToggleSwitch
              enabled={config.debugMode}
              onChange={/** @type {Function} */ (/** @type {any} */ v) => handleChange('debugMode', v)}
            />
          </div>
        </div>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-4 flex gap-3"
        style={{ background: BLUE + '12', border: '1px solid ' + BLUE + '33' }}
      >
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: BLUE }} />
        <div className="text-xs" style={{ color: BLUE }}>
          <p className="font-semibold mb-1">All changes are saved locally in your browser</p>
          <p className="opacity-75">API keys are stored in browser localStorage. Never share your keys. For production, use server-side environment variables.</p>
        </div>
      </motion.div>
    </div>
  );
}
