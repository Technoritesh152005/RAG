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
  });

  const totals = logs.reduce(
    (result, log) => {
      result.embeddingTokens += log.embeddingTokens;
      result.llmInputTokens += log.llmInputTokens;
      result.llmOutputTokens += log.llmOutputTokens;

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

  return {
    totalRequests: logs.length,
    totalEmbeddingTokens: totals.embeddingTokens,
    totalLLMInputTokens: totals.llmInputTokens,
    totalLLMOutputTokens: totals.llmOutputTokens,
    avgLatencyMs: average(totals.latencies),
    p95LatencyMs: percentile(totals.latencies, 95),
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