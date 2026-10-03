import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  clearWorkspaceCache,
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaceStats,
  listWorkspaces,
  updateWorkspace,
} from "../api/workspace.api";
import SourcePanel from "../features/sources/SourcePanel";
import ChatPanel from "../features/chat/ChatPanel";
import WorkspaceFAQs from "../features/chat/WorkspaceFaq";
import WorkspaceAnalytics from "../features/analytics/WorkspaceAnalytics";
import EvaluationPanel from "../features/evaluation/EvaluationPanel";
import { QueryFeedback, MutationFeedback, ConfirmModal } from "../components/asyncFeedback";

import { queryKeys } from "../api/queryKeys";
import { useWorkspaceStore } from "../stores/workspace.store";
import { useAuth } from "../auth/authProvider";
import "./WorkspaceShell.css";

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name) {
  if (!name) return "WS";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function WorkspacePage() {
  const { signOut, user } = useAuth();
  const userRole = user?.app_metadata?.role?.toLowerCase?.();
  const canRunEvaluation = userRole === "admin" || userRole === "developer";
  const queryClient = useQueryClient();

  const selectedWorkspaceId = useWorkspaceStore(
    (state) => state.selectedWorkspaceId,
  );

  const setSelectedWorkspaceId = useWorkspaceStore(
    (state) => state.setSelectedWorkspaceId,
  );

  const [activeView, setActiveView] = useState("workspaces");
  const [editing, setEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'active' | 'needs_source'
  const [faqPrompt, setFaqPrompt] = useState("");
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false);

  const workspacesQuery = useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: listWorkspaces,
  });

  const workspaces = workspacesQuery.data ?? [];

  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [selectedWorkspaceId, workspaces, setSelectedWorkspaceId]);

  const selectedWorkspace =
    workspaces.find(
      (workspace) => workspace.id === selectedWorkspaceId,
    ) ?? null;

  const workspaceQuery = useQuery({
    queryKey: queryKeys.workspace(selectedWorkspaceId),
    queryFn: () => getWorkspace(selectedWorkspaceId),
    enabled: Boolean(selectedWorkspaceId),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.workspaceStats(selectedWorkspaceId),
    queryFn: () => getWorkspaceStats(selectedWorkspaceId),
    enabled: Boolean(selectedWorkspaceId),
  });

  const createMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces,
      });

      setSelectedWorkspaceId(workspace.id);
      setActiveView("workspace");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ workspaceId, data }) =>
      updateWorkspace(workspaceId, data),
    onSuccess: async () => {
      setEditing(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspace(selectedWorkspaceId),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: async () => {
      setSelectedWorkspaceId(null);
      setActiveView("workspaces");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces,
      });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: clearWorkspaceCache,
  });

  if (workspacesQuery.isLoading) {
    return (
      <main className="workspace-page workspace-state">
        <div className="state-spinner-wrap">
          <div className="state-spinner" />
          <p>Loading workspaces...</p>
        </div>
      </main>
    );
  }

  if (workspacesQuery.isError) {
    return (
      <main className="workspace-page workspace-state">
        <div className="state-error-card">
          <h1>Unable to load workspaces</h1>
          <p>{workspacesQuery.error.message}</p>
          <button
            type="button"
            className="primary-action-white"
            onClick={() => workspacesQuery.refetch()}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  async function handleCreate(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await createMutation.mutateAsync({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
    });
  }

  async function handleUpdate(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await updateMutation.mutateAsync({
      workspaceId: selectedWorkspaceId,
      data: {
        name: formData.get("name"),
        description: formData.get("description"),
      },
    });
  }

  function handleDelete() {
    if (!selectedWorkspaceId) return;
    setShowDeleteWorkspaceModal(true);
  }

  function handleClearCache() {
    if (!selectedWorkspaceId) return;
    clearCacheMutation.mutate(selectedWorkspaceId);
  }

  function openWorkspace(workspaceId) {
    setSelectedWorkspaceId(workspaceId);
    setActiveView("workspace");
    setEditing(false);
  }

  // Filter workspaces based on search query and filter tabs
  const activeWorkspaces = workspaces.filter(
    (ws) => (ws.sources?.length ?? 0) > 0,
  );
  const needsSourceWorkspaces = workspaces.filter(
    (ws) => (ws.sources?.length ?? 0) === 0,
  );

  let displayedWorkspaces = workspaces;
  if (filterTab === "active") {
    displayedWorkspaces = activeWorkspaces;
  } else if (filterTab === "needs_source") {
    displayedWorkspaces = needsSourceWorkspaces;
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayedWorkspaces = displayedWorkspaces.filter(
      (ws) =>
        ws.name.toLowerCase().includes(q) ||
        (ws.description && ws.description.toLowerCase().includes(q)),
    );
  }

  const username = user?.email ? user.email.split("@")[0] : "user";
  const userInitials = username.substring(0, 1).toUpperCase();

  // DEDICATED FULL-PAGE WORKSPACE CHAT VIEW (Replaces main global sidebar)
  if (activeView === "workspace" && selectedWorkspace) {
    return (
      <div className="workspace-detail-fullscreen">
        {/* Workspace Inner Sidebar */}
        <aside className="workspace-inner-sidebar">
          {/* Top Bar: Back Link & Workspace Identity */}
          <div className="inner-sidebar-top">
            <button
              className="back-to-all-btn"
              type="button"
              onClick={() => setActiveView("workspaces")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>All Workspaces</span>
            </button>

            <div className="inner-ws-identity">
              <div className="inner-ws-badge">
                {getInitials(selectedWorkspace.name)}
              </div>
              <div className="inner-ws-title-wrap">
                <h2 className="inner-ws-title" title={selectedWorkspace.name}>
                  {selectedWorkspace.name}
                </h2>
                <span className="inner-ws-status">● Active Workspace</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="inner-sidebar-stats">
            <div className="inner-stat-pill">
              <span className="inner-stat-val">{(workspaceQuery.data?.sources ?? selectedWorkspace.sources ?? []).length}</span>
              <span className="inner-stat-lbl">Sources</span>
            </div>
            <div className="inner-stat-pill">
              <span className="inner-stat-val">{selectedWorkspace._count?.messages ?? 0}</span>
              <span className="inner-stat-lbl">Messages</span>
            </div>
          </div>

          {/* Section 1: Documentation Sources */}
          <div className="inner-sidebar-section">
            <div className="section-title-row">
              <h4>Documentation Sources</h4>
              <button
                className="text-action-btn"
                type="button"
                onClick={() => setActiveView("sources")}
              >
                + Manage
              </button>
            </div>

            <div className="inner-sources-list">
              {(workspaceQuery.data?.sources ?? selectedWorkspace.sources ?? []).length > 0 ? (
                (workspaceQuery.data?.sources ?? selectedWorkspace.sources ?? []).map((src) => {
                  let displayUrl = src.url || "Documentation Source";
                  if (src.url) {
                    try {
                      const parsed = new URL(src.url);
                      displayUrl = parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
                    } catch (e) {
                      displayUrl = src.url;
                    }
                  }

                  const isDone = src.status === "DONE";
                  const isFailed = src.status === "FAILED";

                  return (
                    <div key={src.id} className="inner-source-card">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="link-icon">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <a
                        href={src.url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inner-src-link"
                        title={src.url || ""}
                      >
                        {displayUrl}
                      </a>
                      <span className={`status-pill ${isDone ? "status-active" : isFailed ? "status-failed" : "status-grey"}`}>
                        <span className="status-dot" />
                        <span>{isDone ? "Ready" : isFailed ? "Failed" : "Syncing"}</span>
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="inner-empty-sources">
                  <p>No documentation sources connected yet.</p>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setActiveView("sources")}
                  >
                    + Add a source
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Workspace FAQs */}
          <div className="inner-sidebar-section inner-faq-section">
            <WorkspaceFAQs
              workspaceId={selectedWorkspaceId}
              onSelectQuestion={(q) => setFaqPrompt(q)}
            />
          </div>

          {/* Footer User Profile */}
          <div className="inner-sidebar-footer">
            <div className="user-profile">
              <div className="user-avatar">{userInitials}</div>
              <span className="user-name" title={user?.email}>{username}</span>
              <button className="signout-btn" type="button" onClick={signOut} title="Sign out">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* Full-Height Right Panel Chat Area */}
        <div className="workspace-inner-main">
          <ChatPanel
            key={selectedWorkspaceId}
            workspaceId={selectedWorkspaceId}
            workspaceName={selectedWorkspace.name}
            externalQuestion={faqPrompt}
          />
        </div>
      </div>
    );
  }

  // STANDARD GLOBAL SIDEBAR VIEW (for Workspaces directory, Sources, Usage, Settings, Create)
  return (
    <main className="workspace-page">
      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <a
          className="sidebar-brand"
          href="#workspaces"
          onClick={() => setActiveView("workspaces")}
        >
              <div className="sidebar-brand-icon">DF</div>
          <div className="sidebar-brand-meta">
                <span className="brand-name">DocuFlux</span>
                <span className="brand-sub">Docs workspace</span>
          </div>
        </a>

        <nav className="sidebar-nav" aria-label="Main Navigation">
          <button
            className={
              activeView === "workspaces" || activeView === "create"
                ? "is-active"
                : ""
            }
            type="button"
            onClick={() => setActiveView("workspaces")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span>Workspaces</span>
            <span className="sidebar-badge">{workspaces.length}</span>
          </button>

          <button
            className={activeView === "sources" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("sources")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Sources</span>
            {selectedWorkspace?.sources?.length != null && (
              <span className="sidebar-badge">
                {selectedWorkspace.sources.length}
              </span>
            )}
          </button>

          <button
            className={activeView === "usage" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("usage")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="20" x2="12" y2="10" />
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="16" />
            </svg>
            <span>Usage</span>
          </button>

          {canRunEvaluation && (
            <button
              className={activeView === "evaluation" ? "is-active" : ""}
              type="button"
              onClick={() => setActiveView("evaluation")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 19V5" />
                <path d="M4 19h17" />
                <path d="m7 15 4-4 3 2 5-6" />
              </svg>
              <span>Evaluation</span>
            </button>
          )}

          <button
            className={activeView === "settings" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("settings")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
          </button>
        </nav>

        {/* Sidebar Footer User Profile */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{userInitials}</div>
            <span className="user-name" title={user?.email}>
              {username}
            </span>
            <button
              className="signout-btn"
              type="button"
              onClick={signOut}
              title="Sign out"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Body */}
      <div className="workspace-main">
        {/* WORKSPACES DIRECTORY VIEW */}
        {activeView === "workspaces" && (
          <section className="page-content">
            <div className="page-header">
              <div>
                <h1 className="page-title">Workspaces</h1>
                <p className="page-subtitle">
                  Create project spaces to organize documentation URLs and get instant AI answers.
                </p>
              </div>

              <div className="header-actions">
                <button
                  className="primary-action-white"
                  type="button"
                  onClick={() => setActiveView("create")}
                >
                  <span className="btn-plus">+</span> Create workspace
                </button>
                <button className="icon-menu-btn" type="button" title="More options">
                  •••
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="search-bar-container">
              <svg
                className="search-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search workspaces"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Pills Bar */}
            <div className="filter-pills-row">
              <button
                className={`filter-pill ${filterTab === "all" ? "is-active" : ""}`}
                type="button"
                onClick={() => setFilterTab("all")}
              >
                All <span className="pill-count">{workspaces.length}</span>
              </button>

              <button
                className={`filter-pill ${filterTab === "active" ? "is-active" : ""}`}
                type="button"
                onClick={() => setFilterTab("active")}
              >
                Active <span className="pill-count">{activeWorkspaces.length}</span>
              </button>

              <button
                className={`filter-pill ${filterTab === "needs_source" ? "is-active" : ""}`}
                type="button"
                onClick={() => setFilterTab("needs_source")}
              >
                Needs a source <span className="pill-count">{needsSourceWorkspaces.length}</span>
              </button>
            </div>

            {/* Workspaces Grid */}
            {displayedWorkspaces.length > 0 ? (
              <div className="workspaces-grid">
                {displayedWorkspaces.map((workspace) => {
                  const sourceCount = workspace.sources?.length ?? 0;
                  const messageCount = workspace._count?.messages ?? 0;
                  const initials = getInitials(workspace.name);
                  const lastMessage = workspace.messages?.[0];
                  const timeAgo = lastMessage
                    ? formatTimeAgo(lastMessage.createdAt)
                    : formatTimeAgo(workspace.createdAt);

                  const isActive = sourceCount > 0;

                  return (
                    <div
                      key={workspace.id}
                      className="workspace-card"
                      onClick={() => openWorkspace(workspace.id)}
                    >
                      <div className="card-top-row">
                        <div className="card-avatar-badge">{initials}</div>
                        <div className={`status-pill ${isActive ? "status-active" : "status-grey"}`}>
                          <span className="status-dot" />
                          <span>{isActive ? "Active" : sourceCount === 0 ? "No source yet" : "Not indexed"}</span>
                        </div>
                      </div>

                      <h3 className="card-title">{workspace.name}</h3>

                      <p className="card-details-text">
                        {sourceCount > 0
                          ? `${sourceCount} ${sourceCount === 1 ? "source" : "sources"} · ${messageCount} ${messageCount === 1 ? "message" : "messages"} · active ${timeAgo}`
                          : `Created ${timeAgo}`}
                      </p>

                      <div className="card-footer">
                        {sourceCount === 0 ? (
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorkspaceId(workspace.id);
                              setActiveView("sources");
                            }}
                          >
                            + Add a source
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="card-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openWorkspace(workspace.id);
                            }}
                          >
                            Open workspace <span className="arrow-icon">→</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="directory-empty-state">
                <div className="empty-state-badge">IX</div>
                <h2>No workspaces found</h2>
                <p>
                  {searchQuery
                    ? `No workspaces match "${searchQuery}".`
                    : "Get started by creating your first knowledge base."}
                </p>
                <button
                  type="button"
                  className="primary-action-white"
                  onClick={() => setActiveView("create")}
                >
                  + Create workspace
                </button>
              </div>
            )}
          </section>
        )}

        {/* CREATE WORKSPACE PAGE VIEW */}
        {activeView === "create" && (
          <section className="page-content create-page-container">
            <button
              className="back-btn"
              type="button"
              onClick={() => setActiveView("workspaces")}
            >
              ← Back to Workspaces
            </button>

            <div className="create-card">
              <div className="create-card-header">
                <h2>Create a new workspace</h2>
                <p>Set up a dedicated project space for your documentation and team notes.</p>
              </div>

              {createMutation.isPending ? (
                <div className="creating-workspace-card">
                  <div className="creating-spinner" />
                  <h3>Setting up workspace...</h3>
                  <p>Initializing vector database and AI chat assistant</p>
                </div>
              ) : (
                <form className="create-form" onSubmit={handleCreate}>
                  <div className="form-field">
                    <label htmlFor="name-input">Workspace name</label>
                    <input
                      id="name-input"
                      name="name"
                      type="text"
                      placeholder="e.g. Java Documentation, React Specs"
                      required
                      maxLength={50}
                      autoFocus
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="desc-input">
                      Description <small>(Optional)</small>
                    </label>
                    <textarea
                      id="desc-input"
                      name="description"
                      placeholder="Briefly describe what knowledge is contained here..."
                      maxLength={200}
                      rows={3}
                    />
                  </div>

                  {createMutation.isError && (
                    <p className="form-error-msg" role="alert">
                      {createMutation.error.message}
                    </p>
                  )}

                  <div className="form-buttons">
                    <button
                      className="primary-action-white"
                      type="submit"
                    >
                      Create workspace
                    </button>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() => setActiveView("workspaces")}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        {/* SOURCES VIEW */}
        {activeView === "sources" && (
          <section className="page-content">
            <div className="sources-view-header">
              <div className="sources-header-row">
                <div>
                  <h1 className="page-title">Sources</h1>
                  <p className="page-subtitle">
                    Add & sync documentation websites to train your workspace AI assistant.
                  </p>
                </div>

                {workspaces.length > 0 && (
                  <div className="sources-workspace-selector">
                    <span className="selector-label">Select workspace:</span>
                    <div className="custom-select-box">
                      <select
                        id="sources-ws-dropdown"
                        className="sources-select-input"
                        value={selectedWorkspaceId ?? ""}
                        onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                      >
                        {workspaces.map((ws) => (
                          <option key={ws.id} value={ws.id}>
                            {ws.name} ({ws.sources?.length ?? 0} {ws.sources?.length === 1 ? "source" : "sources"})
                          </option>
                        ))}
                      </select>
                      <svg className="select-arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedWorkspaceId ? (
              <SourcePanel key={selectedWorkspaceId} workspaceId={selectedWorkspaceId} />
            ) : (
              <div className="directory-empty-state">
                <div className="empty-state-badge">IX</div>
                <h2>No workspace selected</h2>
                <p>Choose or create a workspace to manage its documentation sources.</p>
                <button
                  className="primary-action-white"
                  type="button"
                  onClick={() => setActiveView("workspaces")}
                >
                  Browse workspaces
                </button>
              </div>
            )}
          </section>
        )}

        {/* USAGE VIEW */}
        {activeView === "usage" && (
          <section className="page-content">
            <div className="sources-view-header">
              <div className="sources-header-row">
                <div>
                  <h1 className="page-title">Usage & Performance Analytics</h1>
                  <p className="page-subtitle">
                    Real-time telemetry on query volume, retrieval latency, cache hits, and token consumption.
                  </p>
                </div>

                {workspaces.length > 0 && (
                  <div className="sources-workspace-selector">
                    <span className="selector-label">Select workspace:</span>
                    <div className="custom-select-box">
                      <select
                        id="usage-ws-dropdown"
                        className="sources-select-input"
                        value={selectedWorkspaceId ?? ""}
                        onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                      >
                        {workspaces.map((ws) => (
                          <option key={ws.id} value={ws.id}>
                            {ws.name} ({ws._count?.messages ?? 0} {ws._count?.messages === 1 ? "msg" : "msgs"})
                          </option>
                        ))}
                      </select>
                      <svg className="select-arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {selectedWorkspaceId ? (
              <WorkspaceAnalytics workspaceId={selectedWorkspaceId} />
            ) : (
              <div className="directory-empty-state">
                <div className="empty-state-badge">IX</div>
                <h2>Select a workspace to view usage</h2>
                <p>Choose or create a workspace to monitor its performance metrics.</p>
                <button
                  className="primary-action-white"
                  type="button"
                  onClick={() => setActiveView("workspaces")}
                >
                  Browse workspaces
                </button>
              </div>
            )}
          </section>
        )}

        {activeView === "evaluation" && canRunEvaluation && (
          <section className="page-content">
            <div className="sources-view-header">
              <div className="sources-header-row">
                <div>
                  <h1 className="page-title">RAG Evaluation</h1>
                  <p className="page-subtitle">
                    Manage evaluation cases and compare retrieval and answer quality across runs.
                  </p>
                </div>
                {workspaces.length > 0 && (
                  <div className="sources-workspace-selector">
                    <label
                      className="selector-label"
                      htmlFor="evaluation-workspace-select"
                    >
                      Select workspace:
                    </label>
                    <div className="custom-select-box">
                      <select
                        id="evaluation-workspace-select"
                        className="sources-select-input"
                        value={selectedWorkspaceId ?? ""}
                        onChange={(event) =>
                          setSelectedWorkspaceId(event.target.value)
                        }
                      >
                        {workspaces.map((workspace) => (
                          <option key={workspace.id} value={workspace.id}>
                            {workspace.name}
                          </option>
                        ))}
                      </select>
                      <svg
                        className="select-arrow-icon"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedWorkspaceId ? (
              <EvaluationPanel
                key={selectedWorkspaceId}
                workspaceId={selectedWorkspaceId}
              />
            ) : (
              <div className="directory-empty-state">
                <h2>No workspace selected</h2>
                <p>Select a workspace to manage evaluation cases and runs.</p>
              </div>
            )}
          </section>
        )}

        {/* SETTINGS VIEW */}
        {activeView === "settings" && (
          <section className="page-content settings-container">
            <h1 className="page-title">Workspace settings</h1>
            <p className="page-subtitle">Choose a workspace, then update its details or remove it.</p>

            {workspaces.length > 0 && (
              <div className="settings-workspace-picker">
                <label className="selector-label" htmlFor="settings-workspace-select">
                  Workspace to manage
                </label>
                <div className="custom-select-box">
                  <select
                    id="settings-workspace-select"
                    className="sources-select-input"
                    value={selectedWorkspaceId ?? ""}
                    onChange={(event) => {
                      setEditing(false);
                      setSelectedWorkspaceId(event.target.value);
                    }}
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                  <svg className="select-arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <p className="settings-picker-note">Changes below apply to this workspace.</p>
              </div>
            )}

            {selectedWorkspace ? (
              <div className="settings-cards-stack">
                <div className="settings-card">
                  <div className="settings-card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    <h3>Workspace details</h3>
                  </div>
                  {editing ? (
                    <form className="create-form" onSubmit={handleUpdate}>
                      <div className="form-field">
                        <label>Workspace name</label>
                        <input
                          name="name"
                          defaultValue={selectedWorkspace.name}
                          required
                          maxLength={50}
                        />
                      </div>
                      <div className="form-field">
                        <label>Description</label>
                        <textarea
                          name="description"
                          defaultValue={selectedWorkspace.description ?? ""}
                          maxLength={200}
                          rows={3}
                        />
                        <small className="settings-field-note">Optional</small>
                      </div>
                      <div className="form-buttons">
                        <button
                          className="primary-action-white"
                          type="submit"
                          disabled={updateMutation.isPending}
                        >
                          Save changes
                        </button>
                        <button
                          className="secondary-btn"
                          type="button"
                          onClick={() => setEditing(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="settings-row">
                      <div>
                        <strong className="settings-ws-name">{selectedWorkspace.name}</strong>
                        <p className="settings-ws-desc">{selectedWorkspace.description || "No description added."}</p>
                      </div>
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => setEditing(true)}
                      >
                        Edit details
                      </button>
                    </div>
                  )}
                </div>

                <div className="settings-card">
                  <div className="settings-card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 21h5v-5" />
                    </svg>
                    <h3>Saved Semantic Cache</h3>
                  </div>
                  <div className="settings-row">
                    <p>Clear saved semantic cache answers so DocuFlux queries your current sources next time.</p>
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={handleClearCache}
                      disabled={clearCacheMutation.isPending}
                    >
                      {clearCacheMutation.isPending ? "Clearing..." : "Clear saved answers"}
                    </button>
                  </div>
                </div>

                <div className="settings-card danger-card">
                  <div className="settings-card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <h3>Delete Workspace</h3>
                  </div>
                  <div className="settings-row">
                    <p>
                      Permanently remove <strong>{selectedWorkspace.name}</strong>, its connected sources, chats, and indexed data.
                    </p>
                    <button
                      className="danger-btn"
                      type="button"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "Deleting..." : `Delete Workspace`}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="directory-empty-state">
                <h2>Select a workspace to view settings</h2>
              </div>
            )}
          </section>
        )}

        <div className="workspace-feedback" aria-live="polite">
          <MutationFeedback
            mutation={createMutation}
            pendingMessage="Creating workspace..."
            successMessage="Workspace created."
          />
          <MutationFeedback
            mutation={updateMutation}
            pendingMessage="Saving changes..."
            successMessage="Workspace updated."
          />
          <MutationFeedback
            mutation={deleteMutation}
            pendingMessage="Deleting workspace..."
            successMessage="Workspace deleted."
          />
          <MutationFeedback
            mutation={clearCacheMutation}
            pendingMessage="Clearing semantic cache..."
            successMessage="Semantic cache cleared."
          />

          <ConfirmModal
            isOpen={showDeleteWorkspaceModal}
            title={`Delete "${selectedWorkspace?.name ?? "Workspace"}"?`}
            message="This will permanently delete this workspace, including all connected documentation sources, indexed knowledge, and chat history. This action cannot be undone."
            confirmLabel="Delete Workspace"
            isPending={deleteMutation.isPending}
            onConfirm={() => {
              if (selectedWorkspaceId) {
                deleteMutation.mutate(selectedWorkspaceId, {
                  onSettled: () => setShowDeleteWorkspaceModal(false),
                });
              }
            }}
            onCancel={() => setShowDeleteWorkspaceModal(false)}
          />
        </div>
      </div>
    </main>
  );
}

function WorkspaceStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="stats-dashboard-row">
      <div className="stat-pill-card">
        <span className="stat-num">{stats.sources?.total ?? 0}</span>
        <span className="stat-lbl">Sources</span>
      </div>
      <div className="stat-pill-card">
        <span className="stat-num">{stats.sources?.done ?? 0}</span>
        <span className="stat-lbl">Done</span>
      </div>
      <div className="stat-pill-card">
        <span className="stat-num">{stats.totalPages ?? 0}</span>
        <span className="stat-lbl">Pages</span>
      </div>
      <div className="stat-pill-card">
        <span className="stat-num">{stats.totalChunks ?? 0}</span>
        <span className="stat-lbl">Chunks</span>
      </div>
      <div className="stat-pill-card">
        <span className="stat-num">{stats.totalMessages ?? 0}</span>
        <span className="stat-lbl">Messages</span>
      </div>
    </div>
  );
}
