/**
 * Admin LLM Error Log Component
 * Track and manage LLM errors, retry history, and provider issues
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, RefreshCw, X, Download } from 'lucide-react';

const BG2   = '#111118';
const BORD  = 'rgba(255,255,255,0.07)';
const ROSE  = '#e11d48';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const BLUE  = '#38bdf8';
const TEXT  = 'rgba(255,255,255,0.85)';
const TEXT2 = 'rgba(255,255,255,0.45)';
const TEXT3 = 'rgba(255,255,255,0.22)';

/** @param {{type: string}} props */
function ErrorBadge({ type }) {
  /** @type {Object<string, {color: string, label: string}>} */
  const config = {
    timeout: { color: AMBER, label: 'Timeout' },
    rate_limit: { color: AMBER, label: 'Rate Limit' },
    unauthorized: { color: ROSE, label: 'Unauthorized' },
    invalid_request: { color: ROSE, label: 'Invalid Request' },
    server_error: { color: ROSE, label: 'Server Error' },
    network_error: { color: ROSE, label: 'Network Error' },
    fallback_success: { color: GREEN, label: 'Fallback OK' },
    success: { color: GREEN, label: 'Success' },
  };
  const c = config[type] || config.server_error;
  return (
    <div className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: c.color + '18', color: c.color, border: '1px solid ' + c.color + '33' }}>
      {c.label}
    </div>
  );
}

export default function AdminLLMErrorLog() {
  const [filter, setFilter] = useState('all');
  /** @type {[any, Function]} */
  const [selectedError, setSelectedError] = useState(null);

  const history = useMemo(() => {
    try {
      const historyData = (window).__LLM_CALL_HISTORY_ || '[]';
      const parsed = typeof historyData === 'string' ? JSON.parse(historyData) : historyData;
      return Array.isArray(parsed) ? parsed.slice(-500) : [];
    } catch {
      return [];
    }
  }, []);

  const errorStats = useMemo(() => {
    const stats = {
      total: history.length,
      errors: history.filter(c => !c.success).length,
      retries: history.filter(c => c.retried).length,
      fallbacks: history.filter(c => c.usedFallback).length,
      success: history.filter(c => c.success).length,
    };
    return {
      ...stats,
      errorRate: stats.total > 0 ? Math.round((stats.errors / stats.total) * 100) : 0,
    };
  }, [history]);

  const errorsByType = useMemo(() => {
    /** @type {Object<string, number>} */
    const map = {};
    history.filter(c => !c.success).forEach(call => {
      const error = call.error || 'unknown';
      map[error] = (map[error] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([error, count]) => ({ error, count }));
  }, [history]);

  const errorsByProvider = useMemo(() => {
    const map = {
      openrouter: { errors: 0, total: 0 },
      openai: { errors: 0, total: 0 },
    };
    history.forEach(call => {
      const provider = call.provider === 'openrouter' ? 'openrouter' : 'openai';
      map[provider].total++;
      if (!call.success) map[provider].errors++;
    });
    return map;
  }, [history]);

  const filtered = useMemo(() => {
    let result = [...history].reverse();
    if (filter === 'errors') result = result.filter(c => !c.success);
    if (filter === 'retries') result = result.filter(c => c.retried);
    if (filter === 'success') result = result.filter(c => c.success);
    return result.slice(0, 50);
  }, [history, filter]);

  const exportErrors = () => {
    const errorLogs = history.filter(c => !c.success);
    const csv = [
      ['Timestamp', 'Provider', 'Model', 'Error', 'Duration(ms)', 'Retried', 'Used Fallback'].join(','),
      ...errorLogs.map(c => [
        new Date(c.timestamp).toISOString(),
        c.provider,
        c.model || 'auto',
        `"${c.error || 'unknown'}"`,
        c.duration,
        c.retried ? 'Yes' : 'No',
        c.usedFallback ? 'Yes' : 'No',
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `llm-errors-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: ROSE + '22' }}>
            <AlertTriangle className="h-5 w-5" style={{ color: ROSE }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: TEXT }}>Error Log & Diagnostics</h2>
            <p className="text-xs mt-0.5" style={{ color: TEXT3 }}>Track failures and retry attempts</p>
          </div>
        </div>
        <motion.button
          onClick={exportErrors}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid ' + BORD, color: TEXT2 }}
        >
          <Download className="h-4 w-4" /> Export CSV
        </motion.button>
      </div>

      {/* Error Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-3"
      >
        {[
          { label: 'Total Logs', value: errorStats.total, color: BLUE },
          { label: 'Error Rate', value: errorStats.errorRate + '%', color: errorStats.errorRate > 10 ? ROSE : AMBER },
          { label: 'Failed Calls', value: errorStats.errors, color: ROSE },
          { label: 'Retry Attempts', value: errorStats.retries, color: AMBER },
          { label: 'Fallback Used', value: errorStats.fallbacks, color: GREEN },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-3 space-y-1"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}
          >
            <p className="text-xs" style={{ color: TEXT3 }}>{stat.label}</p>
            <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Error Analysis */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Error Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-4"
          style={{ background: BG2, border: '1px solid ' + BORD }}
        >
          <h3 className="font-bold text-sm mb-4" style={{ color: TEXT }}>Most Common Errors</h3>
          <div className="space-y-2">
            {errorsByType.slice(0, 6).map((e, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-xs truncate" style={{ color: TEXT2 }}>{e.error}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="h-full"
                      style={{
                        width: (e.count / Math.max(...errorsByType.map(e => e.count))) * 100 + '%',
                        background: ROSE,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold w-6 text-right" style={{ color: TEXT }}>{e.count}</span>
                </div>
              </div>
            ))}
            {errorsByType.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: TEXT3 }}>No errors recorded</p>
            )}
          </div>
        </motion.div>

        {/* Provider Error Rates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-4"
          style={{ background: BG2, border: '1px solid ' + BORD }}
        >
          <h3 className="font-bold text-sm mb-4" style={{ color: TEXT }}>Provider Error Rates</h3>
          <div className="space-y-4">
            {Object.entries(errorsByProvider).map(([provider, data]) => {
              const errorRate = data.total > 0 ? Math.round((data.errors / data.total) * 100) : 0;
              const color = data.errors === 0 ? GREEN : errorRate > 10 ? ROSE : AMBER;
              return (
                <div key={provider} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold capitalize" style={{ color: TEXT }}>{provider}</p>
                    <span className="text-xs font-bold" style={{ color }}>{errorRate}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: errorRate + '%' }}
                      transition={{ duration: 0.5 }}
                      className="h-full"
                      style={{ background: color }}
                    />
                  </div>
                  <p className="text-[10px]" style={{ color: TEXT3 }}>
                    {data.errors} errors out of {data.total} calls
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Error Log Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid ' + BORD }}
      >
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid ' + BORD }}>
          <h3 className="font-semibold text-sm" style={{ color: TEXT }}>Recent Activity Log</h3>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid ' + BORD, color: TEXT }}
          >
            <option value="all">All Events</option>
            <option value="errors">Errors Only</option>
            <option value="retries">Retries</option>
            <option value="success">Success</option>
          </select>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filtered.map((call, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setSelectedError(call)}
              className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors"
              style={{ borderBottom: i < filtered.length - 1 ? '1px solid ' + BORD : 'none' }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {call.success ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: call.usedFallback ? AMBER : GREEN }} />
                ) : (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: ROSE }} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold" style={{ color: TEXT }}>
                      {call.provider.toUpperCase()}
                    </p>
                    <ErrorBadge type={call.error?.replace(/\s+/g, '_').toLowerCase() || (call.success ? call.usedFallback ? 'fallback_success' : 'success' : 'server_error')} />
                  </div>
                  <p className="text-[10px] mt-1 truncate" style={{ color: TEXT3 }}>
                    {call.error || (call.success ? 'Completed' : 'Unknown error')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                <div className="text-right">
                  <p className="text-xs font-bold tabular-nums" style={{ color: call.duration > 5000 ? AMBER : BLUE }}>
                    {call.duration}ms
                  </p>
                  <p className="text-[10px]" style={{ color: TEXT3 }}>
                    {new Date(call.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {call.retried && (
                  <RefreshCw className="h-3.5 w-3.5" style={{ color: AMBER }} />
                )}
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-xs text-center" style={{ color: TEXT3 }}>
              No {filter !== 'all' ? filter : ''} records
            </p>
          )}
        </div>
      </motion.div>

      {/* Error Detail Modal */}
      <AnimatePresence>
        {selectedError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setSelectedError(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="rounded-2xl w-full max-w-2xl max-h-96 overflow-y-auto"
              style={{ background: BG2, border: '1px solid ' + BORD }}
            >
              <div className="sticky top-0 px-6 py-4 flex items-center justify-between" style={{ background: BG2, borderBottom: '1px solid ' + BORD }}>
                <h3 className="font-bold" style={{ color: TEXT }}>Error Details</h3>
                <button onClick={() => setSelectedError(null)} className="p-1 hover:bg-white/10 rounded-lg">
                  <X className="h-4 w-4" style={{ color: TEXT3 }} />
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: TEXT2 }}>Provider</p>
                    <p className="text-sm font-bold capitalize" style={{ color: TEXT }}>{selectedError.provider}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: TEXT2 }}>Model</p>
                    <p className="text-sm font-bold" style={{ color: TEXT }}>{selectedError.model || 'auto'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: TEXT2 }}>Timestamp</p>
                    <p className="text-sm" style={{ color: TEXT }}>
                      {new Date(selectedError.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: TEXT2 }}>Duration</p>
                    <p className="text-sm" style={{ color: selectedError.duration > 5000 ? AMBER : BLUE }}>
                      {selectedError.duration}ms
                    </p>
                  </div>
                </div>

                {selectedError.error && (
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: TEXT2 }}>Error Message</p>
                    <p className="text-xs p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', color: TEXT }}>
                      {selectedError.error}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: TEXT2 }}>Status</p>
                    <ErrorBadge type={selectedError.error?.replace(/\s+/g, '_').toLowerCase() || (selectedError.success ? selectedError.usedFallback ? 'fallback_success' : 'success' : 'server_error')} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: TEXT2 }}>Retried</p>
                    <p className="text-xs font-bold" style={{ color: selectedError.retried ? AMBER : GREEN }}>
                      {selectedError.retried ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: TEXT2 }}>Fallback</p>
                    <p className="text-xs font-bold" style={{ color: selectedError.usedFallback ? GREEN : TEXT3 }}>
                      {selectedError.usedFallback ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
