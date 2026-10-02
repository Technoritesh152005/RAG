import { performance } from "node:perf_hooks";
import { embeddingText } from "../Embeeding/embeeding.service.config.js";
import { vectorSearch } from "./pinecone.service.js";
import { keywordSearch } from "./fullTextSearch.service.js";
import { selectAdaptiveTopK } from "../vector-store/adaptive_topK.service.js";

const RRF_K = 60;
const MIN_CONFIDENCE_SCORE = 0.015;

const CANDIDATE_POOL = 15;

export async function hybridSearch(
  question,
  workspaceId,
  topK = 5,
  precomputedEmbedding = null,
  requestId = null,
) {
  const searchStart = performance.now();
  const timings = {};
  console.log(`[Retrieval] requestId=${requestId ?? "n/a"} workspaceId=${workspaceId}`);

  let questionEmbedding = precomputedEmbedding;
  if (!questionEmbedding) {
    const embeddingStart = performance.now();
    questionEmbedding = await embeddingText(question);
    timings.queryEmbeddingMs = elapsedMs(embeddingStart);
  } else {
    timings.queryEmbeddingMs = 0;
  }

  const candidateSearchStart = performance.now();
  const vectorSearchStart = performance.now();
  const keywordSearchStart = performance.now();
  const [vectorSearchResult, keywordSearchResult] = await Promise.all([
    vectorSearch(questionEmbedding, workspaceId, CANDIDATE_POOL).then(
      (results) => ({ results: results ?? [], ms: elapsedMs(vectorSearchStart) }),
    ),
    keywordSearch(question, workspaceId, CANDIDATE_POOL).then(
      (results) => ({ results: results ?? [], ms: elapsedMs(keywordSearchStart) }),
    ),
  ]);
  const vectorResults = vectorSearchResult.results;
  const keywordResults = keywordSearchResult.results;
  timings.vectorSearchMs = vectorSearchResult.ms;
  timings.keywordSearchMs = keywordSearchResult.ms;
  timings.candidateSearchWallMs = elapsedMs(candidateSearchStart);

  const fusionStart = performance.now();
  const merged =
    vectorResults.length || keywordResults.length
      ? reciprocalRankFusion(vectorResults, keywordResults, CANDIDATE_POOL)
      : [];
  timings.fusionMs = elapsedMs(fusionStart);

  const adaptiveTopKStart = performance.now();
  const finalResults = merged.length ? selectAdaptiveTopK(merged) : [];
  timings.adaptiveTopKMs = elapsedMs(adaptiveTopKStart);

  const youtubeResultCounts = {
    vector: vectorResults.filter((result) => isYoutubeUrl(result.pageUrl)).length,
    keyword: keywordResults.filter((result) => isYoutubeUrl(result.pageUrl)).length,
    final: finalResults.filter((result) => isYoutubeUrl(result.pageUrl)).length,
  };
  timings.totalMs = elapsedMs(searchStart);

  const diagnostics = {
    requestId,
    workspaceId,
    timings,
    resultCounts: {
      vector: vectorResults.length,
      keyword: keywordResults.length,
      merged: merged.length,
      final: finalResults.length,
      youtube: youtubeResultCounts,
    },
    youtubeUrls: [
      ...new Set(
        finalResults
          .filter((result) => isYoutubeUrl(result.pageUrl))
          .map((result) => result.pageUrl),
      ),
    ],
  };
  console.info(`[RAG_TIMING] ${JSON.stringify({ phase: "retrieval", ...diagnostics })}`);

  if (vectorResults.length === 0 && keywordResults.length === 0) {
    return {
      results: [],
      confident: false,
      reason: "No relevant search content found in indexed sources",
      diagnostics,
    };
  }

  const topScore = finalResults[0]?.score;
  const confident = topScore >= MIN_CONFIDENCE_SCORE;
  return {
    results: confident ? finalResults : merged,
    confident,
    reason: confident ? null : "Found some content but the confidence is low",
    diagnostics,
  };
}

function isYoutubeUrl(pageUrl) {
  if (!pageUrl) return false;
  try {
    const hostname = new URL(pageUrl).hostname.toLowerCase();
    return ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(hostname);
  } catch {
    return false;
  }
}

function elapsedMs(start) {
  return Number((performance.now() - start).toFixed(1));
}

function reciprocalRankFusion(vectorResults, keywordResults, topK) {
  const scoreMap = new Map();

  // scoring vector results y rank position
  // here resuls means that particuar vector and rank starts from 0 which is index
  vectorResults.forEach((result, rank) => {
    

    const existing = scoreMap.get(result.id) || {
      ...result,
      rrfScore: 0,
      inVector: false,
      inKeyword: false,
    };
    // RRF formula: 1 / (rank + K)
    // rank 0 (best) → 1/60 = 0.0167
    // rank 9 (worst) → 1/69 = 0.0145
    existing.rrfScore += 1 / (rank + RRF_K);
    existing.inVector = true;
    scoreMap.set(result.id, existing);
  });

  keywordResults.forEach((result, rank) => {
    const existing = scoreMap.get(result.id) || {
      ...result,
      rrfScore: 0,
      inVector: false,
      inKeyword: false,
    };
    // if the object exist we dont create seperating mapping for each vector but add their sum only of rrf
    // suppose chunk 2 appears both in vector and keyword then we just add their rrf
    existing.rrfScore += 1 / (rank + RRF_K);
    existing.inKeyword = true;
    scoreMap.set(result.id, existing);
  });

  // sort by combined RRF score — highest first
  return Array.from(scoreMap.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK)
    .map((result) => ({
      id: result.id,
      score: parseFloat(result.rrfScore.toFixed(6)),
      pageUrl: result.pageUrl,
      pageTitle: result.pageTitle,
      sectionHeading: result.sectionHeading,
      childText: result.childText,
      parentText: result.parentText, // full context for Groq
      inVector: result.inVector, // debug info
      inKeyword: result.inKeyword, // debug info
    }));
}
