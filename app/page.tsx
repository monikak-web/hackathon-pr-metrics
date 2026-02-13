import Image from "next/image";
import { supabase } from "@/lib/supabase";
import type { PrMetric } from "@/lib/types";
import { ChartCard } from "@/components/ChartCard";
import { DashboardFilters } from "@/components/DashboardFilters";
import { ViewToggle } from "@/components/ViewToggle";
import { DataTable } from "@/components/DataTable";
import { MergeTimeTrend } from "@/components/charts/MergeTimeTrend";
import { AuthorLeaderboard } from "@/components/charts/AuthorLeaderboard";
import { MedianAuthorLeaderboard } from "@/components/charts/MedianAuthorLeaderboard";
import { WeeklyThroughput } from "@/components/charts/WeeklyThroughput";
import { DurationDistribution } from "@/components/charts/DurationDistribution";
import { DraftComparison } from "@/components/charts/DraftComparison";
import { RepoComparison } from "@/components/charts/RepoComparison";
import { CalendarHeatmap } from "@/components/charts/CalendarHeatmap";
import { PriorityBreakdown } from "@/components/charts/PriorityBreakdown";
import { PriorityMergeTime } from "@/components/charts/PriorityMergeTime";
import { DueDateCompliance } from "@/components/charts/DueDateCompliance";
import { ReviewStatusOverview } from "@/components/charts/ReviewStatusOverview";

export const dynamic = "force-dynamic";

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 30);
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    author?: string;
    repo?: string;
    priority?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const { author, priority, view: viewParam } = params;
  const view = viewParam === "table" ? "table" : "dashboard";
  const repo = params.repo || undefined;

  const defaultRange = getDefaultDateRange();
  const from = params.from ?? defaultRange.from;
  const to = params.to ?? defaultRange.to;

  let query = supabase
    .from("pr_metrics")
    .select("*")
    .order("merged_at", { ascending: true });

  query = query.gte("opened_at", from);
  query = query.lte("opened_at", to + "T23:59:59");
  if (author) {
    query = query.eq("author", author);
  }
  if (repo) {
    query = query.eq("repo", repo);
  }
  if (priority) {
    query = query.eq("priority", priority);
  }

  const { data, error } = await query;

  const metrics: PrMetric[] = data ?? [];

  // Options for dropdowns: distinct authors/repos in the selected date range
  let optQuery = supabase.from("pr_metrics").select("author, repo");
  optQuery = optQuery.gte("opened_at", from);
  optQuery = optQuery.lte("opened_at", to + "T23:59:59");
  const { data: optData } = await optQuery;
  const all = (optData ?? []) as { author: string; repo: string }[];
  const authors = [...new Set(all.map((r) => r.author))].filter(Boolean).sort();
  const repos = [...new Set(all.map((r) => r.repo))].filter(Boolean).sort();

  const merged = metrics.filter((m) => m.merged_at !== null);

  const mergeDays =
    merged.length > 0
      ? merged.map((m) => {
          const msPerDay = 1000 * 60 * 60 * 24;
          const opened = new Date(m.opened_at).getTime();
          const mergedAt = new Date(m.merged_at!).getTime();
          return (mergedAt - opened) / msPerDay;
        })
      : [];

  const avgOpenToMergeDays =
    mergeDays.length > 0
      ? mergeDays.reduce((a, b) => a + b, 0) / mergeDays.length
      : null;

  const medianOpenToMergeDays =
    mergeDays.length > 0
      ? (() => {
          const sorted = [...mergeDays].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
        })()
      : null;

  return (
    <div className="min-h-screen bg-[var(--k-gray-50)]">
      <header className="border-b border-[var(--k-gray-800)] bg-[var(--header-bg)] px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Image
                src="/logo-white.png"
                alt="Ketryx"
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
                priority
              />
              <span className="text-lg font-semibold text-[var(--header-fg)]">
                PR Metrics Dashboard
              </span>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-[var(--k-gray-400)]">
                {metrics.length} PRs tracked · {merged.length} merged
                {error && (
                  <span className="ml-2 text-red-400">
                    (Error: {error.message})
                  </span>
                )}
              </p>
              <ViewToggle view={view} />
            </div>
          </div>
          <div className="flex w-full justify-center">
            <DashboardFilters
              from={from}
              to={to}
              author={author}
              repo={repo}
              priority={priority}
              authors={authors}
              repos={repos}
              variant="dark"
            />
          </div>
        </div>
      </header>

      {view !== "table" && (
        <div className="border-b border-[var(--k-gray-200)] bg-white py-2">
          <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 text-sm sm:px-6">
            <span className="text-[var(--k-gray-500)]">Avg open → merge</span>
            {avgOpenToMergeDays != null ? (
              <span className="font-semibold tabular-nums text-[var(--k-green-600)]">
                {avgOpenToMergeDays.toFixed(1)} days
              </span>
            ) : (
              <span className="text-[var(--k-gray-400)]">—</span>
            )}
            <span className="text-[var(--k-gray-300)]">|</span>
            <span className="text-[var(--k-gray-500)]">Median</span>
            {medianOpenToMergeDays != null ? (
              <span className="font-semibold tabular-nums text-[var(--k-blue-600)]">
                {medianOpenToMergeDays.toFixed(1)} days
              </span>
            ) : (
              <span className="text-[var(--k-gray-400)]">—</span>
            )}
            <span className="text-[var(--k-gray-300)]">|</span>
            <span className="text-[var(--k-gray-400)]">
              {merged.length} PR{merged.length !== 1 ? "s" : ""} merged
            </span>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {view === "table" ? (
          <DataTable data={metrics} />
        ) : (
          <div className="grid items-start gap-6 md:grid-cols-2">
          <ChartCard
            title="Merge Time Trend"
            description="Duration from ready to merge over time"
          >
            <MergeTimeTrend data={merged} />
          </ChartCard>

          <ChartCard
            title="Duration Distribution"
            description="How long PRs take to merge, bucketed by duration"
          >
            <DurationDistribution data={merged} />
          </ChartCard>

          <ChartCard
            title="Author Leaderboard (Avg)"
            description="Average merge time per author"
          >
            <AuthorLeaderboard data={merged} />
          </ChartCard>

          <ChartCard
            title="Author Leaderboard (Median)"
            description="Median merge time per author"
          >
            <MedianAuthorLeaderboard data={merged} />
          </ChartCard>

          <ChartCard
            title="Repo Comparison"
            description="Average merge time per repository"
          >
            <RepoComparison data={merged} />
          </ChartCard>

          <ChartCard
            title="Priority Breakdown"
            description="PR count by priority level (with avg merge time)"
          >
            <PriorityBreakdown data={merged} />
          </ChartCard>

          <ChartCard
            title="Priority vs Merge Time"
            description="Average merge time by priority level"
          >
            <PriorityMergeTime data={merged} />
          </ChartCard>

          <ChartCard
            title="Due Date Compliance"
            description="PRs merged on time vs late (relative to due date)"
          >
            <DueDateCompliance data={merged} />
          </ChartCard>

          <ChartCard
            title="Review Status Overview"
            description="QA and Dev review status distribution"
          >
            <ReviewStatusOverview data={metrics} />
          </ChartCard>

          <ChartCard
            title="Weekly Throughput"
            description="Number of PRs merged per week"
          >
            <WeeklyThroughput data={merged} />
          </ChartCard>
        </div>
        )}
      </main>
    </div>
  );
}
