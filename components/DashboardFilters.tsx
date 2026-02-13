"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Priority } from "@/lib/types";

const PRIORITIES: { value: "" | Priority; label: string }[] = [
  { value: "", label: "All" },
  { value: "highest", label: "Highest" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "lowest", label: "Lowest" },
];

export function DashboardFilters({
  from,
  to,
  author,
  repo,
  priority,
  authors,
  repos,
  variant = "light",
}: {
  from?: string;
  to?: string;
  author?: string;
  repo?: string;
  priority?: string;
  authors: string[];
  repos: string[];
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const isDark = variant === "dark";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(params.toString() ? `/?${params.toString()}` : "/");
  }

  function clearAll() {
    if (fromRef.current) fromRef.current.value = "";
    if (toRef.current) toRef.current.value = "";
    router.replace("/");
  }

  const labelClass = isDark
    ? "text-sm text-[var(--k-gray-400)]"
    : "text-sm text-[var(--k-gray-500)]";
  const inputClass = isDark
    ? "rounded-md border border-[var(--k-gray-600)] bg-[var(--k-gray-800)] px-2 py-1 text-sm text-white"
    : "rounded-md border border-[var(--k-gray-300)] bg-white px-2 py-1 text-sm text-[var(--k-gray-900)]";
  const selectClass = isDark
    ? "rounded-md border border-[var(--k-gray-600)] bg-[var(--k-gray-800)] px-2 py-1 text-sm text-white"
    : "rounded-md border border-[var(--k-gray-300)] bg-white px-2 py-1 text-sm text-[var(--k-gray-900)]";
  const buttonClass = isDark
    ? "rounded-md border border-[var(--k-gray-600)] px-2 py-1 text-sm text-[var(--k-gray-400)] hover:text-white"
    : "rounded-md border border-[var(--k-gray-300)] px-2 py-1 text-sm text-[var(--k-gray-500)] hover:text-[var(--k-gray-900)]";

  const hasFilters = from || to || author || repo || priority;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <label className={`flex items-center gap-1.5 ${labelClass}`} title="Filter by PR opened date">
        Opened from
        <input
          ref={fromRef}
          type="date"
          defaultValue={from}
          onChange={(e) => update("from", e.target.value)}
          className={inputClass}
          aria-label="PR opened from date"
        />
      </label>
      <label className={`flex items-center gap-1.5 ${labelClass}`} title="Filter by PR opened date">
        Opened to
        <input
          ref={toRef}
          type="date"
          defaultValue={to}
          onChange={(e) => update("to", e.target.value)}
          className={inputClass}
          aria-label="PR opened to date"
        />
      </label>
      <label className={`flex items-center gap-1.5 ${labelClass}`}>
        Author
        <select
          value={author ?? ""}
          onChange={(e) => update("author", e.target.value)}
          className={selectClass}
        >
          <option value="">All</option>
          {authors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className={`flex items-center gap-1.5 ${labelClass}`}>
        Repo
        <select
          value={repo ?? ""}
          onChange={(e) => update("repo", e.target.value)}
          className={selectClass}
        >
          <option value="">All</option>
          {repos.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className={`flex items-center gap-1.5 ${labelClass}`}>
        Priority
        <select
          value={priority ?? ""}
          onChange={(e) => update("priority", e.target.value)}
          className={selectClass}
        >
          {PRIORITIES.map((p) => (
            <option key={p.value || "all"} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {hasFilters && (
        <button onClick={clearAll} className={buttonClass}>
          Clear all
        </button>
      )}
    </div>
  );
}
