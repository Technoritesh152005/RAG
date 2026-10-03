import { useEffect, useState } from "react";

function friendlyError(error) {
  const status = error?.response?.status ?? error?.status;

  if (status === 401) return "Your session expired. Sign in again.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "This workspace or item could not be found.";
  if (status === 409) return "This item already exists.";
  if (status === 429) return "Too many requests. Please wait and try again.";
  if (status >= 500) return "The service is unavailable. Please try again shortly.";

  return error?.message || "Something went wrong. Please try again.";
}

export function QueryFeedback({
  isLoading,
  error,
  onRetry,
  isEmpty = false,
  emptyMessage = "Nothing to show yet.",
  hasData = false,
  children,
}) {
  if (isLoading && !hasData) {
    return (
      <div className="state-spinner-wrap" style={{ padding: "40px 20px" }}>
        <div className="state-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (error && !hasData) {
    return (
      <div className="state-error-card">
        <h3>Unable to load data</h3>
        <p>{friendlyError(error)}</p>
        {onRetry && (
          <button type="button" className="primary-action-white" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return <p className="empty-hint-text">{emptyMessage}</p>;
  }

  return (
    <>
      {error && hasData && (
        <div className="state-error-banner" role="status">
          <p>{friendlyError(error)}</p>
          {onRetry && (
            <button type="button" className="secondary-btn" onClick={onRetry}>
              Retry refresh
            </button>
          )}
        </div>
      )}
      {children}
    </>
  );
}

export function MutationFeedback({
  mutation,
  pendingMessage,
  successMessage,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mutation.isPending || mutation.isError || mutation.isSuccess) {
      setVisible(true);
    }
    if (mutation.isSuccess) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [mutation.isPending, mutation.isError, mutation.isSuccess, mutation.submittedAt]);

  if (!visible) return null;

  return (
    <div
      className={`toast-notification-card ${
        mutation.isPending
          ? "is-pending"
          : mutation.isError
            ? "is-error"
            : "is-success"
      }`}
      role="status"
    >
      <div className="toast-icon-wrap">
        {mutation.isPending && <div className="toast-spinner" />}
        {mutation.isSuccess && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {mutation.isError && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
      </div>

      <div className="toast-content">
        <span className="toast-message">
          {mutation.isPending && (pendingMessage || "Processing...")}
          {mutation.isSuccess && (successMessage || "Completed successfully.")}
          {mutation.isError && friendlyError(mutation.error)}
        </span>
      </div>

      <button
        type="button"
        className="toast-close-btn"
        onClick={() => setVisible(false)}
        title="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isDanger = true,
  isPending = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="confirm-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isPending) onCancel();
      }}
    >
      <div className={`confirm-modal-card ${isDanger ? "is-danger" : ""}`} role="dialog" aria-modal="true">
        <div className="confirm-icon-badge">
          {isDanger ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          )}
        </div>

        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onCancel}
            disabled={isPending}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDanger ? "danger-btn" : "primary-action-white"}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}