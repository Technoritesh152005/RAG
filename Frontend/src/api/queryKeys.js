export const queryKeys = {
  workspaces: ["workspaces"],

  workspace: (workspaceId) => [
    "workspace",
    workspaceId,
  ],

  workspaceStats: (workspaceId) => [
    "workspace-stats",
    workspaceId,
  ],

  sources: (workspaceId) => [
    "sources",
    workspaceId,
  ],
  usage: (workspaceId) => ["usage", workspaceId],
  cacheStats: (workspaceId) => ["cache-stats", workspaceId],

  evaluationCases: (workspaceId) => [
  "evaluation-cases",
  workspaceId,
],

evaluationRuns: (workspaceId) => [
  "evaluation-runs",
  workspaceId,
],

evaluationRun: (workspaceId, runId) => [
  "evaluation-run",
  workspaceId,
  runId,
],

faqs: (workspaceId) => ["faqs", workspaceId],
};

//query keys are keys which cache the data for react query infront of these keys