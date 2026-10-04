import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/authProvider";
import { queryKeys } from "../../api/queryKeys";
import {
  createEvaluationCase,
  deleteAllEvaluationCases,
  deleteEvaluationCase,
  getEvaluationCases,
  getEvaluationRun,
  getEvaluationRuns,
  runEvaluation,
} from "../../api/evaluation.api";
function percent(value) {
  return value == null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function score(value) {
  return value == null ? "N/A" : value.toFixed(3);
}

function EvaluationMetric({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function EvaluationPanel({ workspaceId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const role = user?.app_metadata?.role?.toLowerCase?.();
  const canRunEvaluation = role === "developer" || role === "admin";

  const [label, setLabel] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [question, setQuestion] = useState("");
  const [expectedUrls, setExpectedUrls] = useState("");
  const [expectedRelevance, setExpectedRelevance] = useState("");
  const [expectedFacts, setExpectedFacts] = useState("");
  const [referenceAnswer, setReferenceAnswer] = useState("");
  const [caseFormError, setCaseFormError] = useState("");

  //return all evaluation cases
  const caseQuery = useQuery({
    queryKey: queryKeys.evaluationCases(workspaceId),
    queryFn: () => getEvaluationCases(workspaceId),
    enabled: Boolean(workspaceId && canRunEvaluation),
  });

  //return all evaluationssss runs metrics
  const runsQuery = useQuery({
    queryKey: queryKeys.evaluationRuns(workspaceId),
    queryFn: () => getEvaluationRuns(workspaceId),
    enabled: Boolean(workspaceId && canRunEvaluation),
  });
  //return all evaluation runs metrics
  const runDetailQuery = useQuery({
    queryKey: queryKeys.evaluationRun(workspaceId, selectedRunId),
    queryFn: () => getEvaluationRun(workspaceId, selectedRunId),
    enabled: Boolean(workspaceId && selectedRunId && canRunEvaluation),
  });

  useEffect(() => {
    if (!selectedRunId && runsQuery.data?.length) {
      setSelectedRunId(runsQuery.data[0].id);
    }
  }, [selectedRunId, runsQuery.data]);

  const createCaseMutation = useMutation({
    mutationFn: (data) => createEvaluationCase(workspaceId, data),
    onSuccess: () => {
      //invalidate cache of cases
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluationCases(workspaceId),
      });
      setQuestion("");
      setExpectedFacts("");
      setExpectedUrls("");
      setExpectedRelevance("");
      setReferenceAnswer("");
      setCaseFormError("");
    },
  });

  const deleteCaseMutation = useMutation({
    mutationFn: (caseId) => deleteEvaluationCase(workspaceId, caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluationCases(workspaceId),
      });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => deleteAllEvaluationCases(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluationCases(workspaceId),
      });
    },
  });

  const runMutation = useMutation({
    mutationFn: (runLabel) => runEvaluation(workspaceId, runLabel),
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.evaluationRuns(workspaceId),
      });
      setSelectedRunId(run.id);
      queryClient.setQueryData(
        queryKeys.evaluationRun(workspaceId, run.id),
        run,
      );
    },
  });

   if (!canRunEvaluation) {
    return null;
  }

  if (!workspaceId) {
    return null;
  }

  async function handleCreateCase(event){
    event.preventDefault();
    setCaseFormError("");

    const urls = expectedUrls
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    const relevanceLines = expectedRelevance
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    const relevance = relevanceLines.map(Number);

    const facts = expectedFacts
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

    if (
      relevanceLines.length > 0 &&
      (relevance.length !== urls.length ||
        relevance.some(
          (value) => !Number.isInteger(value) || value < 0 || value > 3,
        ))
    ) {
      setCaseFormError(
        "Enter one relevance grade from 0 to 3 for each expected URL, in the same order.",
      );
      return;
    }

      await createCaseMutation.mutateAsync({
      question: question.trim(),
      expectedPageUrls: urls,
      expectedPageRelevance: relevanceLines.length ? relevance : undefined,
      expectedKeyFacts: facts,
      referenceAnswer: referenceAnswer.trim() || undefined,
    });
  }

  function handleRun() {
    runMutation.mutate(label.trim() || "unlabeled");
  }

   const cases = caseQuery.data ?? [];
  const runs = runsQuery.data ?? [];
  const selectedRun = runDetailQuery.data;
  const judgedCases = (selectedRun?.results ?? []).filter((result) =>
    Number.isFinite(result.judgeScore),
  ).length;

  return (
    <div className="evaluation-workbench">
      <section className="evaluation-surface evaluation-authoring" aria-labelledby="evaluation-case-title">
        <div className="evaluation-section-heading">
          <div>
            <p className="evaluation-kicker">TEST SET</p>
            <h2 id="evaluation-case-title">Evaluation cases</h2>
          </div>
          <span className="evaluation-count">{cases.length} cases</span>
        </div>

        <form className="evaluation-case-form" onSubmit={handleCreateCase}>
          <label className="evaluation-field">
            <span>Question</span>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What should the assistant answer?"
              minLength={3}
              required
            />
          </label>

          <label className="evaluation-field">
            <span>Expected source URLs</span>
            <textarea
              value={expectedUrls}
              onChange={(event) => setExpectedUrls(event.target.value)}
              placeholder="One URL per line"
              required
            />
          </label>

          <label className="evaluation-field">
            <span>Relevance grades (optional)</span>
            <textarea
              value={expectedRelevance}
              onChange={(event) => setExpectedRelevance(event.target.value)}
              placeholder="One grade per expected URL, in the same order (0-3)"
            />
          </label>

          <label className="evaluation-field">
            <span>Expected key facts</span>
            <textarea
              value={expectedFacts}
              onChange={(event) => setExpectedFacts(event.target.value)}
              placeholder="One fact per line"
              required
            />
          </label>

          <label className="evaluation-field">
            <span>Reference answer (optional)</span>
            <textarea
              value={referenceAnswer}
              onChange={(event) => setReferenceAnswer(event.target.value)}
              placeholder="A high-quality answer used for BLEU, ROUGE-L, METEOR, and BERTScore"
            />
          </label>

          <button
            className="evaluation-primary-action"
            type="submit"
            disabled={createCaseMutation.isPending}
          >
            {createCaseMutation.isPending ? "Adding case..." : "Add test case"}
          </button>
        </form>

        {caseFormError && (
          <p className="evaluation-error" role="alert">{caseFormError}</p>
        )}

        {createCaseMutation.isError && (
          <p className="evaluation-error" role="alert">
            {createCaseMutation.error.message}
          </p>
        )}
        {deleteCaseMutation.isError && (
          <p className="evaluation-error" role="alert">
            {deleteCaseMutation.error.message}
          </p>
        )}
        {deleteAllMutation.isError && (
          <p className="evaluation-error" role="alert">
            {deleteAllMutation.error.message}
          </p>
        )}

        <div className="evaluation-case-list-heading">
          <h3>Saved cases</h3>
          {cases.length > 0 && (
            <button
              className="evaluation-text-action"
              type="button"
              onClick={() => {
                if (window.confirm("Delete every evaluation test case?")) {
                  deleteAllMutation.mutate();
                }
              }}
              disabled={deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending ? "Deleting..." : "Delete all"}
            </button>
          )}
        </div>

        {caseQuery.isLoading ? (
          <p className="evaluation-muted">Loading test cases...</p>
        ) : caseQuery.isError ? (
          <p className="evaluation-error" role="alert">{caseQuery.error.message}</p>
        ) : cases.length === 0 ? (
          <p className="evaluation-empty">Add a case above to start measuring retrieval and answer quality.</p>
        ) : (
          <ul className="evaluation-case-list">
            {cases.map((testCase, index) => (
              <li className="evaluation-case-row" key={testCase.id}>
                <span className="evaluation-case-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="evaluation-case-copy">
                  <strong>{testCase.question}</strong>
                  <span>
                    {testCase.expectedPageUrls.length} expected {testCase.expectedPageUrls.length === 1 ? "source" : "sources"}
                    <span aria-hidden="true"> · </span>
                    {testCase.expectedKeyFacts.length} key {testCase.expectedKeyFacts.length === 1 ? "fact" : "facts"}
                    {testCase.referenceAnswer && " · reference answer"}
                  </span>
                </div>
                <button
                  className="evaluation-delete-action"
                  type="button"
                  aria-label={`Delete test case: ${testCase.question}`}
                  onClick={() => deleteCaseMutation.mutate(testCase.id)}
                  disabled={deleteCaseMutation.isPending}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="evaluation-results-column">
        <section className="evaluation-surface evaluation-run-controls" aria-labelledby="evaluation-run-title">
          <div className="evaluation-section-heading">
            <div>
              <p className="evaluation-kicker">EXECUTION</p>
              <h2 id="evaluation-run-title">Run evaluation</h2>
            </div>
            <span className="evaluation-count">{cases.length} cases queued</span>
          </div>

          <div className="evaluation-run-form">
            <label className="evaluation-field evaluation-run-label">
              <span>Run label</span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="e.g. before-prompt-update"
              />
            </label>
            <button
              className="evaluation-primary-action"
              type="button"
              onClick={handleRun}
              disabled={cases.length === 0 || runMutation.isPending}
            >
              {runMutation.isPending ? "Evaluating..." : "Run evaluation"}
            </button>
          </div>
          {runMutation.isError && (
            <p className="evaluation-error" role="alert">{runMutation.error.message}</p>
          )}
        </section>

        <section className="evaluation-surface evaluation-run-history" aria-labelledby="evaluation-history-title">
          <div className="evaluation-section-heading">
            <div>
              <p className="evaluation-kicker">RESULTS</p>
              <h2 id="evaluation-history-title">Run history</h2>
            </div>
            {runs.length > 0 && (
              <label className="evaluation-run-picker">
                <span className="evaluation-visually-hidden">Select evaluation run</span>
                <select
                  value={selectedRunId}
                  onChange={(event) => setSelectedRunId(event.target.value)}
                >
                  {runs.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.label} · {new Date(run.createdAt).toLocaleString()}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {runsQuery.isLoading ? (
            <p className="evaluation-muted">Loading evaluation runs...</p>
          ) : runsQuery.isError ? (
            <p className="evaluation-error" role="alert">{runsQuery.error.message}</p>
          ) : runs.length === 0 ? (
            <p className="evaluation-empty">No runs yet. Add test cases, then run an evaluation.</p>
          ) : runDetailQuery.isLoading ? (
            <p className="evaluation-muted">Loading run details...</p>
          ) : runDetailQuery.isError ? (
            <p className="evaluation-error" role="alert">{runDetailQuery.error.message}</p>
          ) : selectedRun ? (
            <>
              <dl className="evaluation-metrics">
                <EvaluationMetric label="Cases" value={selectedRun.totalCases} />
                <EvaluationMetric label="Retrieval hit rate" value={percent(selectedRun.avgHitRate)} />
                <EvaluationMetric label="Mean reciprocal rank" value={score(selectedRun.avgMRR)} />
                <EvaluationMetric label={`Answer score (${judgedCases}/${selectedRun.totalCases} judged)`} value={score(selectedRun.avgJudgeScore)} />
                <EvaluationMetric label="Precision@5" value={percent(selectedRun.avgPrecisionAtK)} />
                <EvaluationMetric label="Recall@5" value={percent(selectedRun.avgRecallAtK)} />
                <EvaluationMetric label="F1@5" value={percent(selectedRun.avgF1AtK)} />
                <EvaluationMetric label="nDCG@5" value={score(selectedRun.avgNdcgAtK)} />
                <EvaluationMetric label="BLEU-4" value={score(selectedRun.avgBleu)} />
                <EvaluationMetric label="ROUGE-L" value={score(selectedRun.avgRougeL)} />
                <EvaluationMetric label="METEOR (exact + stem)" value={score(selectedRun.avgMeteor)} />
                <EvaluationMetric label="BERTScore F1" value={score(selectedRun.avgBertScore)} />
                <EvaluationMetric label="Perplexity" value={score(selectedRun.avgPerplexity)} />
                <EvaluationMetric label="Groundedness" value={percent(selectedRun.avgGroundedness)} />
                <EvaluationMetric label="Hallucination rate" value={percent(selectedRun.avgHallucinationRate)} />
                <EvaluationMetric label="Factual consistency" value={percent(selectedRun.avgFactualConsistency)} />
                <EvaluationMetric label="Answer relevance" value={percent(selectedRun.avgAnswerRelevance)} />
                <EvaluationMetric label="Confident responses" value={percent(selectedRun.confidentRate)} />
                <EvaluationMetric label="Average latency" value={`${selectedRun.avgLatencyMs} ms`} />
                <EvaluationMetric label="P95 latency" value={`${selectedRun.p95LatencyMs} ms`} />
              </dl>

              <div className="evaluation-results-heading">
                <h3>Case results</h3>
                <span>{(selectedRun.results ?? []).length} results</span>
              </div>
              <ul className="evaluation-result-list">
                {(selectedRun.results ?? []).map((result) => (
                  <li className="evaluation-result-row" key={result.id}>
                    <div className="evaluation-result-topline">
                      <h4>{result.question}</h4>
                      <span className={`evaluation-outcome ${result.hit ? "is-pass" : "is-miss"}`}>
                        {result.hit ? "Retrieval hit" : "Retrieval miss"}
                      </span>
                    </div>
                    <div className="evaluation-result-stats">
                      <span>MRR {score(result.reciprocalRank)}</span>
                      <span>P/R/F1 {percent(result.precisionAtK)} / {percent(result.recallAtK)} / {percent(result.f1AtK)}</span>
                      <span>nDCG {score(result.ndcgAtK)}</span>
                      <span>Answer {score(result.judgeScore)}</span>
                      <span>Grounded {percent(result.groundedness)}</span>
                      <span>Hallucination {percent(result.hallucinationRate)}</span>
                      <span>Consistency {percent(result.factualConsistency)}</span>
                      <span>Relevance {percent(result.answerRelevance)}</span>
                      <span>{result.confident ? "Confident" : "Low confidence"}</span>
                      <span>{result.latencyMs} ms</span>
                    </div>
                    {result.judgeReasoning && (
                      <p className="evaluation-judge-reasoning">{result.judgeReasoning}</p>
                    )}
                    <details className="evaluation-evidence">
                      <summary>Answer and retrieved sources</summary>
                      <p>{result.generatedAnswer}</p>
                      <ul>
                        {(result.retrievedUrls ?? []).map((url, index) => (
                          <li key={`${url}-${index}`}>
                            <a href={url} target="_blank" rel="noreferrer">{url}</a>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
