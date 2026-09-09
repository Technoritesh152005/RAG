import prisma from "../../lib/prisma.js";

const PRICING = {
  embeddingPerMillion: 0, // Gemini free tier
  llmInputPerMillion: 0, // Groq free tier
  llmOutputPerMillion: 0,
};

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
    await prisma.logUsage.create({
      workspaceId,
      type,
      embeddingTokens,
      llmInputTokens,
      llmOutputTokens,
      latencyMs,
      metadata,
    });
  } catch (err) {
    // never let logging failure break the actual pipeline
    console.error("Usage logging failed:", err.message);
  }
  
}

//shows all stats for that particular workspace
export async function getUsageStats(workspaceId){

    const logs = await prisma.logUsage.findMany({
        where:{
            workspaceId
        }
    })

    const totals = logs.reduce((acc,log)=>{
        acc.embeddingTokens += log.embeddingTokens
        acc.llmInputTokens += log.llmInputTokens
        acc.llmOutputTokens += log.llmOutputTokens
        acc.requestCount += 1
        if(log.latencyMs){
            acc.latencies.push(log.latencyMs)
        }
        return acc
    } , {
         embeddingTokens: 0,
        llmInputTokens: 0,
        llmOutputTokens: 0,
        requestCount: 0,
        latencies: []
    }
    )

     const avgLatency = totals.latencies.length
    ? Math.round(totals.latencies.reduce((a, b) => a + b, 0) / totals.latencies.length)
    : null

  const p95Latency = totals.latencies.length
    ? percentile(totals.latencies, 95)
    : null

  const estimatedCost =
    (totals.embeddingTokens / 1_000_000) * PRICING.embeddingPerMillion +
    (totals.llmInputTokens / 1_000_000) * PRICING.llmInputPerMillion +
    (totals.llmOutputTokens / 1_000_000) * PRICING.llmOutputPerMillion

  return {
    totalRequests: totals.requestCount,
    totalEmbeddingTokens: totals.embeddingTokens,
    totalLLMInputTokens: totals.llmInputTokens,
    totalLLMOutputTokens: totals.llmOutputTokens,
    avgLatencyMs: avgLatency,
    p95LatencyMs: p95Latency,
    estimatedCostUSD: parseFloat(estimatedCost.toFixed(6))
  }
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]

}
export function estimateTokens(text) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}