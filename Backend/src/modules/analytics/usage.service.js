import prisma from "../../lib/prisma.js";

export async function logUsage({
  workspaceId,
  type,
  embeddingTokens = 0,
  llmInputTokens = 0,
  llmOutputTokens = 0,
  latencyMs = null,
  metadata = null,
}) {
  try {
    await prisma.usageLog.create({
      data: {
        workspaceId,
        type,
        embeddingTokens,
        llmInputTokens,
        llmOutputTokens,
        latencyMs,
        metadata,
      },
    });
  } catch (error) {
    console.error("Usage logging failed:", error.message);
  }
}

export async function getUsageStats(workspaceId) {
  // General user analytics include chat, not evaluation runs.
  const logs = await prisma.usageLog.findMany({
    where: {
      workspaceId,
      type: "CHAT",
    },
    orderBy: { createdAt: "asc" },
  });

  const totals = logs.reduce(
    (result, log) => {
      result.embeddingTokens += log.embeddingTokens || 0;
      result.llmInputTokens += log.llmInputTokens || 0;
      result.llmOutputTokens += log.llmOutputTokens || 0;

      if (Number.isFinite(log.latencyMs)) {
        result.latencies.push(log.latencyMs);
      }

      return result;
    },
    {
      embeddingTokens: 0,
      llmInputTokens: 0,
      llmOutputTokens: 0,
      latencies: [],
    },
  );

  // Group by date for interactive charts
  const historyMap = {};
  logs.forEach((log) => {
    const dateStr = new Date(log.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    if (!historyMap[dateStr]) {
      historyMap[dateStr] = {
        date: dateStr,
        requests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        tokens: 0,
        _latencies: [],
      };
    }

    const item = historyMap[dateStr];
    item.requests += 1;
    if (log.metadata?.cacheHit) {
      item.cacheHits += 1;
    } else {
      item.cacheMisses += 1;
    }
    item.tokens += (log.llmInputTokens || 0) + (log.llmOutputTokens || 0);
    if (Number.isFinite(log.latencyMs)) {
      item._latencies.push(log.latencyMs);
    }
  });

  const history = Object.values(historyMap).map((item) => ({
    date: item.date,
    requests: item.requests,
    cacheHits: item.cacheHits,
    cacheMisses: item.cacheMisses,
    tokens: item.tokens,
    avgLatency: item._latencies.length
      ? Math.round(
          item._latencies.reduce((a, b) => a + b, 0) / item._latencies.length,
        )
      : 0,
  }));

  return {
    totalRequests: logs.length,
    totalEmbeddingTokens: totals.embeddingTokens,
    totalLLMInputTokens: totals.llmInputTokens,
    totalLLMOutputTokens: totals.llmOutputTokens,
    avgLatencyMs: average(totals.latencies),
    p95LatencyMs: percentile(totals.latencies, 95),
    history,
  };
}

export async function getCacheStats(workspaceId) {
  const logs = await prisma.usageLog.findMany({
    where: {
      workspaceId,
      type: "CHAT",
    },
  });

  // Ignore older/unclassified logs so they don't distort the hit rate.
  const measuredLogs = logs.filter(
    (log) => typeof log.metadata?.cacheHit === "boolean",
  );

  const hits = measuredLogs.filter((log) => log.metadata.cacheHit);
  const misses = measuredLogs.filter((log) => !log.metadata.cacheHit);

  const hitLatency = average(
    hits.map((log) => log.latencyMs).filter(Number.isFinite),
  );
  const missLatency = average(
    misses.map((log) => log.latencyMs).filter(Number.isFinite),
  );

  return {
    cache: {
      hits: hits.length,
      misses: misses.length,
      measuredRequests: measuredLogs.length,
      hitRate: measuredLogs.length
        ? Number((hits.length / measuredLogs.length).toFixed(4))
        : 0,
      avgHitLatencyMs: hitLatency,
      avgMissLatencyMs: missLatency,
      latencyReductionPct:
        hitLatency !== null && missLatency > 0
          ? Number((((missLatency - hitLatency) / missLatency) * 100).toFixed(1))
          : null,
      llmCallsSaved: hits.length,
    },
  };
}

function average(values) {
  if (values.length === 0) return null;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function percentile(values, percent) {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percent / 100) * sorted.length) - 1;

  return sorted[Math.max(0, index)];
}

export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}