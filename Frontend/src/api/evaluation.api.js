import httpClient from "./backendConnection";

import httpClient from "./backendConnection";

export async function getEvaluationCases(workspaceId) {
  const response = await httpClient.get(
    `/api/workspaces/${workspaceId}/eval/cases`,
  );

  return response.data.evalCases;
}

export async function createEvaluationCase(workspaceId, data) {
  const response = await httpClient.post(
    `/api/workspaces/${workspaceId}/eval/cases`,
    data,
  );

  return response.data.eval;
}

export async function deleteEvaluationCase(workspaceId, caseId) {
  const response = await httpClient.delete(
    `/api/workspaces/${workspaceId}/eval/cases/${caseId}`,
  );

  return response.data;
}

export async function deleteAllEvaluationCases(workspaceId) {
  const response = await httpClient.delete(
    `/api/workspaces/${workspaceId}/eval/cases`,
  );

  return response.data;
}

export async function runEvaluation(workspaceId, label) {
  const response = await httpClient.post(
    `/api/workspaces/${workspaceId}/eval/run`,
    { label },
  );

  return response.data.run;
}

export async function getEvaluationRuns(workspaceId) {
  const response = await httpClient.get(
    `/api/workspaces/${workspaceId}/eval/runs`,
  );

  return response.data.runs;
}

export async function getEvaluationRun(workspaceId, runId) {
  const response = await httpClient.get(
    `/api/workspaces/${workspaceId}/eval/runs/${runId}`,
  );

  return response.data.run;
}