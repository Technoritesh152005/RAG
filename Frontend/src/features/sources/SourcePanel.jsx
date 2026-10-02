import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../api/queryKeys";
import {
  addSource,
  deleteSource,
  listSources,
  reindexSource,
  uploadPdfSource,
} from "../../api/source.api";
import { useSourceStatus } from "../../realtime/useSourceStatus";
import { MutationFeedback, QueryFeedback } from "../../components/asyncFeedback";

const ADD_SOURCE_TABS = [
  { value: "PDF", label: "UPLOAD PDF", icon: "upload" },
  { value: "WEB", label: "WEB URL", icon: "web" },
  { value: "YOUTUBE", label: "YOUTUBE", icon: "youtube" },
];

export default function SourcePanel({ workspaceId }) {
  const queryClient = useQueryClient();
  const { connected } = useSourceStatus(workspaceId);

  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [isPdfDragging, setIsPdfDragging] = useState(false);
  const [sourceKind, setSourceKind] = useState("WEB");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [walkthroughSourceId, setWalkthroughSourceId] = useState(null);

  const sourcesQuery = useQuery({
    queryKey: queryKeys.sources(workspaceId),
    queryFn: () => listSources(workspaceId),
    enabled: Boolean(workspaceId),
  });

  async function handleSourceAdded(source) {
    setUrl("");
    setPdfFile(null);
    setIsAddModalOpen(false);
    setWalkthroughSourceId(source.id);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.sources(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceStats(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.workspace(workspaceId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces }),
    ]);
  }

  const addSourceMutation = useMutation({
    mutationFn: (url) => addSource(workspaceId, url),
    onSuccess: handleSourceAdded,
  });

  const uploadPdfMutation = useMutation({
    mutationFn: (file) => uploadPdfSource(workspaceId, file),
    onSuccess: handleSourceAdded,
  });
  const isAddingSource = addSourceMutation.isPending || uploadPdfMutation.isPending;

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

  useEffect(() => {
    if (!isAddModalOpen) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape" && !isAddingSource) {
        setIsAddModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isAddModalOpen, isAddingSource]);

  function selectPdfFile(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") ||
        (file.type && file.type !== "application/pdf")) {
      setPdfFile(null);
      setFormError("Choose a valid PDF file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setPdfFile(null);
      setFormError("PDF files must be 25 MB or smaller.");
      return;
    }

    setPdfFile(file);
    setFormError("");
  }

  async function handleAddSource(event) {
    event.preventDefault();
    setFormError("");

    if (sourceKind === "PDF") {
      if (!pdfFile) {
        setFormError("Choose a PDF file to upload.");
        return;
      }
      if (!pdfFile.name.toLowerCase().endsWith(".pdf") ||
          (pdfFile.type && pdfFile.type !== "application/pdf")) {
        setFormError("Choose a valid PDF file.");
        return;
      }
      if (pdfFile.size > 25 * 1024 * 1024) {
        setFormError("PDF files must be 25 MB or smaller.");
        return;
      }

      try {
        await uploadPdfMutation.mutateAsync(pdfFile);
      } catch (error) {
        setFormError(error.message || "Could not upload this PDF.");
      }
      return;
    }

    const trimmed = url.trim();
    try {
      const parsedUrl = new URL(trimmed);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Only HTTP and HTTPS URLs are supported.");
      }

      const hostname = parsedUrl.hostname.toLowerCase();
      const isYoutubeHost = [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
      ].includes(hostname);

      if (sourceKind === "YOUTUBE") {
        let videoId = null;
        if (hostname === "youtu.be") {
          videoId = parsedUrl.pathname.slice(1).split("/")[0] || null;
        } else if (
          parsedUrl.pathname.startsWith("/shorts/") ||
          parsedUrl.pathname.startsWith("/embed/")
        ) {
          videoId = parsedUrl.pathname.split("/")[2] || null;
        } else {
          videoId = parsedUrl.searchParams.get("v");
        }

        if (!isYoutubeHost || !videoId || videoId.length !== 11) {
          throw new Error("Paste a valid YouTube video URL.");
        }
        if (parsedUrl.searchParams.has("list") && !parsedUrl.searchParams.has("v")) {
          throw new Error("Playlist URLs are not supported. Paste a single video URL.");
        }
      } else if (isYoutubeHost) {
        throw new Error("Choose YouTube as the source type for a video URL.");
      } else if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
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
  const walkthroughSource =
    sources.find((source) => source.id === walkthroughSourceId) ??
    (addSourceMutation.data?.id === walkthroughSourceId
      ? addSourceMutation.data
      : null);

  const isYoutubeWalkthrough = walkthroughSource?.sourceType === "YOUTUBE";
  const youtubeStageMessages = {
    fetching_metadata: "Loading video details",
    fetching_transcript: "Fetching captions",
    audio_download: "Downloading audio for transcription",
    splitting_audio: "Preparing audio for transcription",
    chunking: "Grouping transcript by video timestamps",
  };
  const indexingSteps = isYoutubeWalkthrough
    ? [
        { key: "PENDING", title: "Queued", detail: "Waiting for a video indexer" },
        { key: "SCRAPING", title: "Reading video", detail: "Fetching captions or preparing audio transcription" },
        { key: "CHUNKING", title: "Preparing transcript", detail: "Grouping passages by video timestamps" },
        { key: "EMBEDDING", title: "Building search", detail: "Making transcript passages searchable" },
        { key: "DONE", title: "Ready", detail: "Available in workspace chat" },
      ]
    : [
        { key: "PENDING", title: "Queued", detail: "Waiting for an indexer" },
        { key: "SCRAPING", title: "Reading pages", detail: "Following links in this section" },
        { key: "CHUNKING", title: "Preparing text", detail: "Splitting pages into passages" },
        { key: "EMBEDDING", title: "Building search", detail: "Making passages searchable" },
        { key: "DONE", title: "Ready", detail: "Available in workspace chat" },
      ];
  const statusOrder = {
    PENDING: 0,
    SCRAPING: 1,
    CHUNKING: 2,
    EMBEDDING: 3,
    DONE: 4,
  };
  const walkthroughStatus = walkthroughSource?.status ?? "PENDING";
  const activeStep = statusOrder[walkthroughStatus] ?? 0;
  const embeddingProgress = walkthroughSource?.embeddingTotal
    ? Math.min(
        100,
        Math.round(
          (walkthroughSource.embeddingCompleted / walkthroughSource.embeddingTotal) * 100,
        ),
      )
    : null;
  return (
    <div className="source-panel-container">
      {/* Panel Top Banner */}
      <div className="source-panel-header">
        <div className="source-header-meta">
          <h3>Knowledge Sources</h3>
          <p>Add a website, documentation section, or YouTube video to workspace search.</p>
        </div>
        <div className="source-header-actions">
          <div className={`live-status-pill ${connected ? "connected" : ""}`}>
            <span className="live-dot" />
            <span>{connected ? "Live sync connected" : "Connecting..."}</span>
          </div>
          <button
            type="button"
            className="add-source-open"
            onClick={() => setIsAddModalOpen(true)}
          >
            <span aria-hidden="true">+</span> Add Source
          </button>
        </div>
      </div>

      {isAddModalOpen && (
        <div
          className="add-source-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !addSourceMutation.isPending
            ) {
              setIsAddModalOpen(false);
            }
          }}
        >
          <section
            className="add-source-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-source-title"
          >
            <header className="add-source-modal-header">
              <h2 id="add-source-title">Add Source</h2>
              <button
                type="button"
                className="add-source-close"
                aria-label="Close dialog"
                disabled={addSourceMutation.isPending}
                onClick={() => setIsAddModalOpen(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </header>

            <form className="add-source-modal-body" onSubmit={handleAddSource}>
              <div className="add-source-tabs" role="tablist" aria-label="Source type">
                {ADD_SOURCE_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={sourceKind === tab.value}
                    aria-disabled={tab.disabled || undefined}
                    disabled={tab.disabled || addSourceMutation.isPending}
                    className={`add-source-tab ${sourceKind === tab.value ? "is-active" : ""} ${tab.value === "YOUTUBE" ? "is-youtube" : ""}`}
                    onClick={() => {
                      if (tab.disabled) return;
                      setSourceKind(tab.value);
                      setFormError("");
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {tab.icon === "upload" && (
                        <>
                          <path d="M12 16V4m0 0L8 8m4-4 4 4" />
                          <path d="M5 14v5h14v-5" />
                        </>
                      )}
                      {tab.icon === "web" && (
                        <>
                          <circle cx="12" cy="12" r="9" />
                          <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
                        </>
                      )}
                      {tab.icon === "youtube" && (
                        <>
                          <rect x="3" y="5" width="18" height="14" rx="4" />
                          <path d="m10 9 5 3-5 3z" />
                        </>
                      )}
                    </svg>
                    <span>{tab.label}</span>
                    {tab.disabled && <small>SOON</small>}
                  </button>
                ))}
              </div>

              {sourceKind === "PDF" ? (
                <div className="add-source-entry">
                  <span className="add-source-entry-label">PDF document</span>
                  <input
                    id="source-pdf"
                    className="add-source-file-input"
                    type="file"
                    accept="application/pdf,.pdf"
                    disabled={isAddingSource}
                    onChange={(event) => selectPdfFile(event.target.files?.[0])}
                  />
                  <label
                    className={`add-source-dropzone ${isPdfDragging ? "is-dragging" : ""} ${pdfFile ? "has-file" : ""}`}
                    htmlFor="source-pdf"
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsPdfDragging(true);
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setIsPdfDragging(false);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsPdfDragging(false);
                      selectPdfFile(event.dataTransfer.files?.[0]);
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
                      <path d="M5 14v5h14v-5" />
                    </svg>
                    <strong>{pdfFile?.name ?? "Drop your PDF here"}</strong>
                    <span className="pdf-dropzone-detail">
                      {pdfFile
                        ? `${(pdfFile.size / (1024 * 1024)).toFixed(1)} MB · PDF document`
                        : "or browse files · PDF up to 25 MB"}
                    </span>
                    <span className="pdf-dropzone-action">
                      {pdfFile ? "Choose a different file" : "Browse files"}
                    </span>
                  </label>
                  <p className="add-source-hint">Your document will be securely uploaded and indexed for workspace search.</p>
                </div>
              ) : (
              <div className="add-source-entry">
                <label htmlFor="source-url">
                  {sourceKind === "YOUTUBE" ? "YouTube video URL" : "Web URL / Docs URL"}
                </label>
                <input
                  id="source-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder={
                    sourceKind === "YOUTUBE"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://docs.example.com/guide/getting-started"
                  }
                  required
                  autoFocus
                />
                <p className="add-source-hint">
                  {sourceKind === "YOUTUBE"
                    ? "A single public video link. Captions are indexed with timestamped references."
                    : "Add a public webpage or a specific documentation section."}
                </p>
              </div>
                )}

              {formError && <p className="form-error-msg" role="alert">{formError}</p>}
              <MutationFeedback
                  mutation={sourceKind === "PDF" ? uploadPdfMutation : addSourceMutation}
                  pendingMessage={sourceKind === "PDF" ? "Uploading PDF and starting indexing..." : "Adding source to indexing queue..."}
                successMessage="Source added and queued for processing."
              />

              <footer className="add-source-modal-footer">
                <button
                  type="button"
                  className="add-source-cancel"
                  disabled={isAddingSource}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="add-source-submit"
                  disabled={isAddingSource}
                >
                  {isAddingSource
                    ? sourceKind === "PDF" ? "Uploading..." : "Adding..."
                    : sourceKind === "PDF"
                      ? "Upload PDF"
                      : sourceKind === "YOUTUBE"
                        ? "Add Video"
                        : "Add URL"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {walkthroughSource && (
        <section
          className={`indexing-walkthrough ${walkthroughStatus === "FAILED" ? "is-failed" : ""} ${walkthroughStatus === "DONE" ? "is-done" : ""}`}
          aria-live="polite"
          aria-labelledby="indexing-walkthrough-title"
        >
          <div className="walkthrough-heading">
            <div className="walkthrough-heading-copy">
              <p className="walkthrough-eyebrow">DOCUFLUX / LIVE INDEXING</p>
              <h3 id="indexing-walkthrough-title">
                {walkthroughStatus === "DONE"
                  ? "Your source is ready"
                  : walkthroughStatus === "FAILED"
                    ? "This source needs attention"
                    : "Here’s what DocuFlux is doing"}
              </h3>
              <p className="walkthrough-url" title={walkthroughSource.url}>
                {walkthroughSource.url}
              </p>
            </div>
            <button
              type="button"
              className="walkthrough-skip"
              onClick={() => setWalkthroughSourceId(null)}
            >
              {walkthroughStatus === "DONE" || walkthroughStatus === "FAILED"
                ? "Dismiss"
                : "Skip animation"}
            </button>
          </div>

          <div className="walkthrough-steps">
            {indexingSteps.map((step, index) => {
              const completed = walkthroughStatus === "DONE" || index < activeStep;
              const active = walkthroughStatus !== "DONE" &&
                walkthroughStatus !== "FAILED" && index === activeStep;

              return (
                <div
                  className={`walkthrough-step ${completed ? "is-complete" : ""} ${active ? "is-active" : ""}`}
                  key={step.key}
                >
                  <span className="walkthrough-step-mark" aria-hidden="true">
                    {completed ? "✓" : String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="walkthrough-step-copy">
                    <strong>{step.title}</strong>
                    <small>{step.detail}</small>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="walkthrough-live-line">
            <span className="walkthrough-live-indicator" aria-hidden="true" />
            {walkthroughStatus === "PENDING" && "Your source is queued. A worker will start reading it shortly."}
            {walkthroughStatus === "SCRAPING" && (
              <>
                {isYoutubeWalkthrough
                  ? youtubeStageMessages[walkthroughSource.stage] ??
                    "Reading video details and transcript"
                  : walkthroughSource.pageCount
                    ? `Reading pages · ${walkthroughSource.pageCount} found`
                    : "Opening the section and reading its pages"}
                {walkthroughSource.chunkCount != null &&
                  ` · ${walkthroughSource.chunkCount} passages found`}
              </>
            )}
            {walkthroughStatus === "CHUNKING" &&
              (isYoutubeWalkthrough
                ? "Preparing timestamped transcript passages"
                : `Splitting pages into searchable passages${walkthroughSource.pageCount ? ` · ${walkthroughSource.pageCount} pages read` : ""}`)}
            {walkthroughStatus === "EMBEDDING" && (
              <>
                {embeddingProgress != null
                  ? `Making ${walkthroughSource.embeddingTotal} passages searchable · ${embeddingProgress}% complete`
                  : "Splitting the content into passages and making it searchable"}
                {walkthroughSource.embeddingCompleted != null &&
                  ` · ${walkthroughSource.embeddingCompleted}/${walkthroughSource.embeddingTotal} embedded`}
              </>
            )}
            {walkthroughStatus === "DONE" && (
              isYoutubeWalkthrough
                ? `Ready to chat · ${walkthroughSource.chunkCount ?? 0} passages`
                : `Ready to chat · ${walkthroughSource.pageCount ?? 0} pages · ${walkthroughSource.chunkCount ?? 0} passages`
            )}
            {walkthroughStatus === "FAILED" &&
              (walkthroughSource.error || "Indexing failed. Check the source URL and try again.")}
          </div>

          {walkthroughStatus === "EMBEDDING" && walkthroughSource.embeddingTotal > 0 && (
            <progress
              className="walkthrough-progress"
              max={walkthroughSource.embeddingTotal}
              value={walkthroughSource.embeddingCompleted ?? 0}
              aria-label="Embedding progress"
            />
          )}

          {walkthroughStatus !== "DONE" && walkthroughStatus !== "FAILED" && (
            <p className="walkthrough-skip-note">
              You can leave this here or skip the walkthrough. Indexing continues either way.
            </p>
          )}
        </section>
      )}

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
            const isYoutube = source.sourceType === "YOUTUBE";

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

                    <span className="meta-fact">
                      {isYoutube
                        ? "YouTube video"
                        : source.sourceType === "PDF"
                          ? "PDF"
                          : "Website"}
                    </span>

                    {!isYoutube && source.pageCount != null && (
                      <span className="meta-fact">{source.pageCount} {source.pageCount === 1 ? "page" : "pages"}</span>
                    )}
                    {source.chunkCount != null && (
                      <span className="meta-fact">
                        {source.chunkCount} {isYoutube
                          ? source.chunkCount === 1 ? "passage" : "passages"
                          : source.chunkCount === 1 ? "chunk" : "chunks"}
                      </span>
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
