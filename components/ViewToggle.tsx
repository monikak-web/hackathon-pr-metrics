"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

function buildUrl(params: URLSearchParams, view: "" | "dashboard" | "table") {
  const p = new URLSearchParams(params.toString());
  if (view) p.set("view", view);
  else p.delete("view");
  const qs = p.toString();
  return qs ? `/?${qs}` : "/";
}

export function ViewToggle({ view }: { view: "dashboard" | "table" }) {
  const searchParams = useSearchParams();
  const dashboardHref = buildUrl(searchParams, "dashboard");
  const tableHref = buildUrl(searchParams, "table");

  return (
    <div className="inline-flex rounded-lg border border-[var(--k-gray-200)] bg-white p-0.5 shadow-sm">
      <Link
        href={dashboardHref}
        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          view === "dashboard"
            ? "bg-[var(--k-green-500)] text-white"
            : "text-[var(--k-gray-600)] hover:bg-[var(--k-gray-100)] hover:text-[var(--k-gray-900)]"
        }`}
      >
        Dashboard
      </Link>
      <Link
        href={tableHref}
        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          view === "table"
            ? "bg-[var(--k-green-500)] text-white"
            : "text-[var(--k-gray-600)] hover:bg-[var(--k-gray-100)] hover:text-[var(--k-gray-900)]"
        }`}
      >
        Table
      </Link>
    </div>
  );
}
