import httpClient from "./backendConnection";

export async function listSources(workspaceId) {
  const response = await httpClient.get(
    `/api/workspaces/${workspaceId}/sources`,
  );

  return response.data.source;
}

export async function addSource(workspaceId, url) {
  const response = await httpClient.post(
    `/api/workspaces/${workspaceId}/sources`,
    { url },
  );

  return response.data.source;
}

export async function reindexSource(workspaceId, sourceId) {
  const response = await httpClient.post(
    `/api/workspaces/${workspaceId}/sources/${sourceId}/reindex`,
  );

  return response.data.source;
}

export async function deleteSource(workspaceId, sourceId) {
  const response = await httpClient.delete(
    `/api/workspaces/${workspaceId}/sources/${sourceId}`,
  );

  return response.data;
}