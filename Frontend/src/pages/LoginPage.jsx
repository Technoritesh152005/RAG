import { useState } from "react";
import { useAuth } from '../auth/authProvider'


export default function LoginPage() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState("login");
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
    <main>
      <section>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}

          <button type="submit" disabled={submitting}>
            {submitting
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setMessage("");
          }}
        >
          {mode === "login"
            ? "Create a new account"
            : "I already have an account"}
        </button>
      </section>
    </main>
  );
}