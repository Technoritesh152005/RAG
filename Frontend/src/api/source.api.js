import httpClient from "./backendConnection";
import { supabaseClient } from "../auth/auth";

export async function uploadPdfSource(workspaceId, file) {
  const initResponse = await httpClient.post(
    `/api/workspaces/${workspaceId}/sources/pdf/init-upload`,
    {
      filename: file.name,
      sizeBytes: file.size,
      mimeType: "application/pdf",
    },
  );
  const { sourceId, storagePath, token, bucket } = initResponse.data;

  const { error: uploadError } = await supabaseClient.storage
    .from(bucket)
    .uploadToSignedUrl(storagePath, token, file, {
      contentType: "application/pdf",
    });

  if (uploadError) {
    throw new Error(`PDF upload failed: ${uploadError.message}`);
  }

  const confirmResponse = await httpClient.post(
    `/api/workspaces/${workspaceId}/sources/pdf/${sourceId}/confirm-upload`,
  );

  return confirmResponse.data.source;
}

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