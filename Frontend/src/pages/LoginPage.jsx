import React, { useState } from "react";
import { useAuth } from "../auth/authProvider";
import { ArrowLeft, ArrowRight, Mail, Lock, CheckCircle2, ShieldCheck } from "lucide-react";
import "./LoginPage.css";

export default function LoginPage({ initialMode = "login", onHome }) {
  const { signIn, signInWithGoogle, signUp } = useAuth();

  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        const result = await signUp(email, password);

        if (!result.session) {
          setMessage("Account created! Check your email to complete verification.");
        }
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setMessage("");
  };

  return (
    <main className="docuflux-auth-page">
      
      {/* Top Left Navigation Link */}
      {onHome && (
        <button 
          className="auth-back-link" 
          type="button" 
          onClick={onHome}
        >
          <ArrowLeft size={16} />
          <span>Back to home</span>
        </button>
      )}

      {/* Main Centered Auth Container */}
      <div className="docuflux-auth-container">
        
        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="auth-logo-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="auth-brand-title">DocuFlux</span>
        </div>

        {/* Auth Card Box */}
        <div className="auth-card-box">
          
          {/* Segmented Mode Switcher */}
          <div className="auth-mode-tabs">
            <button
              type="button"
              className={`mode-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`mode-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => switchMode("signup")}
            >
              Create Account
            </button>
          </div>

          {/* Headline & Subtitle */}
          <div className="auth-head-block">
            <h2>{mode === "login" ? "Welcome back" : "Get started with DocuFlux"}</h2>
            <p>
              {mode === "login"
                ? "Sign in to access your multi-source RAG workspace"
                : "Create your account to start asking your documents questions"}
            </p>
          </div>

          <button
            className="auth-google-btn"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" focusable="false">
              <path fill="#4285F4" d="M48 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h13.49c-.6 2.96-2.26 5.48-4.71 7.18l7.62 5.91C44.85 37.64 48 31.66 48 24.55Z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.15 15.9-5.82l-7.62-5.91c-2.15 1.45-4.9 2.3-8.28 2.3-6.35 0-11.73-4.28-13.65-10.03l-7.87 6.08C6.45 42.02 14.55 48 24 48Z" />
              <path fill="#FBBC05" d="M10.35 28.54A14.4 14.4 0 0 1 9.6 24c0-1.57.27-3.09.75-4.54l-7.87-6.08A23.9 23.9 0 0 0 0 24c0 3.85.92 7.49 2.48 10.62l7.87-6.08Z" />
              <path fill="#EA4335" d="M24 9.43c3.53 0 6.7 1.22 9.2 3.6l6.9-6.9C35.9 2.32 30.45 0 24 0 14.55 0 6.45 5.98 2.48 13.38l7.87 6.08C12.27 13.71 17.65 9.43 24 9.43Z" />
            </svg>
            <span>{submitting ? "Connecting..." : "Continue with Google"}</span>
          </button>
          <p className="auth-or-divider">or continue with email</p>

          {/* Form */}
          <form className="auth-main-form" onSubmit={handleSubmit}>
            
            {/* Email Field */}
            <div className="auth-field-group">
              <label htmlFor="auth-email">Email Address</label>
              <div className="auth-input-box">
                <Mail size={16} className="field-icon" />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="auth-field-group">
              <label htmlFor="auth-password">Password</label>
              <div className="auth-input-box">
                <Lock size={16} className="field-icon" />
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                  required
                />
              </div>
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {mode === "signup" && (
              <div className="auth-field-group">
                <label htmlFor="auth-confirm-password">Confirm Password</label>
                <div className="auth-input-box">
                  <ShieldCheck size={16} className="field-icon" />
                  <input
                    id="auth-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    placeholder="Repeat password"
                    required
                  />
                </div>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="auth-notice notice-error" role="alert">
                <span>{error}</span>
              </div>
            )}

            {/* Success Notification */}
            {message && (
              <div className="auth-notice notice-success" role="status">
                <CheckCircle2 size={16} />
                <span>{message}</span>
              </div>
            )}

            {/* Submit Button */}
            <button className="auth-primary-btn" type="submit" disabled={submitting}>
              <span>{submitting ? "Processing..." : mode === "login" ? "Sign In to Workspace" : "Create Account"}</span>
              {!submitting && <ArrowRight size={16} />}
            </button>

          </form>

        </div>

        {/* Footer Meta Note */}
        <div className="auth-bottom-note">
          <span>Encrypted Session • Source Grounded RAG</span>
        </div>

      </div>
    </main>
  );
}
