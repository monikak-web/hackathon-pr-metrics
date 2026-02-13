import type { PrMetric } from "@/lib/types";

/**
 * Average number of days from PR opened_at to merged_at (for merged PRs only).
 */
export function AvgOpenToMergeDays({ data }: { data: PrMetric[] }) {
  const merged = data.filter((m) => m.merged_at != null);
  if (merged.length === 0) {
    return (
      <div className="flex items-baseline gap-2 text-[var(--k-gray-500)]">
        <span className="text-2xl font-bold text-[var(--k-gray-400)]">—</span>
        <span className="text-sm">No merged PRs in selection</span>
      </div>
    );
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysArray = merged.map((m) => {
    const opened = new Date(m.opened_at).getTime();
    const mergedTime = new Date(m.merged_at!).getTime();
    return (mergedTime - opened) / msPerDay;
  });
  const avgDays = daysArray.reduce((a, b) => a + b, 0) / daysArray.length;

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-2xl font-bold tabular-nums text-[var(--k-green-600)]">
        {avgDays.toFixed(1)}
      </span>
      <span className="text-base font-medium text-[var(--k-gray-700)]">days</span>
      <span className="w-full text-sm text-[var(--k-gray-500)]">
        open → merge · {merged.length} PR{merged.length !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
