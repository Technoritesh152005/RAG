import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateWorkspaceFAQs,
  getWorkspaceFAQs,
} from "../../api/faq.api";
import { queryKeys } from "../../api/queryKeys";
import { MutationFeedback, QueryFeedback } from "../../components/asyncFeedback";

export default function WorkspaceFAQs({ workspaceId }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");

  const faqsQuery = useQuery({
    queryKey: queryKeys.faqs(workspaceId),
    queryFn: () => getWorkspaceFAQs(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateWorkspaceFAQs(workspaceId),
    onSuccess: async (result) => {
      setNotice(result.message);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.faqs(workspaceId),
      });
    },
  });

  if (!workspaceId) return null;

  return (
    <section aria-labelledby="workspace-faq-title">
      <header>
        <div>
          <h2 id="workspace-faq-title">Frequently asked questions</h2>
          <p>Generated from questions asked in this workspace.</p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => faqsQuery.refetch()}
            disabled={faqsQuery.isFetching}
          >
            {faqsQuery.isFetching ? "Refreshing..." : "Refresh"}
          </button>

          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? "Starting..." : "Generate FAQs"}
          </button>
        </div>
      </header>

      {notice && <p role="status">{notice}</p>}

      <MutationFeedback
        mutation={generateMutation}
        pendingMessage="Starting FAQ generation..."
        successMessage={notice || "FAQ generation started in the background."}
      />

      <QueryFeedback
        isLoading={faqsQuery.isLoading}
        error={faqsQuery.error}
        onRetry={() => faqsQuery.refetch()}
        isEmpty={faqsQuery.data?.length === 0}
        emptyMessage="No FAQs yet. They’re generated automatically after every 10 workspace questions. You can also generate them manually after at least 5 questions."
        hasData={faqsQuery.data !== undefined}
      >
        <div>
          {(faqsQuery.data ?? []).map((faq) => (
            <details key={faq.id}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
              <small>
                Updated {new Date(faq.updatedAt).toLocaleString()}
              </small>
            </details>
          ))}
        </div>
      </QueryFeedback>
    </section>
  );
}