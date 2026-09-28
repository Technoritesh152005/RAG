import { useQuery } from "@tanstack/react-query";
import {
  getWorkspaceCacheStats,
  getWorkspaceUsage,
} from "../../api/usage.api";
import { queryKeys } from "../../api/queryKeys";

function latencyLabel(value) {
  return value == null ? "—" : `${value} ms`;
}

function Metric({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function WorkspaceAnalytics({ workspaceId }) {
  const usageQuery = useQuery({
    queryKey: queryKeys.usage(workspaceId),
    queryFn: () => getWorkspaceUsage(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const cacheQuery = useQuery({
    queryKey: queryKeys.cacheStats(workspaceId),
    queryFn: () => getWorkspaceCacheStats(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  if (usageQuery.isLoading || cacheQuery.isLoading) {
    return (
      <section>
        <h2>Usage and performance</h2>
        <p>Loading workspace analytics...</p>
      </section>
    );
  }

  if (usageQuery.isError || cacheQuery.isError) {
    const error = usageQuery.error || cacheQuery.error;

    return (
      <section>
        <h2>Usage and performance</h2>
        <p role="alert">Unable to load analytics: {error.message}</p>
        <button
          type="button"
          onClick={() => {
            usageQuery.refetch();
            cacheQuery.refetch();
          }}
        >
          Retry
        </button>
      </section>
    );
  }

  const usage = usageQuery.data;
  const cache = cacheQuery.data;
  const hitRate = cache.measuredRequests
    ? `${(cache.hitRate * 100).toFixed(1)}%`
    : "—";

  return (
    <section>
      <h2>Usage and performance</h2>
      <p>Chat activity for this workspace. Evaluation runs are excluded.</p>

      {usage.totalRequests === 0 ? (
        <p>No chat activity has been recorded yet.</p>
      ) : (
        <dl>
          <Metric label="Chat requests" value={usage.totalRequests} />
          <Metric
            label="Average response time"
            value={latencyLabel(usage.avgLatencyMs)}
          />
          <Metric
            label="95th percentile response time"
            value={latencyLabel(usage.p95LatencyMs)}
          />
          <Metric label="Cache hit rate" value={hitRate} />
          <Metric label="Cache hits" value={cache.hits} />
          <Metric label="Cache misses" value={cache.misses} />
          <Metric
            label="Average hit response time"
            value={latencyLabel(cache.avgHitLatencyMs)}
          />
          <Metric
            label="Average miss response time"
            value={latencyLabel(cache.avgMissLatencyMs)}
          />
          <Metric
            label="LLM calls saved by cache"
            value={cache.llmCallsSaved}
          />
        </dl>
      )}
    </section>
  );
}