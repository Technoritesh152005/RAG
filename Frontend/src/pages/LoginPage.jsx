import { useState } from "react";
import { useAuth } from "../auth/authProvider";
import "./LoginPage.css";


export default function LoginPage({ initialMode = "login", onHome }) {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        const result = await signUp(email, password);

        if (!result.session) {
          setMessage(
            "Account created. Check your email before signing in.",
          );
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-intro" aria-label="RAG Workspace">
          <a className="auth-brand" href="/" aria-label="RAG Workspace home">
            <span className="auth-brand-mark" aria-hidden="true">R</span>
            <span>RAG / WORKSPACE</span>
          </a>

          <div className="auth-intro-copy">
            <p className="auth-eyebrow">YOUR KNOWLEDGE, IN CONTEXT</p>
            <h1>Ask your documents better questions.</h1>
            <p className="auth-intro-description">
              Bring documentation into one workspace, then find answers
              grounded in the sources you trust.
            </p>
          </div>

          <p className="auth-signal">
            <span className="auth-signal-line" aria-hidden="true" />
            Private workspace · Source-backed answers
          </p>
        </section>

        <section className="auth-form-panel" aria-labelledby="auth-title">
          <div className="auth-form-wrap">
            {onHome && (
              <button
                className="auth-home-link"
                type="button"
                onClick={onHome}
              >
                Back to home
              </button>
            )}
            <p className="auth-eyebrow auth-eyebrow-dark">
              {mode === "login" ? "YOUR WORKSPACE AWAITS" : "GET STARTED"}
            </p>
            <h2 id="auth-title">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="auth-form-description">
              {mode === "login"
                ? "Sign in to continue to your documentation workspace."
                : "Create an account to start building your workspace."}
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="auth-email">Email address</label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />

              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                placeholder="At least 6 characters"
                required
              />

              {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
              {message && <p className="auth-feedback auth-message" role="status">{message}</p>}

              <button className="auth-submit" type="submit" disabled={submitting}>
                {submitting
                  ? "Please wait..."
                  : mode === "login"
                    ? "Sign in"
                    : "Create account"}
                {!submitting && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <p className="auth-switch">
              {mode === "login" ? "New to this workspace?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                  setMessage("");
                }}
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>

            <p className="auth-security-note">
              Authentication is securely handled by Supabase.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}