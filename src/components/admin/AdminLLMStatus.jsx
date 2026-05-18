/**
 * Admin LLM Status Component
 * Real-time provider health, performance metrics, and status indicators
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, AlertCircle, BarChart3, Clock, Zap, TrendingUp } from 'lucide-react';

const BG2   = '#111118';
const BORD  = 'rgba(255,255,255,0.07)';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const ROSE  = '#e11d48';
const BLUE  = '#38bdf8';
const TEXT  = 'rgba(255,255,255,0.85)';
const TEXT2 = 'rgba(255,255,255,0.45)';
const TEXT3 = 'rgba(255,255,255,0.22)';

/** @param {{status: string, label: string}} props */
function StatusBadge({ status, label }) {
  /** @type {Object<string, {color: string, icon: any}>} */
  const statusConfig = {
    operational: { color: GREEN, icon: CheckCircle2 },
    warning: { color: AMBER, icon: AlertCircle },
    error: { color: ROSE, icon: AlertCircle },
  };
  const config = statusConfig[/** @type {string} */ status] || statusConfig.operational;
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: config.color + '18', color: config.color, border: '1px solid ' + config.color + '33' }}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
  );
}

/** @param {{icon: any, label: string, value: string|number, trend?: number, unit?: string}} props */
function MetricCard({ icon: Icon, label, value, trend = 0, unit = '' }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingUp : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-3 space-y-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4" style={{ color: BLUE }} />
        {trend !== undefined && TrendIcon && (
          <TrendIcon className="h-3.5 w-3.5" style={{ color: trend > 0 ? GREEN : ROSE, transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
        )}
      </div>
      <div>
        <p className="text-xs" style={{ color: TEXT3 }}>{label}</p>
        <p className="text-lg font-bold" style={{ color: TEXT }}>
          {value}{unit}
        </p>
      </div>
    </motion.div>
  );
}

export default function AdminLLMStatus() {
  const [history, setHistory] = useState(() => {
    try {
      const historyData = (window).__LLM_CALL_HISTORY_ || '[]';
      const parsed = typeof historyData === 'string' ? JSON.parse(historyData) : historyData;
      return Array.isArray(parsed) ? parsed.slice(-100) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const historyData = (window).__LLM_CALL_HISTORY_ || '[]';
        const parsed = typeof historyData === 'string' ? JSON.parse(historyData) : historyData;
        const latest = Array.isArray(parsed) ? parsed.slice(-100) : [];
        setHistory(latest);
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    totalCalls: history.length,
    successCount: history.filter(c => c.success).length,
    errorCount: history.filter(c => !c.success).length,
    openrouterCount: history.filter(c => c.provider === 'openrouter').length,
    openaiCount: history.filter(c => c.provider === 'openai').length,
    avgDuration: history.length > 0
      ? Math.round(history.filter(c => c.success).reduce((sum, c) => sum + c.duration, 0) / Math.max(1, history.filter(c => c.success).length))
      : 0,
    successRate: history.length > 0
      ? Math.round((history.filter(c => c.success).length / history.length) * 100)
      : 0,
  };

  const openrouterStats = {
    success: history.filter(c => c.provider === 'openrouter' && c.success).length,
    failed: history.filter(c => c.provider === 'openrouter' && !c.success).length,
    avgDuration: history.filter(c => c.provider === 'openrouter' && c.success).length > 0
      ? Math.round(history.filter(c => c.provider === 'openrouter' && c.success).reduce((sum, c) => sum + c.duration, 0) / history.filter(c => c.provider === 'openrouter' && c.success).length)
      : 0,
  };

  const openaiStats = {
    success: history.filter(c => c.provider === 'openai' && c.success).length,
    failed: history.filter(c => c.provider === 'openai' && !c.success).length,
    avgDuration: history.filter(c => c.provider === 'openai' && c.success).length > 0
      ? Math.round(history.filter(c => c.provider === 'openai' && c.success).reduce((sum, c) => sum + c.duration, 0) / history.filter(c => c.provider === 'openai' && c.success).length)
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: GREEN + '22' }}>
            <Activity className="h-5 w-5" style={{ color: GREEN }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: TEXT }}>Provider Health & Metrics</h2>
            <p className="text-xs mt-0.5" style={{ color: TEXT3 }}>Real-time performance tracking (last 100 calls)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: GREEN + '18', color: GREEN, border: '1px solid ' + GREEN + '33' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: GREEN }} /> Live
        </div>
      </div>

      {/* Overall Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <MetricCard icon={BarChart3} label="Total Calls" value={stats.totalCalls} />
        <MetricCard icon={CheckCircle2} label="Success Rate" value={stats.successRate} unit="%" trend={stats.successRate > 95 ? 1 : stats.successRate < 90 ? -1 : 0} />
        <MetricCard icon={Clock} label="Avg Duration" value={stats.avgDuration} unit="ms" />
        <MetricCard icon={Zap} label="Errors (24h)" value={stats.errorCount} />
      </motion.div>

      {/* Provider Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* OpenRouter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 space-y-4"
          style={{ background: BG2, border: '1px solid ' + BORD }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg" style={{ color: TEXT }}>OpenRouter</h3>
              <p className="text-xs mt-1" style={{ color: TEXT3 }}>Primary provider • 100+ models</p>
            </div>
            <StatusBadge status={openrouterStats.failed === 0 ? 'operational' : openrouterStats.failed < 5 ? 'warning' : 'error'} label={openrouterStats.failed === 0 ? 'Healthy' : `${openrouterStats.failed} errors`} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}>
              <p className="text-xs" style={{ color: TEXT3 }}>Success</p>
              <p className="text-2xl font-bold mt-1" style={{ color: GREEN }}>{openrouterStats.success}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}>
              <p className="text-xs" style={{ color: TEXT3 }}>Failed</p>
              <p className="text-2xl font-bold mt-1" style={{ color: openrouterStats.failed > 0 ? ROSE : TEXT3 }}>{openrouterStats.failed}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}>
              <p className="text-xs" style={{ color: TEXT3 }}>Avg</p>
              <p className="text-2xl font-bold mt-1" style={{ color: BLUE }}>{openrouterStats.avgDuration}ms</p>
            </div>
          </div>

          <div className="rounded-lg p-3" style={{ background: BLUE + '12', border: '1px solid ' + BLUE + '33' }}>
            <p className="text-xs font-bold mb-2" style={{ color: BLUE }}>Latest Status</p>
            <p className="text-[10px]" style={{ color: BLUE }}>
              {history.filter(c => c.provider === 'openrouter').slice(-1)[0]?.timestamp
                ? new Date(history.filter(c => c.provider === 'openrouter').slice(-1)[0].timestamp).toLocaleTimeString()
                : 'No activity'}
            </p>
          </div>
        </motion.div>

        {/* OpenAI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-5 space-y-4"
          style={{ background: BG2, border: '1px solid ' + BORD }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg" style={{ color: TEXT }}>OpenAI</h3>
              <p className="text-xs mt-1" style={{ color: TEXT3 }}>Fallback provider • GPT-4/3.5</p>
            </div>
            <StatusBadge status={openaiStats.failed === 0 ? 'operational' : openaiStats.failed < 5 ? 'warning' : 'error'} label={openaiStats.failed === 0 ? 'Ready' : `${openaiStats.failed} errors`} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}>
              <p className="text-xs" style={{ color: TEXT3 }}>Success</p>
              <p className="text-2xl font-bold mt-1" style={{ color: GREEN }}>{openaiStats.success}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}>
              <p className="text-xs" style={{ color: TEXT3 }}>Failed</p>
              <p className="text-2xl font-bold mt-1" style={{ color: openaiStats.failed > 0 ? ROSE : TEXT3 }}>{openaiStats.failed}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}>
              <p className="text-xs" style={{ color: TEXT3 }}>Avg</p>
              <p className="text-2xl font-bold mt-1" style={{ color: BLUE }}>{openaiStats.avgDuration}ms</p>
            </div>
          </div>

          <div className="rounded-lg p-3" style={{ background: AMBER + '12', border: '1px solid ' + AMBER + '33' }}>
            <p className="text-xs font-bold mb-2" style={{ color: AMBER }}>Latest Status</p>
            <p className="text-[10px]" style={{ color: AMBER }}>
              {history.filter(c => c.provider === 'openai').slice(-1)[0]?.timestamp
                ? new Date(history.filter(c => c.provider === 'openai').slice(-1)[0].timestamp).toLocaleTimeString()
                : 'No activity'}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Call Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-5"
        style={{ background: BG2, border: '1px solid ' + BORD }}
      >
        <h3 className="font-bold mb-4" style={{ color: TEXT }}>Provider Usage Distribution</h3>
        <div className="space-y-2">
          {[
            { provider: 'OpenRouter', count: stats.openrouterCount, color: BLUE },
            { provider: 'OpenAI', count: stats.openaiCount, color: AMBER },
          ].map(({ provider, count, color }) => {
            const pct = stats.totalCalls > 0 ? Math.round((count / stats.totalCalls) * 100) : 0;
            return (
              <div key={provider} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: TEXT2 }}>{provider}</span>
                  <span style={{ color: TEXT, fontWeight: 'bold' }}>{pct}% ({count})</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: pct + '%' }}
                    transition={{ duration: 0.5 }}
                    className="h-full"
                    style={{ background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Calls Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-5"
        style={{ background: BG2, border: '1px solid ' + BORD }}
      >
        <h3 className="font-bold mb-4" style={{ color: TEXT }}>Recent Calls (Last 10)</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {history.slice(-10).reverse().map((call, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}
            >
              <div className="flex items-center gap-3 flex-1">
                {call.success ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: GREEN }} />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: ROSE }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>
                    {call.provider} • {call.model || 'auto'}
                  </p>
                  <p className="text-[10px]" style={{ color: TEXT3 }}>
                    {new Date(call.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold tabular-nums" style={{ color: call.duration > 5000 ? AMBER : BLUE }}>
                  {call.duration}ms
                </p>
                {call.error && (
                  <p className="text-[10px] truncate max-w-24" style={{ color: ROSE }}>
                    {call.error.split(':')[0]}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
          {history.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: TEXT3 }}>No calls recorded yet</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
