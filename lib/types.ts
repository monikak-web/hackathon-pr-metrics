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
}
