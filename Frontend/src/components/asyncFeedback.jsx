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
      <p role="status" aria-live="polite">
        Loading...
      </p>
    );
  }

  if (error && !hasData) {
    return (
      <div role="alert">
        <p>{friendlyError(error)}</p>
        {onRetry && (
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <>
      {error && hasData && (
        <div role="status">
          <p>{friendlyError(error)}</p>
          {onRetry && (
            <button type="button" onClick={onRetry}>
              Retry refresh
            </button>
          )}
        </div>
      )}
      {children}
    </>
  );
}

//it takes mutation fxn and this react query helps to manage the states across all
export function MutationFeedback({
  mutation,
  pendingMessage,
  successMessage,
}) {
  if (mutation.isPending) {
    return <p role="status">{pendingMessage}</p>;
  }

  if (mutation.isError) {
    return <p role="alert">{friendlyError(mutation.error)}</p>;
  }

  if (mutation.isSuccess && successMessage) {
    return <p role="status">{successMessage}</p>;
  }

  return null;
}