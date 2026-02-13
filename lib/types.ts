export type Priority = "lowest" | "low" | "medium" | "high" | "highest";
export type ReviewStatus = "pending" | "approved" | "changes_requested";

export interface PrMetric {
  repo: string;
  pr_number: number;
  title: string;
  author: string;
  opened_at: string;
  ready_at: string | null;
  merged_at: string | null;
  duration_ms: number | null;
  was_draft: boolean;
  priority: Priority;
  due_date: string | null;
  qa_review: ReviewStatus;
  dev_review: ReviewStatus;
  jira_ticket: string | null;
}
