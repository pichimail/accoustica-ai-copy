/**
 * Admin LLM Metrics Component
 * Track API usage, costs, per-user analytics, and cost breakdown
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Users, Zap, Calendar } from 'lucide-react';

const BG2   = '#111118';
const BORD  = 'rgba(255,255,255,0.07)';
const GREEN = '#22c55e';
const ROSE  = '#e11d48';
const BLUE  = '#38bdf8';
const AMBER = '#fbbf24';
const TEXT  = 'rgba(255,255,255,0.85)';
const TEXT2 = 'rgba(255,255,255,0.45)';
const TEXT3 = 'rgba(255,255,255,0.22)';

const CHART_COLORS = [ROSE, GREEN, BLUE, AMBER];
const TTSTYLE = {
  contentStyle: { background: BG2, border: '1px solid ' + BORD, borderRadius: 12, color: TEXT, fontSize: 12 },
  labelStyle: { color: TEXT2 },
};

/** @param {{users?: Array<any>}} props */
export default function AdminLLMMetrics({ users = [] }) {
  const [timeRange, setTimeRange] = useState('7d');

  // Get call history
  const history = useMemo(() => {
    try {
      const historyData = (window).__LLM_CALL_HISTORY_ || '[]';
      const parsed = typeof historyData === 'string' ? JSON.parse(historyData) : historyData;
      return Array.isArray(parsed) ? parsed.slice(-1000) : [];
    } catch {
      return [];
    }
  }, []);

  // Calculate costs
  const COSTS = {
    openrouter: 0.000001, // $1 per 1M tokens (average)
    openai_gpt4: 0.00003, // $3 per 1M input tokens
    openai_gpt35: 0.000001, // $0.5 per 1M tokens (average)
  };

  const stats = useMemo(() => {
    const byProvider = {
      openrouter: { calls: 0, tokens: 0, cost: 0 },
      openai: { calls: 0, tokens: 0, cost: 0 },
    };

    history.forEach(call => {
      const provider = call.provider === 'openrouter' ? 'openrouter' : 'openai';
      const tokens = Math.ceil(call.tokens || (call.duration / 100)); // Estimate tokens
      byProvider[provider].calls++;
      byProvider[provider].tokens += tokens;
      byProvider[provider].cost += tokens * (provider === 'openrouter' ? COSTS.openrouter : COSTS.openai_gpt35);
    });

    return {
      totalCalls: history.length,
      totalTokens: Object.values(byProvider).reduce((sum, p) => sum + p.tokens, 0),
      totalCost: Object.values(byProvider).reduce((sum, p) => sum + p.cost, 0),
      byProvider,
    };
  }, [history]);

  // Cost breakdown by user
  const costByUser = useMemo(() => {
    /** @type {Object<string, any>} */
    const map = {};
    history.forEach(call => {
      const user = call.userId || 'unknown';
      if (!map[user]) map[user] = { calls: 0, cost: 0, provider: call.provider };
      map[user].calls++;
      const tokens = Math.ceil(call.tokens || (call.duration / 100));
      map[user].cost += tokens * (call.provider === 'openrouter' ? COSTS.openrouter : COSTS.openai_gpt35);
    });
    return Object.entries(map)
      .map(([user, data]) => ({ user, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }, [history]);

  // Daily cost trend
  const dailyCostTrend = useMemo(() => {
    /** @type {Object<string, number>} */
    const map = {};
    history.forEach(call => {
      const date = new Date(call.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!map[date]) map[date] = 0;
      const tokens = Math.ceil(call.tokens || (call.duration / 100));
      map[date] += tokens * (call.provider === 'openrouter' ? COSTS.openrouter : COSTS.openai_gpt35);
    });
    return Object.entries(map).slice(-7).map(([date, cost]) => ({ date, cost: parseFloat(cost.toFixed(2)) }));
  }, [history]);

  const providersData = [
    { name: 'OpenRouter', value: stats.byProvider.openrouter.cost || 0, calls: stats.byProvider.openrouter.calls },
    { name: 'OpenAI', value: stats.byProvider.openai.cost || 0, calls: stats.byProvider.openai.calls },
  ].filter(p => p.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: AMBER + '22' }}>
            <DollarSign className="h-5 w-5" style={{ color: AMBER }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: TEXT }}>Usage & Cost Tracking</h2>
            <p className="text-xs mt-0.5" style={{ color: TEXT3 }}>API consumption analytics</p>
          </div>
        </div>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value)}
          className="px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid ' + BORD, color: TEXT }}
        >
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
          <option value="30d">Last 30d</option>
        </select>
      </div>

      {/* Cost Summary Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {[
          { icon: DollarSign, label: 'Total Cost', value: '$' + stats.totalCost.toFixed(2), color: AMBER },
          { icon: Zap, label: 'Total Tokens', value: stats.totalTokens.toLocaleString(), color: BLUE },
          { icon: TrendingUp, label: 'Total Calls', value: stats.totalCalls.toLocaleString(), color: GREEN },
          { icon: Calendar, label: 'Avg/Call', value: '$' + (stats.totalCalls > 0 ? (stats.totalCost / stats.totalCalls).toFixed(4) : '0'), color: ROSE },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl p-3 space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid ' + BORD }}
            >
              <Icon className="h-4 w-4" style={{ color: card.color }} />
              <div>
                <p className="text-xs" style={{ color: TEXT3 }}>{card.label}</p>
                <p className="text-lg font-bold mt-1" style={{ color: TEXT }}>{card.value}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Cost Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 rounded-2xl p-4"
          style={{ background: BG2, border: '1px solid ' + BORD }}
        >
          <p className="font-semibold text-sm mb-4" style={{ color: TEXT }}>Daily Cost Trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyCostTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke={TEXT3} tick={{ fontSize: 11, fill: TEXT3 }} />
              <YAxis stroke={TEXT3} tick={{ fontSize: 11, fill: TEXT3 }} />
              <Tooltip {...TTSTYLE} formatter={/** @type {Function} */(v) => ['$' + (typeof v === 'number' ? v.toFixed(3) : v), 'Cost']} />
              <Line type="monotone" dataKey="cost" stroke={AMBER} strokeWidth={2} dot={{ fill: AMBER, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Provider Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-4"
          style={{ background: BG2, border: '1px solid ' + BORD }}
        >
          <p className="font-semibold text-sm mb-3" style={{ color: TEXT }}>Provider Costs</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={providersData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                {providersData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip {...TTSTYLE} formatter={/** @type {Function} */(v) => ['$' + (typeof v === 'number' ? v.toFixed(3) : v), 'Cost']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {providersData.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span style={{ color: TEXT2 }}>{p.name}</span>
                </div>
                <span style={{ color: TEXT }}>
                  ${p.value.toFixed(3)} ({p.calls} calls)
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Top Users by Cost */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-4"
        style={{ background: BG2, border: '1px solid ' + BORD }}
      >
        <p className="font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: TEXT }}>
          <Users className="h-4 w-4" style={{ color: BLUE }} /> Top 10 Users by Cost
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={costByUser}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="user" tickFormatter={v => v.split('@')[0]?.slice(0, 8) || v} stroke={TEXT3} tick={{ fontSize: 11, fill: TEXT3 }} />
            <YAxis stroke={TEXT3} tick={{ fontSize: 11, fill: TEXT3 }} />
            <Tooltip {...TTSTYLE} formatter={/** @type {Function} */(v) => ['$' + (typeof v === 'number' ? v.toFixed(4) : v), 'Cost']} />
            <Bar dataKey="cost" fill={ROSE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Usage Stats Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid ' + BORD }}
      >
        <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid ' + BORD }}>
          <p className="font-semibold text-sm" style={{ color: TEXT }}>Provider Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: TEXT2 }}>Provider</th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: TEXT2 }}>Calls</th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: TEXT2 }}>Tokens</th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: TEXT2 }}>Cost</th>
                <th className="px-4 py-3 text-right text-xs font-semibold" style={{ color: TEXT2 }}>Avg/Call</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.byProvider).map(([provider, data]) => (
                <tr key={provider} style={{ borderTop: '1px solid ' + BORD }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-xs font-semibold capitalize" style={{ color: TEXT }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: provider === 'openrouter' ? BLUE : AMBER }} />
                      {provider}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums" style={{ color: TEXT2 }}>
                    {data.calls.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums" style={{ color: TEXT2 }}>
                    {data.tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums font-bold" style={{ color: TEXT }}>
                    ${data.cost.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums" style={{ color: TEXT3 }}>
                    ${data.calls > 0 ? (data.cost / data.calls).toFixed(5) : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
