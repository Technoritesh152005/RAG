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
};

//query keys are keys which cache the data for react query infront of these keys