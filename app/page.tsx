import Image from "next/image";
import { supabase } from "@/lib/supabase";
import type { PrMetric } from "@/lib/types";
import { ChartCard } from "@/components/ChartCard";
import { DashboardFilters } from "@/components/DashboardFilters";
import { ViewToggle } from "@/components/ViewToggle";
import { DataTable } from "@/components/DataTable";
import { MergeTimeTrend } from "@/components/charts/MergeTimeTrend";
import { AuthorLeaderboard } from "@/components/charts/AuthorLeaderboard";
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
  const { from, to, author, repo, priority, view: viewParam } = await searchParams;
  const view = viewParam === "table" ? "table" : "dashboard";

  let query = supabase
    .from("pr_metrics")
    .select("*")
    .order("merged_at", { ascending: true });

  if (from) {
    query = query.gte("opened_at", from);
  }
  if (to) {
    query = query.lte("opened_at", to + "T23:59:59");
  }
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

  // Options for dropdowns: distinct authors/repos in the selected date range (ignore author/repo/priority)
  let optQuery = supabase.from("pr_metrics").select("author, repo");
  if (from) optQuery = optQuery.gte("opened_at", from);
  if (to) optQuery = optQuery.lte("opened_at", to + "T23:59:59");
  const { data: optData } = await optQuery;
  const all = (optData ?? []) as { author: string; repo: string }[];
  const authors = [...new Set(all.map((r) => r.author))].filter(Boolean).sort();
  const repos = [...new Set(all.map((r) => r.repo))].filter(Boolean).sort();

  const merged = metrics.filter((m) => m.merged_at !== null);

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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {view === "table" ? (
          <DataTable data={metrics} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
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
            title="Author Leaderboard"
            description="Average merge time per author"
          >
            <AuthorLeaderboard data={merged} />
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
