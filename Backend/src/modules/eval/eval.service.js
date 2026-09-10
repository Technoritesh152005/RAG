import prisma from "../../lib/prisma.js";
import { runRAGPipeline } from "../chat/rag.service.js";
import { generateTextFAQs } from "../chat/groq.service.js";

const EVAL_CONCURRENCY = 3;
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
    order: { createdAt: "asc" },
  });
}
export async function deleteEvalCase(caseId, workspaceId) {
  return prisma.evalCase.deleteMany({
    where: { id: caseId, workspaceId },
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
      `Eval progress: ${Math.min(i + EVAL_CONCURRENCY, cases.length)}/${cases.length}`,
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
      totalCases: cases.length,
      avgHitRate: parseFloat((hitCount / cases.length).toFixed(4)),
      avgMRR: parseFloat(avgMRR.toFixed(4)),
      avgJudgeScore: parseFloat(avgJudgeScore.toFixed(4)),
      confidentRate: parseFloat((confidentCount / cases.length).toFixed(4)),
      avgLatencyMs: Math.round(average(latencies)),
      p95LatencyMs: percentile(latencies, 95),
      results: {
        create: results.map((r) => ({
          caseId: r.caseId,
          question: r.question,
          retrievedUrls: r.retrievedUrls,
          hit: r.hit,
          reciprocalRank: r.reciprocalRank,
          judgeScore: r.judgeScore,
          judgeReasoning: r.judgeReasoning,
          confident: r.confident,
          latencyMs: r.latencyMs,
          generatedAnswer: r.generatedAnswer,
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

  // this says get or return promise only when the question is done running through the rag pipeline means when resolves (onDOne) finishes
  let fullAnswer = "";
  let citations = [];
  let confident = false;

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
      //promise becomes completed=>await finishes and returns the full answer and moves to next line
      onDone: () => resolve(),
      onError: (err) => reject(err),
    }).catch(reject);
  });

  const latency = Date.now() - startTime;

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

  const { score, reasoning } = await judgeAnswer(
    evalCase.question,
    fullAnswer,
    evalCase.expectedUrl,
  );

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

Score how well the answer covers the expected key facts, from 0.0 to 1.0:
- 1.0 = all key facts present and accurate
- 0.5 = some key facts present, some missing or wrong
- 0.0 = key facts missing, wrong, or answer is a "not found" fallback when facts do exist

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
    console.error("Judge scoring failed:", err.message);
    return {
      score: 0,
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
    order: { createdAt: "desc" },
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