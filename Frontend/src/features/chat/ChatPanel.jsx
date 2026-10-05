import { useState, useEffect, useLayoutEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getSocket } from "../../realtime/socket";
import { useSocketConnected } from "../../realtime/WorkspaceSocketProvider";
import "highlight.js/styles/github-dark.css";

function normalizeHistoryPayload(payload) {
  if (Array.isArray(payload?.messages)) {
    return {
      messages: payload.messages,
      hasMore: Boolean(payload.hasMore),
    };
  }

  if (Array.isArray(payload?.messages?.messages)) {
    return {
      messages: payload.messages.messages,
      hasMore: Boolean(payload.hasMore ?? payload.messages.hasMore),
    };
  }

  return { messages: [], hasMore: false };
}

function toChatMessage(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    citations: message.sources ?? [],
  };
}

export default function ChatPanel({ workspaceId, workspaceName = "", externalQuestion = "" }) {
  const connected = useSocketConnected();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const assistantId = useRef(null);
  const messagesContainerRef = useRef(null);
  const pendingScrollRestoreRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const olderRequestIdRef = useRef(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Sync external question prompt (e.g. from FAQ click)
  useEffect(() => {
    if (externalQuestion) {
      setQuestion(externalQuestion);
    }
  }, [externalQuestion]);

  useEffect(() => {
    if (!workspaceId) return;

    setMessages([]);
    setStreaming(false);
    setError("");
    setHasOlderMessages(false);
    setLoadingOlderMessages(false);
    setHistoryError("");
    assistantId.current = null;
    pendingScrollRestoreRef.current = null;
    olderRequestIdRef.current = null;
    shouldAutoScrollRef.current = true;

    const socket = getSocket();

    function loadHistory() {
      socket.emit("chat:history", { workspaceId });
    }

    function handleHistory(payload) {
      if (payload?.workspaceId && payload.workspaceId !== workspaceId) return;

      const history = normalizeHistoryPayload(payload);
      setMessages(history.messages.map(toChatMessage));
      setHasOlderMessages(history.hasMore);
      setLoadingOlderMessages(false);
      setHistoryError("");
      shouldAutoScrollRef.current = true;
    }

    function handleHistoryError(payload) {
      if (payload?.workspaceId && payload.workspaceId !== workspaceId) return;
      setHistoryError(payload?.message || "Could not load chat history.");
    }

    function handleOlderHistory(payload) {
      if (payload?.workspaceId && payload.workspaceId !== workspaceId) return;
      if (payload?.requestId !== olderRequestIdRef.current) return;

      const history = normalizeHistoryPayload(payload);
      const container = messagesContainerRef.current;
      pendingScrollRestoreRef.current = container
        ? {
            scrollHeight: container.scrollHeight,
            scrollTop: container.scrollTop,
          }
        : null;

      const olderMessages = history.messages.map(toChatMessage);
      setMessages((current) => {
        const currentIds = new Set(current.map((message) => message.id));
        const uniqueOlderMessages = olderMessages.filter(
          (message) => !currentIds.has(message.id),
        );
        return [...uniqueOlderMessages, ...current];
      });
      setHasOlderMessages(history.hasMore);
      setLoadingOlderMessages(false);
      setHistoryError("");
      olderRequestIdRef.current = null;
    }

    function handleOlderHistoryError(payload) {
      if (payload?.workspaceId && payload.workspaceId !== workspaceId) return;
      if (payload?.requestId !== olderRequestIdRef.current) return;

      setLoadingOlderMessages(false);
      setHistoryError(payload?.message || "Could not load older messages.");
      olderRequestIdRef.current = null;
    }

    function handleStart() {
      setStreaming(true);
      setError("");
    }

    function handleMetadata(metadata) {
      const id = assistantId.current;
      if (!id) return;

      setMessages((current) =>
        current.map((message) =>
          message.id === id
            ? {
                ...message,
                citations: metadata.citations ?? [],
                hasContradiction: metadata.hasContradiction,
                contradictions: metadata.contradictions ?? [],
                cached: metadata.cached,
                cacheSimilarity: metadata.cacheSimilarity,
                reason: metadata.reason,
              }
            : message,
        ),
      );
    }

    function handleToken({ token }) {
      const id = assistantId.current;
      if (!id) return;
      setMessages((current) =>
        current.map((message) =>
          message.id === id
            ? {
                ...message,
                content: message.content + token,
              }
            : message,
        ),
      );
    }

    function handleDone({ answer, citations }) {
      const id = assistantId.current;

      setMessages((message) =>
        message.map((msg) =>
          msg.id === id
            ? {
                ...msg,
                content: answer,
                citations: citations ?? msg.citations,
                streaming: false,
              }
            : msg,
        ),
      );

      setStreaming(false);
      assistantId.current = null;
    }

    function handleError(payload) {
      setError(
        payload?.message ||
          payload?.messages ||
          "The chat request failed.",
      );

      const id = assistantId.current;
      if (id) {
        setMessages((current) =>
          current.filter(
            (message) =>
              message.id !== id || message.content.length > 0,
          ),
        );
      }

      assistantId.current = null;
      setStreaming(false);
    }

    socket.on("connect", loadHistory);
    socket.on("chat:history:load", handleHistory);
    socket.on("chat:history:error", handleHistoryError);
    socket.on("chat:history:older:load", handleOlderHistory);
    socket.on("chat:history:older:error", handleOlderHistoryError);
    socket.on("chat:start", handleStart);
    socket.on("chat:metadata", handleMetadata);
    socket.on("chat:token", handleToken);
    socket.on("chat:done", handleDone);
    socket.on("chat:error", handleError);

    if (socket.connected) {
      loadHistory();
    }

    return () => {
      socket.off("connect", loadHistory);
      socket.off("chat:history:load", handleHistory);
      socket.off("chat:history:error", handleHistoryError);
      socket.off("chat:history:older:load", handleOlderHistory);
      socket.off("chat:history:older:error", handleOlderHistoryError);
      socket.off("chat:start", handleStart);
      socket.off("chat:metadata", handleMetadata);
      socket.off("chat:token", handleToken);
      socket.off("chat:done", handleDone);
      socket.off("chat:error", handleError);
    };
  }, [workspaceId]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const previousPosition = pendingScrollRestoreRef.current;
    if (previousPosition) {
      container.scrollTop =
        previousPosition.scrollTop +
        (container.scrollHeight - previousPosition.scrollHeight);
      pendingScrollRestoreRef.current = null;
      return;
    }

    if (shouldAutoScrollRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  function handleMessagesScroll() {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 120;
  }

  function loadOlderMessages() {
    if (
      !workspaceId ||
      !hasOlderMessages ||
      loadingOlderMessages ||
      messages.length === 0
    ) {
      return;
    }

    const requestId = crypto.randomUUID();
    olderRequestIdRef.current = requestId;
    setLoadingOlderMessages(true);
    setHistoryError("");

    getSocket().emit("chat:history:older", {
      workspaceId,
      beforeMessageId: messages[0].id,
      requestId,
    });
  }

  function sendQuestion(event) {
    if (event) event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !workspaceId || !connected || streaming) {
      return;
    }

    const nextAssistantId = crypto.randomUUID();
    assistantId.current = nextAssistantId;
    shouldAutoScrollRef.current = true;
    setError("");

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "USER",
        content: trimmedQuestion,
        citations: [],
      },
      {
        id: nextAssistantId,
        role: "ASSISTANT",
        content: "",
        citations: [],
        streaming: true,
      },
    ]);

    setQuestion("");

    getSocket().emit("chat:message", {
      question: trimmedQuestion,
      workspaceId,
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  }

  function clearChat() {
    if (!workspaceId || streaming) return;
    getSocket().emit("chat:clear", { workspaceId });
    setMessages([]);
    setHasOlderMessages(false);
    setHistoryError("");
    setError("");
  }

  return (
    <div className="chat-panel-container">
      {/* Chat Header */}
      <div className="chat-panel-header">
        <div className="chat-header-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chat-icon">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <div>
            <h3>{workspaceName ? `${workspaceName} Chat` : "Workspace Chat"}</h3>
            <p>Answers are grounded directly in your connected documentation sources.</p>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            type="button"
            className="delete-chat-btn"
            onClick={clearChat}
            disabled={!connected || streaming || messages.length === 0}
            title="Delete chat history"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="trash-icon">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>Delete chat</span>
          </button>
        </div>
      </div>

      {/* Messages Stream Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="chat-messages-scroll"
        aria-live="polite"
      >
        {hasOlderMessages && (
          <div className="chat-history-pagination">
            <button
              type="button"
              className="secondary-btn"
              onClick={loadOlderMessages}
              disabled={loadingOlderMessages}
            >
              {loadingOlderMessages
                ? "Loading older messages..."
                : "Load older messages"}
            </button>
          </div>
        )}
        {historyError && (
          <p className="chat-error-banner" role="alert">
            {historyError}
          </p>
        )}
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">IX</div>
            <h4>Ask a question about this workspace</h4>
            <p>Type a question below or pick a suggested FAQ from the left panel to begin.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-bubble-card ${message.role === "USER" ? "role-user" : "role-assistant"}${message.streaming ? " is-streaming" : ""}`}
          >
            <div className="bubble-header">
              {message.role === "USER" ? (
                <span className="role-name user">You</span>
              ) : (
                <span className="role-name assistant">
                  <span className="assistant-pulse-mark" aria-hidden="true">✳</span>
                  DocuFlux Assistant
                </span>
              )}
              {message.cached && <span className="cache-pill">Cached</span>}
              {message.streaming && (
                <span className="generating-pill" role="status">
                  <span className="generating-indicator" aria-hidden="true" />
                  Generating
                </span>
              )}
            </div>

            <div className="bubble-content">
              {message.role === "ASSISTANT" && message.content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <p>
                  {message.content ||
                    (message.streaming ? "Searching your documentation" : "")}
                </p>
              )}
              {message.streaming && message.content && (
                <span className="stream-cursor" aria-hidden="true" />
              )}
              {message.streaming && !message.content && (
                <span className="generation-dots" aria-label="In progress">
                  <i /><i /><i />
                </span>
              )}
            </div>

            {message.cacheSimilarity != null && (
              <div className="cache-sim-tag">
                Cache similarity: {(message.cacheSimilarity * 100).toFixed(1)}%
              </div>
            )}

            {message.hasContradiction &&
              message.contradictions?.map((item, index) => (
                <div key={index} className="contradiction-alert">
                  ⚠️ Conflicting information detected in source: {item.topic}
                </div>
              ))}

            {message.citations?.length > 0 && (
              <details className="citations-accordion">
                <summary className="citations-summary">
                  Cited Sources ({message.citations.length})
                </summary>
                <div className="citations-list">
                  {message.citations.map((citation, index) => (
                    <div key={citation.id ?? index} className="citation-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="link-icon">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      <a href={citation.pageUrl} target="_blank" rel="noreferrer">
                        {citation.pageTitle || citation.pageUrl}
                      </a>
                      {citation.sectionHeading && (
                        <span className="citation-section">· {citation.sectionHeading}</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>

      {error && <p className="chat-error-banner" role="alert">{error}</p>}

      {/* Input Form Bar */}
      <form className="chat-input-form" onSubmit={sendQuestion}>
        <div className="textarea-wrapper">
          <textarea
            id="chat-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!connected || streaming}
            placeholder="Ask anything about your documentation... (Press Enter to send)"
            rows={2}
            required
          />
          <button
            type="button"
            className="chat-send-btn"
            onClick={sendQuestion}
            disabled={!connected || streaming || !question.trim()}
            title="Send question"
          >
            <span>{streaming ? "Answering..." : "Send"}</span>
            {!streaming && (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="send-icon">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
