import { supabase } from "@/lib/supabase";
import type { PrMetric } from "@/lib/types";
import { ChartCard } from "@/components/ChartCard";
import { DateFilter } from "@/components/DateFilter";
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
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

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

  const { data, error } = await query;

  const metrics: PrMetric[] = data ?? [];
  const merged = metrics.filter((m) => m.merged_at !== null);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          PR Metrics Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {metrics.length} pull requests tracked &middot; {merged.length} merged
          {error && (
            <span className="ml-2 text-red-500">
              (Error loading data: {error.message})
            </span>
          )}
        </p>
        <DateFilter from={from} to={to} />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Calendar heatmap spans full width */}
        <div className="mb-6">
          <ChartCard
            title="Merge Activity"
            description="GitHub-style heatmap of PR merges over the last year"
          >
            <CalendarHeatmap data={merged} />
          </ChartCard>
        </div>

        {/* 2-column grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <ChartCard
            title="Merge Time Trend"
            description="Duration from ready to merge over time"
          >
            <MergeTimeTrend data={merged} />
          </ChartCard>

          <ChartCard
            title="Weekly Throughput"
            description="Number of PRs merged per week"
          >
            <WeeklyThroughput data={merged} />
          </ChartCard>

          <ChartCard
            title="Duration Distribution"
            description="How long PRs take to merge, bucketed by duration"
          >
            <DurationDistribution data={merged} />
          </ChartCard>

          <ChartCard
            title="Draft vs Non-Draft"
            description="Average merge time comparison"
          >
            <DraftComparison data={merged} />
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
        </div>
      </main>
    </div>
  );
}
