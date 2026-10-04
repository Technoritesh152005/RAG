import natural from "natural";
import { extractTokenEmbeddings } from "../Embeeding/embeeding.service.config.js";

const EVAL_TOP_K = 5;
const { PorterStemmer } = natural;

function tokenize(text) {
  return String(text ?? "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function normalizeEvalUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ["t", "start", "time_continue"].includes(key)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString().replace(/\/$/, "");
  } catch {
    return text.replace(/\/+$/, "");
  }
}

function urlsMatch(retrievedUrl, expectedUrl) {
  const retrieved = normalizeEvalUrl(retrievedUrl);
  const expected = normalizeEvalUrl(expectedUrl);
  if (!retrieved || !expected) return false;
  if (retrieved === expected) return true;

  // A PDF page fragment or web-page anchor can refine an expected base URL.
  const fragmentIndex = retrieved.indexOf("#");
  return (
    !expected.includes("#") &&
    fragmentIndex > 0 &&
    retrieved.slice(0, fragmentIndex) === expected
  );
}

export function calculateRetrievalMetrics(
  retrievedUrls,
  expectedUrls,
  expectedRelevance,
  k = EVAL_TOP_K,
) {
  const topK = Number.isInteger(k) && k > 0 ? k : EVAL_TOP_K;
  const uniqueRetrievedUrls = [];
  const seenRetrievedUrls = new Set();
  for (const url of retrievedUrls) {
    const normalized = normalizeEvalUrl(url);
    if (!normalized || seenRetrievedUrls.has(normalized)) continue;
    seenRetrievedUrls.add(normalized);
    uniqueRetrievedUrls.push(url);
  }

  const expectedTargets = [];
  const seenExpectedUrls = new Set();
  expectedUrls.forEach((url, index) => {
    const normalized = normalizeEvalUrl(url);
    if (!normalized || seenExpectedUrls.has(normalized)) return;
    seenExpectedUrls.add(normalized);
    const grade = expectedRelevance?.[index];
    expectedTargets.push({
      url,
      grade: Number.isFinite(grade) ? Math.max(0, Math.min(3, grade)) : 1,
    });
  });

  const rankedUrls = uniqueRetrievedUrls.slice(0, topK);
  const claimedExpectedTargets = new Set();
  const relevanceGrades = rankedUrls.map((url) => {
    const matchingIndices = expectedTargets
      .map((target, index) => ({ target, index }))
      .filter(
        ({ target, index }) =>
          !claimedExpectedTargets.has(index) && urlsMatch(url, target.url),
      )
      .sort((left, right) =>
        normalizeEvalUrl(right.target.url).length -
        normalizeEvalUrl(left.target.url).length,
      );
    const match = matchingIndices[0];
    if (!match) return 0;
    claimedExpectedTargets.add(match.index);
    return match.target.grade;
  });
  const relevantCount = expectedTargets.filter((target) => target.grade > 0).length;
  const relevantRetrieved = relevanceGrades.filter((grade) => grade > 0).length;
  const firstRelevantRank = relevanceGrades.findIndex((grade) => grade > 0);
  const precisionAtK = relevantRetrieved / topK;
  const recallAtK = relevantCount > 0 ? relevantRetrieved / relevantCount : null;
  const f1AtK =
    recallAtK === null || precisionAtK + recallAtK === 0
      ? recallAtK === null ? null : 0
      : (2 * precisionAtK * recallAtK) / (precisionAtK + recallAtK);

  const dcg = relevanceGrades.reduce(
    (score, relevance, index) =>
      score + (2 ** relevance - 1) / Math.log2(index + 2),
    0,
  );
  const idealGrades = expectedTargets
    .map((target) => target.grade)
    .sort((left, right) => right - left)
    .slice(0, topK);
  const idealDcg = idealGrades.reduce(
    (score, relevance, index) =>
      score + (2 ** relevance - 1) / Math.log2(index + 2),
    0,
  );

  return {
    precisionAtK,
    recallAtK,
    f1AtK,
    ndcgAtK: idealDcg > 0 ? dcg / idealDcg : null,
    hit: firstRelevantRank !== -1,
    reciprocalRank: firstRelevantRank === -1 ? 0 : 1 / (firstRelevantRank + 1),
  };
}

function ngramCounts(tokens, size) {
  const counts = new Map();
  for (let index = 0; index <= tokens.length - size; index += 1) {
    const ngram = tokens.slice(index, index + size).join(" ");
    counts.set(ngram, (counts.get(ngram) ?? 0) + 1);
  }
  return counts;
}

export function calculateBleu4(candidateText, referenceText) {
  const candidate = tokenize(candidateText);
  const reference = tokenize(referenceText);
  if (candidate.length === 0 || reference.length === 0) return 0;

  let logPrecisionSum = 0;
  for (let size = 1; size <= 4; size += 1) {
    const candidateCounts = ngramCounts(candidate, size);
    const referenceCounts = ngramCounts(reference, size);
    let clippedMatches = 0;
    let total = 0;

    for (const [ngram, count] of candidateCounts) {
      total += count;
      clippedMatches += Math.min(count, referenceCounts.get(ngram) ?? 0);
    }

    const smoothedPrecision = (clippedMatches + 1) / (total + 1);
    logPrecisionSum += Math.log(smoothedPrecision);
  }

  const brevityPenalty =
    candidate.length >= reference.length
      ? 1
      : Math.exp(1 - reference.length / candidate.length);
  return brevityPenalty * Math.exp(logPrecisionSum / 4);
}

function lcsLength(left, right) {
  let previous = new Array(right.length + 1).fill(0);
  for (const leftToken of left) {
    const current = new Array(right.length + 1).fill(0);
    for (let index = 1; index <= right.length; index += 1) {
      current[index] =
        leftToken === right[index - 1]
          ? previous[index - 1] + 1
          : Math.max(previous[index], current[index - 1]);
    }
    previous = current;
  }
  return previous[right.length];
}

export function calculateRougeL(candidateText, referenceText) {
  const candidate = tokenize(candidateText);
  const reference = tokenize(referenceText);
  if (candidate.length === 0 || reference.length === 0) return 0;

  const overlap = lcsLength(candidate, reference);
  const precision = overlap / candidate.length;
  const recall = overlap / reference.length;
  return precision + recall === 0
    ? 0
    : (2 * precision * recall) / (precision + recall);
}

function meteorAlign(candidate, reference) {
  const matchedReference = new Set();
  const matches = [];

  candidate.forEach((token, candidateIndex) => {
    const referenceIndex = reference.findIndex(
      (referenceToken, index) =>
        !matchedReference.has(index) && referenceToken === token,
    );
    if (referenceIndex !== -1) {
      matchedReference.add(referenceIndex);
      matches.push([candidateIndex, referenceIndex]);
    }
  });

  const candidateStems = candidate.map((token) => PorterStemmer.stem(token));
  const referenceStems = reference.map((token) => PorterStemmer.stem(token));
  candidateStems.forEach((stem, candidateIndex) => {
    if (matches.some(([matchedCandidate]) => matchedCandidate === candidateIndex)) {
      return;
    }
    const referenceIndex = referenceStems.findIndex(
      (referenceStem, index) =>
        !matchedReference.has(index) && referenceStem === stem,
    );
    if (referenceIndex !== -1) {
      matchedReference.add(referenceIndex);
      matches.push([candidateIndex, referenceIndex]);
    }
  });

  return matches.sort((left, right) => left[0] - right[0]);
}

export function calculateMeteor(candidateText, referenceText) {
  const candidate = tokenize(candidateText);
  const reference = tokenize(referenceText);
  if (candidate.length === 0 || reference.length === 0) return 0;

  const alignment = meteorAlign(candidate, reference);
  if (alignment.length === 0) return 0;

  const precision = alignment.length / candidate.length;
  const recall = alignment.length / reference.length;
  const weightedFMean = (10 * precision * recall) / (recall + 9 * precision);
  let chunks = 1;
  for (let index = 1; index < alignment.length; index += 1) {
    if (
      alignment[index][0] !== alignment[index - 1][0] + 1 ||
      alignment[index][1] !== alignment[index - 1][1] + 1
    ) {
      chunks += 1;
    }
  }
  const fragmentationPenalty = 0.5 * (chunks / alignment.length) ** 3;
  return weightedFMean * (1 - fragmentationPenalty);
}

export function calculatePerplexity(tokenLogprobs) {
  if (
    !Array.isArray(tokenLogprobs) ||
    tokenLogprobs.length === 0 ||
    tokenLogprobs.some((logprob) => !Number.isFinite(logprob))
  ) {
    return null;
  }

  const meanLogprob =
    tokenLogprobs.reduce((total, logprob) => total + logprob, 0) /
    tokenLogprobs.length;
  const perplexity = Math.exp(-meanLogprob);
  return Number.isFinite(perplexity) ? perplexity : null;
}

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  const denominator = Math.sqrt(leftNorm * rightNorm);
  return denominator === 0 ? 0 : dot / denominator;
}

export async function calculateBertScore(candidateText, referenceText) {
  const [candidate, reference] = await Promise.all([
    extractTokenEmbeddings(candidateText),
    extractTokenEmbeddings(referenceText),
  ]);
  if (candidate.length === 0 || reference.length === 0) return 0;

  const precision =
    candidate.reduce(
      (sum, token) =>
        sum + Math.max(...reference.map((other) => cosineSimilarity(token, other))),
      0,
    ) / candidate.length;
  const recall =
    reference.reduce(
      (sum, token) =>
        sum + Math.max(...candidate.map((other) => cosineSimilarity(token, other))),
      0,
    ) / reference.length;

  return precision + recall === 0
    ? 0
    : (2 * precision * recall) / (precision + recall);
}