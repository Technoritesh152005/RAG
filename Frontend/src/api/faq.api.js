import httpClient from "./backendConnection";

export async function getWorkspaceFAQs(workspaceId) {
  const response = await httpClient.get(
    `/api/workspaces/${workspaceId}/faqs`,
  );

  return response.data.faqs;
}

export async function generateWorkspaceFAQs(workspaceId) {
  const response = await httpClient.post(
    `/api/workspaces/${workspaceId}/faqs/generate`,
  );

  return response.data;
}