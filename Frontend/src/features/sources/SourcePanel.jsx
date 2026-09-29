import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../api/queryKeys";
import {
  addSource,
  deleteSource,
  listSources,
  reindexSource,
} from "../../api/source.api";
import { useSourceStatus } from "../../realtime/useSourceStatus";
import { MutationFeedback, QueryFeedback } from "../../components/asyncFeedback";

export default function SourcePanel({ workspaceId }) {
  const queryClient = useQueryClient();
  const { connected } = useSourceStatus(workspaceId);

  const [url, setUrl] = useState("");
  const [formError, setFormError] = useState("");

  const sourcesQuery = useQuery({
    queryKey: queryKeys.sources(workspaceId),
    queryFn: () => listSources(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const addSourceMutation = useMutation({
    mutationFn: (url) => addSource(workspaceId, url),
    onSuccess: async () => {
      setUrl("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sources(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaceStats(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workspace(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaces }),
      ]);
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId) => deleteSource(workspaceId, sourceId),
    onMutate: async (sourceId) => {
      const sourcesKey = queryKeys.sources(workspaceId);
      const workspaceKey = queryKeys.workspace(workspaceId);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: sourcesKey }),
        queryClient.cancelQueries({ queryKey: workspaceKey }),
        queryClient.cancelQueries({ queryKey: queryKeys.workspaces }),
      ]);

      const previousSources = queryClient.getQueryData(sourcesKey);
      const previousWorkspace = queryClient.getQueryData(workspaceKey);
      const previousWorkspaces = queryClient.getQueryData(queryKeys.workspaces);

      queryClient.setQueryData(sourcesKey, (sources) =>
        sources?.filter((source) => source.id !== sourceId),
      );
      queryClient.setQueryData(workspaceKey, (workspace) =>
        workspace
          ? {
              ...workspace,
              sources: workspace.sources?.filter(
                (source) => source.id !== sourceId,
              ),
            }
          : workspace,
      );
      queryClient.setQueryData(queryKeys.workspaces, (workspaces) =>
        workspaces?.map((workspace) =>
          workspace.id === workspaceId
            ? {
                ...workspace,
                sources: workspace.sources?.filter(
                  (source) => source.id !== sourceId,
                ),
              }
            : workspace,
        ),
      );

      return { previousSources, previousWorkspace, previousWorkspaces };
    },
    onError: (_error, _sourceId, context) => {
      if (context?.previousSources !== undefined) {
        queryClient.setQueryData(queryKeys.sources(workspaceId), context.previousSources);
      }
      if (context?.previousWorkspace !== undefined) {
        queryClient.setQueryData(queryKeys.workspace(workspaceId), context.previousWorkspace);
      }
      if (context?.previousWorkspaces !== undefined) {
        queryClient.setQueryData(queryKeys.workspaces, context.previousWorkspaces);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.sources(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaceStats(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workspace(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaces }),
      ]);
    },
  });

  const reindexSourceMutation = useMutation({
    mutationFn: (sourceId) => reindexSource(workspaceId, sourceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.sources(workspaceId),
      });
    },
  });

  async function handleAddSource(event) {
    event.preventDefault();
    setFormError("");

    const trimmed = url.trim();
    try {
      const parsedUrl = new URL(trimmed);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are supported.");
      }

      if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
        throw new Error(
          "Enter a specific documentation section URL, not just the site homepage.",
        );
      }

      await addSourceMutation.mutateAsync(trimmed);
    } catch (error) {
      if (error instanceof TypeError) {
        addSourceMutation.reset();
        setFormError(error.message || "Enter a valid URL.");
        return;
      }
      setFormError(error.message || "Could not add this source.");
    }
  }

  function handleDelete(sourceId) {
    if (
      !window.confirm(
        "Delete this source and its indexed data? This action cannot be undone.",
      )
    ) {
      return;
    }
    deleteSourceMutation.mutate(sourceId);
  }

  if (!workspaceId) {
    return (
      <div className="directory-empty-state">
        <p>Select a workspace to manage its documentation sources.</p>
      </div>
    );
  }

  const sources = sourcesQuery.data ?? [];

  return (
    <div className="source-panel-container">
      {/* Panel Top Banner */}
      <div className="source-panel-header">
        <div className="source-header-meta">
          <h3>Documentation Sources</h3>
          <p>Connect documentation section URLs. Your AI assistant will search these pages for accurate answers.</p>
        </div>
        <div className={`live-status-pill ${connected ? "connected" : ""}`}>
          <span className="live-dot" />
          <span>{connected ? "Live sync connected" : "Connecting..."}</span>
        </div>
      </div>

      {/* Add Source Input Form */}
      <form className="add-source-form" onSubmit={handleAddSource}>
        <div className="source-input-group">
          <label htmlFor="source-url">Add documentation URL</label>
          <div className="input-with-button">
            <input
              id="source-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://docs.example.com/guide/getting-started"
              required
            />
            <button
              type="submit"
              className="primary-action-white"
              disabled={addSourceMutation.isPending}
            >
              {addSourceMutation.isPending ? "Adding..." : "+ Add source"}
            </button>
          </div>
        </div>

        {formError && <p className="form-error-msg" role="alert">{formError}</p>}

        <MutationFeedback
          mutation={addSourceMutation}
          pendingMessage="Adding source to indexing queue..."
          successMessage="Source added and queued for processing."
        />
      </form>

      {/* Sources List & Details */}
      <QueryFeedback
        isLoading={sourcesQuery.isLoading}
        error={sourcesQuery.error}
        onRetry={() => sourcesQuery.refetch()}
        isEmpty={sources.length === 0}
        emptyMessage="No documentation sources added yet. Enter a URL above to get started."
        hasData={sourcesQuery.data !== undefined}
      >
        <div className="sources-list">
          {sources.map((source) => {
            const isDone = source.status === "DONE";
            const isFailed = source.status === "FAILED";

            return (
              <div key={source.id} className="source-item-card">
                <div className="source-main-info">
                  <div className="source-url-row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="link-icon">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="source-url-link"
                    >
                      {source.url}
                    </a>
                  </div>

                  <div className="source-meta-row">
                    <span className={`status-pill ${isDone ? "status-active" : isFailed ? "status-failed" : "status-grey"}`}>
                      <span className="status-dot" />
                      <span>{source.status}</span>
                    </span>

                    {source.pageCount != null && (
                      <span className="meta-fact">{source.pageCount} {source.pageCount === 1 ? "page" : "pages"}</span>
                    )}
                    {source.chunkCount != null && (
                      <span className="meta-fact">{source.chunkCount} {source.chunkCount === 1 ? "chunk" : "chunks"}</span>
                    )}
                  </div>

                  {source.error && (
                    <p className="source-error-text" role="alert">
                      Error: {source.error}
                    </p>
                  )}
                </div>

                <div className="source-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => reindexSourceMutation.mutate(source.id)}
                    disabled={
                      reindexSourceMutation.isPending ||
                      source.status === "PENDING" ||
                      source.status === "SCRAPING" ||
                      source.status === "EMBEDDING"
                    }
                  >
                    {reindexSourceMutation.isPending &&
                    reindexSourceMutation.variables === source.id
                      ? "Syncing..."
                      : "Resync"}
                  </button>

                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => handleDelete(source.id)}
                    disabled={deleteSourceMutation.isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </QueryFeedback>

      <MutationFeedback
        mutation={reindexSourceMutation}
        pendingMessage="Syncing source data..."
        successMessage="Source resync queued."
      />
      <MutationFeedback
        mutation={deleteSourceMutation}
        pendingMessage="Deleting source..."
        successMessage="Source deleted."
      />
    </div>
  );
}
