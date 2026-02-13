import type { PrMetric, ReviewStatus } from "@/lib/types";

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  changes_requested: "Changes requested",
};

function ReviewStatusIcon({ status }: { status: ReviewStatus }) {
  const label = REVIEW_LABELS[status];
  const icon =
    status === "approved" ? (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-green-600" aria-hidden>
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
    ) : status === "changes_requested" ? (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-amber-600" aria-hidden>
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-[var(--k-gray-400)]" aria-hidden>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
      </svg>
    );

  return (
    <span className="group relative inline-flex cursor-default items-center justify-center">
      {icon}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--k-gray-900)] px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
        role="tooltip"
      >
        {label}
      </span>
    </span>
  );
}

function formatDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

export function DataTable({ data }: { data: PrMetric[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--k-gray-200)] bg-white p-12 text-center text-[var(--k-gray-500)]">
        No data to display. Adjust filters or add PR metrics.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[var(--k-gray-200)] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[24%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--k-gray-200)] bg-[var(--k-gray-50)]">
              <th className="px-2 py-3 font-semibold text-[var(--k-gray-900)]">
                #
              </th>
              <th className="px-3 py-3 font-semibold text-[var(--k-gray-900)]">
                Title
              </th>
              <th className="px-3 py-3 font-semibold text-[var(--k-gray-900)]">
                Author
              </th>
              <th className="px-3 py-3 font-semibold text-[var(--k-gray-900)]">
                Opened
              </th>
              <th className="px-3 py-3 font-semibold text-[var(--k-gray-900)]">
                Merged
              </th>
              <th className="px-2 py-3 font-semibold text-[var(--k-gray-900)]">
                Duration
              </th>
              <th className="px-2 py-3 font-semibold text-[var(--k-gray-900)]">
                Priority
              </th>
              <th className="px-2 py-3 font-semibold text-[var(--k-gray-900)]">
                DEV review
              </th>
              <th className="px-2 py-3 font-semibold text-[var(--k-gray-900)]">
                QE review
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={`${row.repo}-${row.pr_number}`}
                className="border-b border-[var(--k-gray-100)] hover:bg-[var(--k-gray-50)]"
              >
                <td className="px-2 py-2.5 font-medium text-[var(--k-gray-900)]">
                  {row.pr_number}
                </td>
                <td className="truncate px-3 py-2.5 text-[var(--k-gray-800)]" title={row.title}>
                  {row.title}
                </td>
                <td className="truncate px-3 py-2.5 text-[var(--k-gray-700)]" title={row.author}>
                  {row.author}
                </td>
                <td className="truncate px-3 py-2.5 text-[var(--k-gray-600)]" title={formatDate(row.opened_at)}>
                  {formatDate(row.opened_at)}
                </td>
                <td className="truncate px-3 py-2.5 text-[var(--k-gray-600)]" title={formatDate(row.merged_at)}>
                  {formatDate(row.merged_at)}
                </td>
                <td className="px-2 py-2.5 text-[var(--k-gray-700)]">
                  {formatDuration(row.duration_ms)}
                </td>
                <td className="px-2 py-2.5">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      row.priority === "high" || row.priority === "critical"
                        ? "bg-red-100 text-red-800"
                        : row.priority === "medium"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-[var(--k-gray-200)] text-[var(--k-gray-700)]"
                    }`}
                  >
                    {row.priority}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <ReviewStatusIcon status={row.dev_review} />
                </td>
                <td className="px-2 py-2.5">
                  <ReviewStatusIcon status={row.qa_review} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
