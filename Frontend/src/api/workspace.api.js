import httpClient from "./httpClient";

export async function listWorkspaces() {
  const response = await httpClient.get("/api/workspace");

  return response.data.workspace;
}

export async function getWorkspace(workspaceId) {
  const response = await httpClient.get(`/api/workspace/${workspaceId}`);

  return response.data.workspace;
}

export async function createWorkspace({ name, description }) {
  const response = await httpClient.post("/api/workspace", {
    name,
    description,
  });

  return response.data.workspace;
}

export async function updateWorkspace(workspaceId, data) {
  const response = await httpClient.patch(
    `/api/workspace/${workspaceId}`,
    data,
  );

  return response.data.workspace;
}

export async function deleteWorkspace(workspaceId) {
  const response = await httpClient.delete(`/api/workspace/${workspaceId}`);

  return response.data;
}

export async function getWorkspaceStats(workspaceId) {
  const response = await httpClient.get(
    `/api/workspace/${workspaceId}/stats`,
  );

  return response.data.stats;
}

export async function clearWorkspaceCache(workspaceId) {
  const response = await httpClient.delete(
    `/api/workspace/${workspaceId}/cache`,
  );

  return response.data;
}