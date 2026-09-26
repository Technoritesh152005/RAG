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
};