import prisma from "../../lib/prisma.js";
import { runRAGPipeline } from "../chat/rag.service.js";
import { generateTextFAQs } from "../chat/groq.service.js";
import {
  calculateBertScore,
  calculateBleu4,
  calculateMeteor,
  calculatePerplexity,
  calculateRetrievalMetrics,
  calculateRougeL,
} from "./eval-metrics.service.js";

const EVAL_CONCURRENCY = 1;
//at a time only 3 evals question is sended

//put the test case question and answer in database
export async function putEvalTestCase({
  workspaceId,
  question,
  expectedPageUrls,
  expectedPageRelevance,
  expectedKeyFacts,
  referenceAnswer,
}) {
  return await prisma.evalCase.create({
    data: {
      workspaceId,
      question,
      expectedPageUrls,
      expectedPageRelevance,
      expectedKeyFacts,
      referenceAnswer,
    },
  });
}

//getting all test cases
export async function getAllEvalTestCases(workspaceId) {
  return await prisma.evalCase.findMany({
    where: {
      workspaceId,
    },
    orderBy: { createdAt: "asc" },
  });
}
export async function deleteEvalCase(caseId, workspaceId) {
  return prisma.evalCase.deleteMany({
    where: { id: caseId, workspaceId },
  });
}

export async function deleteAllEvalCases(workspaceId) {
  return prisma.evalCase.deleteMany({
    where: { workspaceId },
  });
}

// run the eval test cases
export async function runEvalTestCases(workspaceId, label = "unlabeled") {
  const testCases = await getAllEvalTestCases(workspaceId);
  if (testCases.length === 0) {
    throw new Error("No test cases found for this workspace.");
  }

  console.log(`Running evalTest suite ${testCases.length}`);
  //run question in batches
  const results = [];
  for (let i = 0; i < testCases.length; i += EVAL_CONCURRENCY) {
    const batch = testCases.slice(i, i + EVAL_CONCURRENCY);
    //run the batch question
    const batchResults = await Promise.all(
      batch.map((evalCase) => runSingleCase(evalCase, workspaceId)),
    );
    results.push(...batchResults);
    console.log(
      `Eval progress: ${Math.min(i + EVAL_CONCURRENCY, testCases.length)}/${testCases.length}`,
    );
  }

  //after running all question and testing all question with our ragPipeline we calculate all our stats together

  /* AGGREGATE METRICS */
  const hitCount = results.filter((r) => r.hit).length;
  const confidentCount = results.filter((r) => r.confident).length;
  const avgMRR = average(results.map((r) => r.reciprocalRank));
  const validJudgeScores = results
    .map((result) => result.judgeScore)
    .filter(Number.isFinite);
  const avgJudgeScore = validJudgeScores.length
    ? average(validJudgeScores)
    : 0;
  const latencies = results.map((r) => r.latency);
  const metricAverages = {
    avgPrecisionAtK: averageNullable(results.map((result) => result.precisionAtK)),
    avgRecallAtK: averageNullable(results.map((result) => result.recallAtK)),
    avgF1AtK: averageNullable(results.map((result) => result.f1AtK)),
    avgNdcgAtK: averageNullable(results.map((result) => result.ndcgAtK)),
    avgBleu: averageNullable(results.map((result) => result.bleu)),
    avgRougeL: averageNullable(results.map((result) => result.rougeL)),
    avgMeteor: averageNullable(results.map((result) => result.meteor)),
    avgBertScore: averageNullable(results.map((result) => result.bertScore)),
    avgPerplexity: averageNullable(results.map((result) => result.perplexity)),
    avgGroundedness: averageNullable(results.map((result) => result.groundedness)),
    avgHallucinationRate: averageNullable(results.map((result) => result.hallucinationRate)),
    avgFactualConsistency: averageNullable(results.map((result) => result.factualConsistency)),
    avgAnswerRelevance: averageNullable(results.map((result) => result.answerRelevance)),
  };

  //now we save the ran evaluation data
  const run = await prisma.evalRun.create({
    data: {
      workspaceId,
      label,
      totalCases: testCases.length,
      avgHitRate: parseFloat((hitCount / testCases.length).toFixed(4)),
      avgMRR: parseFloat(avgMRR.toFixed(4)),
      avgJudgeScore: parseFloat(avgJudgeScore.toFixed(4)),
      confidentRate: parseFloat((confidentCount / testCases.length).toFixed(4)),
      avgLatencyMs: Math.round(average(latencies)),
      p95LatencyMs: percentile(latencies, 95),
      ...metricAverages,
      results: {
        create: results.map((r) => ({
          caseId: r.caseId,
          question: r.question,
          retrievedUrls: r.retrievedUrl,
          hit: r.hit,
          reciprocalRank: r.reciprocalRank,
          judgeScore: r.judgeScore,
          judgeReasoning: r.judgeReasoning,
          precisionAtK: r.precisionAtK,
          recallAtK: r.recallAtK,
          f1AtK: r.f1AtK,
          ndcgAtK: r.ndcgAtK,
          bleu: r.bleu,
          rougeL: r.rougeL,
          meteor: r.meteor,
          bertScore: r.bertScore,
          perplexity: r.perplexity,
          groundedness: r.groundedness,
          hallucinationRate: r.hallucinationRate,
          factualConsistency: r.factualConsistency,
          answerRelevance: r.answerRelevance,
          confident: r.confident,
          latencyMs: r.latency,
          generatedAnswer: r.fullAnswer,
        })),
      },
    },
    include: { results: true },
  });

  console.log(
    `Eval run complete: hit-rate=${run.avgHitRate}, judge-score=${run.avgJudgeScore}`,
  );
  return run;
}

//run one test case through the rag pipeline
async function runSingleCase(evalCase, workspaceId) {
  const startTime = Date.now();
  console.log(`[Latency][Eval] caseStarted caseId=${evalCase.id}`);

  let fullAnswer = "";
  let citations = [];
  let confident = false;
  let tokenLogprobs = [];
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    fullAnswer = "";
    citations = [];
    confident = false;
    tokenLogprobs = [];

    await new Promise((resolve, reject) => {
      runRAGPipeline({
        question: evalCase.question,
        workspaceId,
        usageType: "EVAL",
        skipCache:true,
        onMetadata: (metadata) => {
          citations = metadata.citations || [];
          confident = metadata.confident;
        },
        onTokenLogprobs: (logprobs) => {
          tokenLogprobs.push(...logprobs);
        },
        onToken: (token) => {
          fullAnswer += token;
        },
        onDone: () => resolve(),
        onError: (err) => reject(err),
      }).catch(reject);
    });

    if (fullAnswer.trim() || citations.length === 0 || attempt === maxAttempts) {
      break;
    }

    console.warn(
      `[Eval] Empty generated answer with ${citations.length} retrieved source(s); retrying ` +
        `caseId=${evalCase.id} attempt=${attempt + 1}/${maxAttempts}`,
    );
  }

  const latency = Date.now() - startTime;
  console.log(`[Latency][Eval] ragPipelineMs=${latency} caseId=${evalCase.id}`);

  const retrievedUrl = citations.map((citation) => citation.pageUrl);
  const retrievalMetrics = calculateRetrievalMetrics(
    retrievedUrl,
    evalCase.expectedPageUrls,
    evalCase.expectedPageRelevance,
  );
  const referenceAnswer = evalCase.referenceAnswer?.trim();
  const textMetrics = referenceAnswer
    ? {
        bleu: calculateBleu4(fullAnswer, referenceAnswer),
        rougeL: calculateRougeL(fullAnswer, referenceAnswer),
        meteor: calculateMeteor(fullAnswer, referenceAnswer),
        bertScore: await calculateBertScore(fullAnswer, referenceAnswer).catch(
          (error) => {
            console.warn(
              `[Eval] BERTScore unavailable for case ${evalCase.id}: ${error.message}`,
            );
            return null;
          },
        ),
      }
    : { bleu: null, rougeL: null, meteor: null, bertScore: null };

  const judgeStart = Date.now();
  const judgeResult = fullAnswer.trim()
    ? await judgeAnswer(
        evalCase.question,
        fullAnswer,
        evalCase.expectedKeyFacts,
        citations,
      )
    : {
        score: null,
        groundedness: null,
        hallucinationRate: null,
        factualConsistency: null,
        answerRelevance: null,
        reasoning: "Generation failed: the answer model returned an empty answer after retry.",
      };
  const { score, reasoning } = judgeResult;
  console.log(`[Latency][Eval] judgeAnswerMs=${Date.now() - judgeStart} caseId=${evalCase.id}`);
  console.log(`[Latency][Eval] totalCaseMs=${Date.now() - startTime} caseId=${evalCase.id}`);

  return {
    caseId: evalCase.id,
    question: evalCase.question,
    retrievedUrl,
    hit: retrievalMetrics.hit,
    reciprocalRank: retrievalMetrics.reciprocalRank,
    precisionAtK: retrievalMetrics.precisionAtK,
    recallAtK: retrievalMetrics.recallAtK,
    f1AtK: retrievalMetrics.f1AtK,
    ndcgAtK: retrievalMetrics.ndcgAtK,
    judgeScore: score,
    judgeReasoning: reasoning,
    ...textMetrics,
    perplexity: calculatePerplexity(tokenLogprobs),
    groundedness: judgeResult.groundedness,
    hallucinationRate: judgeResult.hallucinationRate,
    factualConsistency: judgeResult.factualConsistency,
    answerRelevance: judgeResult.answerRelevance,
    confident,
    latency,
    fullAnswer,
  };
}

//it builds prompt and send llm call sending key facts question and rag anseet and get score and reasoning for it
async function judgeAnswer(question, generatedAnswer, expectedKeyFacts, citations) {
  const retrievedEvidence = citations
    .slice(0, 5)
    .map(
      (citation, index) =>
        `[Evidence ${index + 1}] ${citation.pageTitle ?? ""}\n` +
        `URL: ${citation.pageUrl ?? ""}\n` +
        `${(citation.parentText || citation.childText || "").slice(0, 2500)}`,
    )
    .join("\n\n---\n\n");

  const judgePrompt = `You are an evaluation judge. Score the answer only against the question and retrieved evidence.

Question: "${question}"

Expected key facts:
${expectedKeyFacts.map((fact, index) => `${index + 1}. ${fact}`).join("\n")}

Generated answer:
"${generatedAnswer}"

Retrieved evidence:
${retrievedEvidence || "No evidence was retrieved."}

Return scores from 0 to 1:
- score: expected-key-fact coverage and correctness.
- groundedness: fraction of material answer claims supported by retrieved evidence.
- hallucinationRate: fraction of material claims unsupported or contradicted by evidence.
- factualConsistency: whether the answer avoids conflicts with retrieved evidence.
- answerRelevance: how directly the answer addresses the question.

For score, 1 is complete and accurate, 0.75 has only minor omissions, 0.5 misses important facts, 0.25 covers little, and 0 is incorrect or irrelevant.
Every score must be a JSON number from 0 to 1. Include all five score fields and a concise reasoning string of at most 30 words.
Return only this JSON object:
{"score":0,"groundedness":0,"hallucinationRate":0,"factualConsistency":0,"answerRelevance":0,"reasoning":"brief explanation"}`;

  try {
    const raw = await generateTextFAQs(
      "Return only valid JSON. No markdown or explanation outside the JSON.",
      judgePrompt,
      { jsonMode: true, maxTokens: 600, temperature: 0 },
    );

    return parseJudgeResponse(raw);
  } catch (error) {
    console.error("Evaluation judge failed:", error.message);
    return {
      score: null,
      groundedness: null,
      hallucinationRate: null,
      factualConsistency: null,
      answerRelevance: null,
      reasoning: `Judge scoring failed: ${error.message}`,
    };
  }
}

export async function getEvalRuns(workspaceId) {
  return await prisma.evalRun.findMany({
    where: {
      workspaceId,
    },
    select: {
      id: true,
      label: true,
      totalCases: true,
      avgHitRate: true,
      avgMRR: true,
      avgJudgeScore: true,
      confidentRate: true,
      avgLatencyMs: true,
      p95LatencyMs: true,
      avgPrecisionAtK: true,
      avgRecallAtK: true,
      avgF1AtK: true,
      avgNdcgAtK: true,
      avgBleu: true,
      avgRougeL: true,
      avgMeteor: true,
      avgBertScore: true,
      avgPerplexity: true,
      avgGroundedness: true,
      avgHallucinationRate: true,
      avgFactualConsistency: true,
      avgAnswerRelevance: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEvalRunDetail(runId,workspaceId){
    const run = await prisma.evalRun.findFirst({
    where: { id: runId, workspaceId },
    include: { results: true }
  })
  if (!run) throw new Error('Eval run not found')
  return run
}

// ─── HELPERS ────────────────────────────────────────────────

function average(arr) {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function averageNullable(values) {
  const available = values.filter(Number.isFinite);
  return available.length ? average(available) : null;
}

function percentile(arr, p) {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

export function parseJudgeResponse(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("Judge returned an empty response");
  }

  const text = raw.trim();
  const objectStart = text.indexOf("{");
  if (objectStart === -1) {
    throw new Error("Judge response did not contain a JSON object");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let objectEnd = -1;

  for (let index = objectStart; index < text.length; index += 1) {
    const character = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        objectEnd = index;
        break;
      }
    }
  }

  if (objectEnd === -1) {
    throw new Error("Judge response contained incomplete JSON");
  }

  const parsed = JSON.parse(text.slice(objectStart, objectEnd + 1));
  const reasoning =
    typeof parsed.reasoning === "string" ? parsed.reasoning.trim() : "";
  const metricNames = [
    "score",
    "groundedness",
    "hallucinationRate",
    "factualConsistency",
    "answerRelevance",
  ];
  const scores = {};
  const invalidMetrics = [];

  for (const name of metricNames) {
    try {
      scores[name] = parseUnitScore(parsed[name], name);
    } catch {
      scores[name] = null;
      invalidMetrics.push(name);
    }
  }

  const scoreCount = metricNames.filter((name) => scores[name] !== null).length;
  const resultReasoning =
    reasoning ||
    (scoreCount > 0
      ? "Judge returned scores without reasoning."
      : "Judge returned no valid scores.");
  const validationNote = invalidMetrics.length
    ? `Invalid or missing judge score(s): ${invalidMetrics.join(", ")}.`
    : "";

  return {
    ...scores,
    reasoning: [resultReasoning, validationNote].filter(Boolean).join(" "),
  };
}

function parseUnitScore(value, name) {
  const score =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(score) || score < 0 || score > 1) {
    throw new Error(`Judge response ${name} must be a number from 0 to 1`);
  }
  return score;
}