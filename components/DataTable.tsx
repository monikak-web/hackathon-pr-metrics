"use client";

import { useMemo, useState } from "react";
import type { PrMetric, Priority, ReviewStatus } from "@/lib/types";

type SortKey =
  | "pr_number"
  | "title"
  | "author"
  | "opened_at"
  | "merged_at"
  | "duration"
  | "priority"
  | "dev_review"
  | "qa_review";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<Priority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};
const REVIEW_ORDER: Record<ReviewStatus, number> = {
  approved: 0,
  changes_requested: 1,
  pending: 2,
};

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

/** Compact format for table: fixed length so Opened/Merged columns stay readable */
function formatDateCompact(s: string | null) {
  if (!s) return { date: "—", time: "" };
  const d = new Date(s);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const date = `${day}.${month}.${year}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  return `${Math.round(days)}d`;
}

/** Duration to show: merged PR = time to merge; open PR = time since opened until now */
function getDisplayDuration(row: PrMetric, nowMs: number): { ms: number; isOpen: boolean } {
  if (row.merged_at != null && row.duration_ms != null) {
    return { ms: row.duration_ms, isOpen: false };
  }
  const opened = new Date(row.opened_at).getTime();
  return { ms: Math.max(0, nowMs - opened), isOpen: true };
}

function getDurationMs(row: PrMetric, nowMs: number): number {
  return getDisplayDuration(row, nowMs).ms;
}

function compareRows(a: PrMetric, b: PrMetric, key: SortKey, dir: SortDir, nowMs: number): number {
  let cmp = 0;
  switch (key) {
    case "pr_number":
      cmp = a.pr_number - b.pr_number;
      break;
    case "title":
      cmp = (a.title ?? "").localeCompare(b.title ?? "");
      break;
    case "author":
      cmp = (a.author ?? "").localeCompare(b.author ?? "");
      break;
    case "opened_at":
      cmp = new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime();
      break;
    case "merged_at": {
      const am = a.merged_at ? new Date(a.merged_at).getTime() : 0;
      const bm = b.merged_at ? new Date(b.merged_at).getTime() : 0;
      cmp = am - bm;
      break;
    }
    case "duration":
      cmp = getDurationMs(a, nowMs) - getDurationMs(b, nowMs);
      break;
    case "priority":
      cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      break;
    case "dev_review":
      cmp = REVIEW_ORDER[a.dev_review] - REVIEW_ORDER[b.dev_review];
      break;
    case "qa_review":
      cmp = REVIEW_ORDER[a.qa_review] - REVIEW_ORDER[b.qa_review];
      break;
    default:
      return 0;
  }
  return dir === "asc" ? cmp : -cmp;
}

function SortIcon({ dir, active }: { dir: SortDir; active: boolean }) {
  if (!active) return null;
  return (
    <span className="ml-1 font-normal text-[var(--k-gray-600)]" aria-hidden>
      {dir === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function DataTable({ data }: { data: PrMetric[] }) {
  const nowMs = Date.now();
  const [sortKey, setSortKey] = useState<SortKey>("opened_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => compareRows(a, b, sortKey, sortDir, nowMs));
  }, [data, sortKey, sortDir, nowMs]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

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
            <col className="w-[4%]" />
            <col className="w-[22%]" />
            <col className="w-[10%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--k-gray-200)] bg-[var(--k-gray-50)]">
              <th className="px-2 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("pr_number")}
                  className="flex w-full items-center font-semibold text-[var(--k-gray-900)] hover:text-[var(--k-gray-700)]"
                >
                  # <SortIcon dir={sortDir} active={sortKey === "pr_number"} />
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("title")}
                  className="flex w-full items-center text-left font-semibold text-[var(--k-gray-900)] hover:text-[var(--k-gray-700)]"
                >
                  Title <SortIcon dir={sortDir} active={sortKey === "title"} />
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("author")}
                  className="flex w-full items-center text-left font-semibold text-[var(--k-gray-900)] hover:text-[var(--k-gray-700)]"
                >
                  Author <SortIcon dir={sortDir} active={sortKey === "author"} />
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("opened_at")}
                  className="flex w-full items-center text-left font-semibold text-[var(--k-gray-900)] hover:text-[var(--k-gray-700)]"
                >
                  Opened <SortIcon dir={sortDir} active={sortKey === "opened_at"} />
                </button>
              </th>
              <th className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("merged_at")}
                  className="flex w-full items-center text-left font-semibold text-[var(--k-gray-900)] hover:text-[var(--k-gray-700)]"
                >
                  Merged <SortIcon dir={sortDir} active={sortKey === "merged_at"} />
                </button>
              </th>
              <th className="px-2 py-3" title="Time to merge, or time open if not merged">
                <button
                  type="button"
                  onClick={() => handleSort("duration")}
                  className="flex w-full items-center font-semibold text-[var(--k-gray-900)] hover:text-[var(--k-gray-700)]"
                >
                  Duration <SortIcon dir={sortDir} active={sortKey === "duration"} />
                </button>
              </th>
              <th className="px-2 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("priority")}
                  className="flex w-full items-center font-semibold text-[var(--k-gray-900)] hover:text-[var(--k-gray-700)]"
                >
                  Priority <SortIcon dir={sortDir} active={sortKey === "priority"} />
                </button>
              </th>
              <th className="px-2 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("dev_review")}
                  className="flex w-full items-center font-semibold text-[var(--k-gray-900)] hover:text-[var(--k-gray-700)]"
                >
                  DEV review <SortIcon dir={sortDir} active={sortKey === "dev_review"} />
                </button>
              </th>
              <th className="px-2 py-3">
                <button
                  type="button"
                  onClick={() => handleSort("qa_review")}
                  className="flex w-full items-center font-semibold text-[var(--k-gray-900)] hover:text-[var(--k-gray-700)]"
                >
                  QE review <SortIcon dir={sortDir} active={sortKey === "qa_review"} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
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
                <td className="px-2 py-2.5 text-[var(--k-gray-600)]" title={formatDate(row.opened_at)}>
                  {row.opened_at ? (
                    <span className="block leading-tight">
                      <span className="block font-medium text-[var(--k-gray-700)]">
                        {formatDateCompact(row.opened_at).date}
                      </span>
                      <span className="text-xs text-[var(--k-gray-500)]">
                        {formatDateCompact(row.opened_at).time}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-2 py-2.5 text-[var(--k-gray-600)]" title={row.merged_at ? formatDate(row.merged_at) : undefined}>
                  {row.merged_at ? (
                    <span className="block leading-tight">
                      <span className="block font-medium text-[var(--k-gray-700)]">
                        {formatDateCompact(row.merged_at).date}
                      </span>
                      <span className="text-xs text-[var(--k-gray-500)]">
                        {formatDateCompact(row.merged_at).time}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[var(--k-gray-400)]">—</span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-[var(--k-gray-700)]">
                  {(() => {
                    const { ms, isOpen } = getDisplayDuration(row, nowMs);
                    const text = formatDuration(ms);
                    if (isOpen && ms > 0) {
                      return (
                        <span title="Open for this long (not merged yet)">
                          {text}
                          <span className="ml-1 text-[var(--k-gray-400)]" aria-hidden>open</span>
                        </span>
                      );
                    }
                    return text;
                  })()}
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
