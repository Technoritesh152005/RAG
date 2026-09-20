import prisma from "../../lib/prisma.js";
import { runRAGPipeline } from "../chat/rag.service.js";
import { generateTextFAQs } from "../chat/groq.service.js";

const EVAL_CONCURRENCY = 1;
//at a time only 3 evals question is sended

//put the test case question and answer in database
export async function putEvalTestCase({
  workspaceId,
  question,
  expectedPageUrls,
  expectedKeyFacts,
}) {
  return await prisma.evalCase.create({
    data: { workspaceId, question, expectedPageUrls, expectedKeyFacts },
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
  const avgJudgeScore = average(results.map((r) => r.judgeScore));
  const latencies = results.map((r) => r.latency);

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
      results: {
        create: results.map((r) => ({
          caseId: r.caseId,
          question: r.question,
          retrievedUrls: r.retrievedUrl,
          hit: r.hit,
          reciprocalRank: r.reciprocalRank,
          judgeScore: r.judgeScore,
          judgeReasoning: r.judgeReasoning,
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
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    fullAnswer = "";
    citations = [];
    confident = false;

    await new Promise((resolve, reject) => {
      runRAGPipeline({
        question: evalCase.question,
        workspaceId,
        usageType: "EVAL",
        onMetadata: (metadata) => {
          citations = metadata.citations || [];
          confident = metadata.confident;
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

  //Retrieval Metrics
  const expectedUrl = evalCase.expectedPageUrls;
  let hit = false;
  let reciprocalRank = 0;

  //we check whether in citations source we have some retrieved url in it
  for (let rank = 0; rank < retrievedUrl.length; rank++) {
    if (expectedUrl.some((expected) => retrievedUrl[rank].includes(expected))) {
      hit = true;
      reciprocalRank = 1 / (rank + 1);
      break;
    }
  }

  const judgeStart = Date.now();
  const judgeResult = fullAnswer.trim()
    ? await judgeAnswer(
        evalCase.question,
        fullAnswer,
        evalCase.expectedKeyFacts,
      )
    : {
        score: 0,
        reasoning: "Generation failed: the answer model returned an empty answer after retry.",
      };
  const { score, reasoning } = judgeResult;
  console.log(`[Latency][Eval] judgeAnswerMs=${Date.now() - judgeStart} caseId=${evalCase.id}`);
  console.log(`[Latency][Eval] totalCaseMs=${Date.now() - startTime} caseId=${evalCase.id}`);

  return {
    caseId: evalCase.id,
    question: evalCase.question,
    retrievedUrl,
    hit,
    reciprocalRank,
    judgeScore: score,
    judgeReasoning: reasoning,
    confident,
    latency,
    fullAnswer,
  };
}

//it builds prompt and send llm call sending key facts question and rag anseet and get score and reasoning for it
async function judgeAnswer(question, generatedAnswer, expectedKeyFacts) {
  const judgePrompt = `You are grading an AI assistant's answer for factual correctness.

Question: "${question}"

Expected key facts the answer should contain (not necessarily word-for-word):
${expectedKeyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

The AI's actual answer:
"${generatedAnswer}"

Score how well the answer covers the expected key facts using this rubric:
- 1.00 = Complete and accurate; all important expected facts are covered correctly
- 0.75 = Mostly complete and accurate; only minor omissions or imprecision
- 0.50 = Partially complete; one or more important facts are missing or incorrect
- 0.25 = Very incomplete; only a small portion of the expected facts is correct
- 0.00 = Incorrect, irrelevant, contains no expected facts, or is a "not found" fallback when facts exist

Choose the score that best matches the overall completeness and accuracy of the answer.
Do not default to 0.50 just because the answer is partially correct. Use 0.75 for minor omissions,
0.50 for important missing facts, and 0.25 when only a small portion is correct.

Respond with ONLY this JSON, nothing else:
{"score": 0.0, "reasoning": "one sentence explaining the score"}`;

  try {
    const raw = await generateTextFAQs(
      "You outout only valid JSON, nothing else",
      judgePrompt,
    );

    const parsed = JSON.parse(raw.trim().replace(/```json|```/g, ""));
    return {
      score: Math.max(0, Math.min(1, parsed.score)),
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error("Judge scoring failed:", error.message);
    return {
      score: null,
      reasoning: "Judge parsing failed — treated as failing score",
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

function percentile(arr, p) {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}