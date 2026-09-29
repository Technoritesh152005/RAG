import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  getWorkspaceCacheStats,
  getWorkspaceUsage,
} from "../../api/usage.api";
import { queryKeys } from "../../api/queryKeys";

function latencyLabel(value) {
  return value == null ? "—" : `${value} ms`;
}

// Custom shadcn/ui dark tooltip for Recharts
function ShadcnTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="shadcn-chart-tooltip">
        <div className="tooltip-label">{label}</div>
        <div className="tooltip-items">
          {payload.map((item, index) => (
            <div key={index} className="tooltip-row">
              <span className="tooltip-dot" style={{ backgroundColor: item.color || item.fill }} />
              <span className="tooltip-name">{item.name}:</span>
              <span className="tooltip-val">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export default function WorkspaceAnalytics({ workspaceId }) {
  const [activeTab, setActiveTab] = useState("volume"); // 'volume' | 'latency' | 'tokens'

  const usageQuery = useQuery({
    queryKey: queryKeys.usage(workspaceId),
    queryFn: () => getWorkspaceUsage(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });

  const cacheQuery = useQuery({
    queryKey: queryKeys.cacheStats(workspaceId),
    queryFn: () => getWorkspaceCacheStats(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });

  if (usageQuery.isLoading || cacheQuery.isLoading) {
    return (
      <div className="analytics-container">
        <div className="state-spinner-wrap">
          <div className="state-spinner" />
          <p>Loading chart dashboard...</p>
        </div>
      </div>
    );
  }

  if (usageQuery.isError || cacheQuery.isError) {
    const error = usageQuery.error || cacheQuery.error;
    return (
      <div className="analytics-container">
        <div className="state-error-card">
          <h2>Unable to load analytics</h2>
          <p>{error.message}</p>
          <button
            type="button"
            className="primary-action-white"
            onClick={() => {
              usageQuery.refetch();
              cacheQuery.refetch();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const usage = usageQuery.data ?? {};
  const cache = cacheQuery.data ?? {};

  const totalRequests = usage.totalRequests ?? 0;
  const hitRatePct = cache.measuredRequests
    ? (cache.hitRate * 100).toFixed(1)
    : "0";
  const llmSaved = cache.llmCallsSaved ?? 0;
  const totalInputTokens = usage.totalLLMInputTokens ?? 0;
  const totalOutputTokens = usage.totalLLMOutputTokens ?? 0;
  const totalEmbeddingTokens = usage.totalEmbeddingTokens ?? 0;
  const totalTokens = totalInputTokens + totalOutputTokens + totalEmbeddingTokens;

  // Formatted history data for Recharts
  const chartData = usage.history && usage.history.length > 0
    ? usage.history.map((d) => ({
        date: d.date,
        "Cache Hits": d.cacheHits,
        "LLM Calls": d.cacheMisses,
        "Total Queries": d.requests,
        "Avg Latency (ms)": d.avgLatency,
      }))
    : [
        {
          date: "Today",
          "Cache Hits": cache.hits ?? 0,
          "LLM Calls": cache.misses ?? 0,
          "Total Queries": totalRequests,
          "Avg Latency (ms)": usage.avgLatencyMs ?? 0,
        },
      ];

  // Donut data for Token Distribution
  const pieData = [
    { name: "Input Tokens", value: totalInputTokens, color: "#6366f1" },
    { name: "Output Tokens", value: totalOutputTokens, color: "#22c55e" },
    { name: "Embedding Tokens", value: totalEmbeddingTokens, color: "#a855f7" },
  ].filter((d) => d.value > 0);

  const pieDataFinal = pieData.length > 0 ? pieData : [
    { name: "Input Tokens", value: 100, color: "#6366f1" },
    { name: "Output Tokens", value: 40, color: "#22c55e" },
    { name: "Embedding Tokens", value: 20, color: "#a855f7" },
  ];

  return (
    <div className="analytics-dashboard">
      {/* Header Banner */}
      <div className="analytics-header">
        <div>
          <h2>Usage & Performance Analytics</h2>
          <p>Production telemetry on query volume, retrieval latency, and token consumption.</p>
        </div>
        <div className="analytics-tab-buttons">
          <button
            className={`analytics-tab-btn ${activeTab === "volume" ? "is-active" : ""}`}
            type="button"
            onClick={() => setActiveTab("volume")}
          >
            Query Volume
          </button>
          <button
            className={`analytics-tab-btn ${activeTab === "latency" ? "is-active" : ""}`}
            type="button"
            onClick={() => setActiveTab("latency")}
          >
            Latency Curve
          </button>
          <button
            className={`analytics-tab-btn ${activeTab === "tokens" ? "is-active" : ""}`}
            type="button"
            onClick={() => setActiveTab("tokens")}
          >
            Token Donut
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total AI Queries</span>
          <span className="kpi-val">{totalRequests}</span>
          <span className="kpi-sub">Total workspace queries</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Cache Hit Rate</span>
          <span className="kpi-val text-green">{hitRatePct}%</span>
          <span className="kpi-sub">{cache.hits ?? 0} hits / {cache.misses ?? 0} misses</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Avg Response Speed</span>
          <span className="kpi-val">{latencyLabel(usage.avgLatencyMs)}</span>
          <span className="kpi-sub">P95: {latencyLabel(usage.p95LatencyMs)}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">LLM Calls Saved</span>
          <span className="kpi-val text-indigo">{llmSaved}</span>
          <span className="kpi-sub">Served from semantic cache</span>
        </div>
      </div>

      {/* SHADCN / TANSTACK RECHARTS MAIN CONTAINER */}
      <div className="chart-main-card">
        {activeTab === "volume" && (
          <div className="chart-view">
            <div className="chart-title-row">
              <div>
                <h3>Query Volume & Cache Breakdown</h3>
                <p>Stacked daily queries contrasting instant Cache Hits vs fresh LLM vector searches.</p>
              </div>
              <div className="chart-legend">
                <span className="legend-item"><span className="legend-dot bg-green" /> Cache Hits</span>
                <span className="legend-item"><span className="legend-dot bg-slate" /> LLM Calls</span>
              </div>
            </div>

            <div className="recharts-wrapper-container">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="date" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<ShadcnTooltip />} cursor={{ fill: "rgba(255, 255, 255, 0.04)" }} />
                  <Bar dataKey="Cache Hits" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="LLM Calls" stackId="a" fill="#404040" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "latency" && (
          <div className="chart-view">
            <div className="chart-title-row">
              <div>
                <h3>Response Latency Curve (ms)</h3>
                <p>Smoothed latency trend. Instant cache hits (~30ms) vs full RAG LLM response times.</p>
              </div>
            </div>

            <div className="recharts-wrapper-container">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis dataKey="date" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<ShadcnTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Avg Latency (ms)"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorLatency)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "tokens" && (
          <div className="chart-view">
            <div className="chart-title-row">
              <div>
                <h3>Token Consumption Breakdown</h3>
                <p>Proportional distribution of prompt context, completion tokens, and vector embeddings.</p>
              </div>
            </div>

            <div className="donut-chart-layout">
              <div className="donut-canvas-container">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieDataFinal}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieDataFinal.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#181818" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<ShadcnTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center-label">
                  <span className="donut-center-num">{totalTokens > 0 ? totalTokens.toLocaleString() : "0"}</span>
                  <span className="donut-center-text">Total Tokens</span>
                </div>
              </div>

              <div className="donut-legend-stack">
                {pieDataFinal.map((item, index) => (
                  <div key={index} className="donut-legend-card">
                    <span className="donut-legend-dot" style={{ backgroundColor: item.color }} />
                    <div className="donut-legend-meta">
                      <span className="donut-legend-name">{item.name}</span>
                      <strong className="donut-legend-val">{item.value.toLocaleString()} tokens</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}