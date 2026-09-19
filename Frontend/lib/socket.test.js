import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const API_URL = "http://localhost:4000";
const WORKSPACE_ID = "d356395c-8f33-471e-97e7-b2fe23b02a6e";

export default function RagTest() {
  const socketRef = useRef(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState([]);
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState("");

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket"],
      // Add this when Supabase authentication is enabled:
      // auth: { token: supabaseAccessToken },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("Connected");
      socket.emit("workspace:join", WORKSPACE_ID);
    });

    socket.on("disconnect", () => {
      setStatus("Disconnected");
    });

    socket.on("connect_error", (error) => {
      setStatus("Connection failed");
      setError(error.message);
    });

    socket.on("chat:start", () => {
      setAnswer("");
      setCitations([]);
      setError("");
      setStatus("Generating...");
    });

    socket.on("chat:metadata", (metadata) => {
      setCitations(metadata.citations || []);
    });

    socket.on("chat:token", ({ token }) => {
      setAnswer((current) => current + token);
    });

    socket.on("chat:done", ({ answer, citations }) => {
      setAnswer(answer);
      setCitations(citations || []);
      setStatus("Ready");
    });

    socket.on("chat:error", ({ message }) => {
      setError(message);
      setStatus("Error");
    });

    return () => {
      socket.emit("workspace:leave", WORKSPACE_ID);
      socket.disconnect();
    };
  }, []);

  function askQuestion(event) {
    event.preventDefault();

    if (!question.trim()) return;

    socketRef.current?.emit("chat:message", {
      question: question.trim(),
      workspaceId: WORKSPACE_ID,
    });
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <h1>RAG Pipeline Test</h1>

      <p>
        Status: <strong>{status}</strong>
      </p>

      <form onSubmit={askQuestion}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about the indexed documentation"
          style={{ width: "70%", padding: 10 }}
        />

        <button type="submit" style={{ marginLeft: 8, padding: 10 }}>
          Ask
        </button>
      </form>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      <section style={{ marginTop: 30 }}>
        <h2>Answer</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>
          {answer || "Ask a question to test the RAG pipeline."}
        </p>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2>Citations</h2>

        {citations.map((citation) => (
          <article key={citation.id} style={{ marginBottom: 16 }}>
            <a href={citation.pageUrl} target="_blank" rel="noreferrer">
              {citation.pageTitle || citation.pageUrl}
            </a>

            <p>{citation.childText}</p>
          </article>
        ))}
      </section>
    </main>
  );
}