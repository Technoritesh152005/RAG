import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateWorkspaceFAQs,
  getWorkspaceFAQs,
} from "../../api/faq.api";
import { queryKeys } from "../../api/queryKeys";
import { MutationFeedback, QueryFeedback } from "../../components/asyncFeedback";

function formatFaqAnswer(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`(.*?)`/g, "'$1'")
    .replace(/^>\s*/gm, "");
}

export default function WorkspaceFAQs({ workspaceId, onSelectQuestion }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const faqsQuery = useQuery({
    queryKey: queryKeys.faqs(workspaceId),
    queryFn: () => getWorkspaceFAQs(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateWorkspaceFAQs(workspaceId),
    onSuccess: async (result) => {
      setNotice(result.message);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.faqs(workspaceId),
      });
      setIsOpen(true);
    },
  });

  if (!workspaceId) return null;

  const faqs = faqsQuery.data ?? [];

  return (
    <div className={`faq-widget-card ${isOpen ? "is-open" : "is-closed"}`}>
      <div className="faq-widget-header" onClick={() => setIsOpen(!isOpen)} style={{ cursor: "pointer" }}>
        <div className="faq-header-title-wrap">
          <div className="faq-title-row">
            <h3>Suggested Questions</h3>
            <span className="faq-count-badge">{faqs.length}</span>
          </div>
          <p>Click to {isOpen ? "collapse" : "expand"} common questions & answers.</p>
        </div>

        <div className="faq-header-right-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={(e) => {
              e.stopPropagation();
              generateMutation.mutate();
            }}
            disabled={generateMutation.isPending}
            title="Generate FAQs from chat history"
          >
            {generateMutation.isPending ? "Generating..." : "+ Auto-Generate"}
          </button>
          <span className="faq-toggle-arrow">{isOpen ? "▲" : "▼"}</span>
        </div>
      </div>

      {isOpen && (
        <div className="faq-dropdown-body">
          {notice && <p className="form-hint text-green" role="status">{notice}</p>}

          <MutationFeedback
            mutation={generateMutation}
            pendingMessage="Generating FAQs..."
            successMessage={notice || "FAQ generation started."}
          />

          <QueryFeedback
            isLoading={faqsQuery.isLoading}
            error={faqsQuery.error}
            onRetry={() => faqsQuery.refetch()}
            isEmpty={faqs.length === 0}
            emptyMessage="No questions generated yet. Ask questions in the chat to auto-generate FAQs."
            hasData={faqsQuery.data !== undefined}
          >
            <div className="faq-items-list">
              {faqs.map((faq) => (
                <div key={faq.id} className="faq-item">
                  <div
                    className="faq-question-row"
                    onClick={() => onSelectQuestion && onSelectQuestion(faq.question)}
                    title="Click to ask this question in chat"
                  >
                    <span className="faq-q-badge">Q</span>
                    <span className="faq-q-text">{faq.question}</span>
                    <span className="faq-ask-prompt">Ask →</span>
                  </div>
                  <p className="faq-a-text">{formatFaqAnswer(faq.answer)}</p>
                </div>
              ))}
            </div>
          </QueryFeedback>
        </div>
      )}
    </div>
  );
}