import httpClient from "./backendConnection";

export async function getWorkspaceUsage(workspaceId) {
  const response = await httpClient.get(
    `/api/workspaces/${workspaceId}/usage`,
  );

  return response.data;
}

export async function getWorkspaceCacheStats(workspaceId) {
  const response = await httpClient.get(
    `/api/workspaces/${workspaceId}/getCacheStats`,
  );

  return response.data.cache;
}