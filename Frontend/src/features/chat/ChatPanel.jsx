import { useState, useEffect, useRef } from "react";
import { getSocket } from "../../realtime/socket";
import { useSocketConnected } from "../../realtime/WorkspaceSocketProvider";

export default function ChatPanel({ workspaceId, workspaceName = "", externalQuestion = "" }) {
  const connected = useSocketConnected();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const assistantId = useRef(null);
  const messagesEndRef = useRef(null);

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
    assistantId.current = null;

    const socket = getSocket();

    function loadHistory() {
      socket.emit("chat:history", { workspaceId });
    }

    function handleHistory({ messages: history }) {
      setMessages(
        history.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          citations: msg.sources ?? [],
        })),
      );
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
      socket.off("chat:start", handleStart);
      socket.off("chat:metadata", handleMetadata);
      socket.off("chat:token", handleToken);
      socket.off("chat:done", handleDone);
      socket.off("chat:error", handleError);
    };
  }, [workspaceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendQuestion(event) {
    if (event) event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !workspaceId || !connected || streaming) {
      return;
    }

    const nextAssistantId = crypto.randomUUID();
    assistantId.current = nextAssistantId;
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
          <span className={`live-status-pill ${connected ? "connected" : ""}`}>
            <span className="live-dot" />
            <span>{connected ? "Connected" : "Connecting..."}</span>
          </span>
          <button
            type="button"
            className="secondary-btn"
            onClick={clearChat}
            disabled={!connected || streaming || messages.length === 0}
          >
            Clear chat
          </button>
        </div>
      </div>

      {/* Messages Stream Container */}
      <div className="chat-messages-scroll" aria-live="polite">
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
              <p>
                {message.content || (message.streaming ? "Searching your documentation" : "")}
                {message.streaming && message.content ? (
                  <span className="stream-cursor" aria-hidden="true" />
                ) : null}
                {message.streaming && !message.content && (
                  <span className="generation-dots" aria-label="In progress">
                    <i /><i /><i />
                  </span>
                )}
              </p>
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
        <div ref={messagesEndRef} />
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
            type="submit"
            className="chat-send-btn"
            disabled={!connected || streaming || !question.trim()}
          >
            {streaming ? "Answering..." : "Send"}
            {!streaming && <span className="send-arrow">→</span>}
          </button>
        </div>
      </form>
    </div>
  );
}
