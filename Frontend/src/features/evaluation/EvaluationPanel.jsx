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
  const { user } = getAuth();
  const queryClient = useQueryClient();

  const role = user?.app_metadata?.role?.toLowerCase();
  const canRunEvaluation = role === "developer" || role === "admin";

  const [label, setLabel] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [question, setQuestion] = useState("");
  const [expectedUrls, setExpectedUrls] = useState("");
  const [expectedFacts, setExpectedFacts] = useState("");

  //return all evaluation cases
  const caseQuery = useQuery({
    queryKey: queryKeys.evaluationCases(workspaceId),
    queryFn: () => getEvaluationCases(workspaceId),
    enabled: Boolean(workspaceId && canRunEvaluation),
  });

  //return all evaluationssss runs metrics
  const runsQuery = useQuery({
    queryKeys: queryKeys.evaluationRuns(workspaceId),
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

  const createCaseMutations = useMutation({
    mutationFn: (data) => createCaseMutations(workspaceId, data),
    onSuccess: () => {
      //invalidate cache of cases
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluationCases(workspaceId),
      });
      setQuestion("");
      setExpectedFacts("");
      setExpectedUrls("");
    },
  });

  const deleteCaseMutations = useMutation({
    mutationFn: (caseId) => deleteEvaluationCase(caseId),
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
    mutationFn:(runLabel)=>runEvaluation(workspaceId,runLabel),
    //u use await cause u need to first delete this cache and later set
    onSuccess:async()=>{
        await queryClient.invalidateQueries({
            queryKey:queryKeys.evaluationRuns(workspaceId)
        })
        //set in evaluation run
        queryClient.setQueryData(
            queryKeys.evaluationRun(workspaceId, run.id),
            run
        )
    }
  });

   if (!canRunEvaluation) {
    return null;
  }

  if (!workspaceId) {
    return null;
  }

  async function handleCreateCase(event){
    event.preventDefault();

    const urls = expectedUrls
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

    const facts = expectedFacts
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

      await createCaseMutations.mutateAsync({
      question: question.trim(),
      expectedPageUrls: urls,
      expectedKeyFacts: facts,
    });
  }

  function handleRun() {
    runMutation.mutate(label.trim() || "unlabeled");
  }

   const cases = casesQuery.data ?? [];
  const runs = runsQuery.data ?? [];
  const selectedRun = runDetailQuery.data;

  return (
    <section aria-labelledby="evaluation-title">
      <h2 id="evaluation-title">RAG Evaluation</h2>
      <p>
        Developer/admin workspace evaluation. These scores come from
        evaluation test runs, not regular chat usage.
      </p>

      <section aria-labelledby="evaluation-case-title">
        <h3 id="evaluation-case-title">Test cases</h3>

        <form onSubmit={handleCreateCase}>
          <label>
            Question
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              minLength={3}
              required
            />
          </label>

          <label>
            Expected page URLs, one per line
            <textarea
              value={expectedUrls}
              onChange={(event) => setExpectedUrls(event.target.value)}
              required
            />
          </label>

          <label>
            Expected key facts, one per line
            <textarea
              value={expectedFacts}
              onChange={(event) => setExpectedFacts(event.target.value)}
              required
            />
          </label>

          <button
            type="submit"
            disabled={createCaseMutation.isPending}
          >
            {createCaseMutation.isPending ? "Adding..." : "Add test case"}
          </button>
        </form>

        {createCaseMutation.isError && (
          <p role="alert">{createCaseMutation.error.message}</p>
        )}

        {casesQuery.isLoading ? (
          <p>Loading test cases...</p>
        ) : casesQuery.isError ? (
          <p role="alert">{casesQuery.error.message}</p>
        ) : cases.length === 0 ? (
          <p>Add test cases before running an evaluation.</p>
        ) : (
          <>
            <ul>
              {cases.map((testCase) => (
                <li key={testCase.id}>
                  <strong>{testCase.question}</strong>
                  <p>
                    Expected URLs: {testCase.expectedPageUrls.join(", ")}
                  </p>
                  <p>
                    Expected facts: {testCase.expectedKeyFacts.join("; ")}
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteCaseMutation.mutate(testCase.id)}
                    disabled={deleteCaseMutation.isPending}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete every evaluation test case?")) {
                  deleteAllMutation.mutate();
                }
              }}
              disabled={deleteAllMutation.isPending}
            >
              Delete all test cases
            </button>
          </>
        )}

        {deleteCaseMutations.isError && (
          <p role="alert">{deleteCaseMutation.error.message}</p>
        )}
        {deleteAllMutation.isError && (
          <p role="alert">{deleteAllMutation.error.message}</p>
        )}
      </section>

      <section aria-labelledby="evaluation-run-title">
        <h3 id="evaluation-run-title">Run evaluation</h3>

        <label>
          Run label
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. before-prompt-update"
          />
        </label>

        <button
          type="button"
          onClick={handleRun}
          disabled={cases.length === 0 || runMutation.isPending}
        >
          {runMutation.isPending ? "Running evaluation..." : "Run evaluation"}
        </button>

        {runMutation.isError && (
          <p role="alert">{runMutation.error.message}</p>
        )}
      </section>

      <section aria-labelledby="evaluation-history-title">
        <h3 id="evaluation-history-title">Run history</h3>

        {runsQuery.isLoading ? (
          <p>Loading evaluation runs...</p>
        ) : runsQuery.isError ? (
          <p role="alert">{runsQuery.error.message}</p>
        ) : runs.length === 0 ? (
          <p>No evaluation runs yet.</p>
        ) : (
          <label>
            Select run
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

        {runDetailQuery.isLoading && selectedRunId && (
          <p>Loading run details...</p>
        )}

        {runDetailQuery.isError && (
          <p role="alert">{runDetailQuery.error.message}</p>
        )}

        {selectedRun && (
          <>
            <dl>
              <EvaluationMetric
                label="Test cases"
                value={selectedRun.totalCases}
              />
              <EvaluationMetric
                label="Retrieval hit rate"
                value={percent(selectedRun.avgHitRate)}
              />
              <EvaluationMetric
                label="Mean reciprocal rank"
                value={score(selectedRun.avgMRR)}
              />
              <EvaluationMetric
                label="Answer judge score"
                value={score(selectedRun.avgJudgeScore)}
              />
              <EvaluationMetric
                label="Confident responses"
                value={percent(selectedRun.confidentRate)}
              />
              <EvaluationMetric
                label="Average latency"
                value={`${selectedRun.avgLatencyMs} ms`}
              />
              <EvaluationMetric
                label="P95 latency"
                value={`${selectedRun.p95LatencyMs} ms`}
              />
            </dl>

            <h4>Case results</h4>
            <ul>
              {(selectedRun.results ?? []).map((result) => (
                <li key={result.id}>
                  <h5>{result.question}</h5>
                  <p>Expected retrieval match: {result.hit ? "Yes" : "No"}</p>
                  <p>Reciprocal rank: {score(result.reciprocalRank)}</p>
                  <p>Answer score: {score(result.judgeScore)}</p>
                  <p>
                    Confidence: {result.confident ? "Confident" : "Low"}
                  </p>
                  <p>Latency: {result.latencyMs} ms</p>
                  <p>Judge reasoning: {result.judgeReasoning}</p>
                  <details>
                    <summary>Generated answer</summary>
                    <p>{result.generatedAnswer}</p>
                  </details>
                  <details>
                    <summary>Retrieved URLs</summary>
                    <ul>
                      {(result.retrievedUrls ?? []).map((url) => (
                        <li key={url}>
                          <a href={url} target="_blank" rel="noreferrer">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </section>
  );
}
