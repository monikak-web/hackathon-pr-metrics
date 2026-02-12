"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function DateFilter({
  from,
  to,
  variant = "light",
}: {
  from?: string;
  to?: string;
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
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }

  function clear() {
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
  const buttonClass = isDark
    ? "rounded-md border border-[var(--k-gray-600)] px-2 py-1 text-sm text-[var(--k-gray-400)] hover:text-white"
    : "rounded-md border border-[var(--k-gray-300)] px-2 py-1 text-sm text-[var(--k-gray-500)] hover:text-[var(--k-gray-900)]";

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className={`flex items-center gap-1.5 ${labelClass}`}>
        Opened from
        <input
          ref={fromRef}
          type="date"
          defaultValue={from}
          onChange={(e) => update("from", e.target.value)}
          className={inputClass}
        />
      </label>
      <label className={`flex items-center gap-1.5 ${labelClass}`}>
        to
        <input
          ref={toRef}
          type="date"
          defaultValue={to}
          onChange={(e) => update("to", e.target.value)}
          className={inputClass}
        />
      </label>
      {(from || to) && (
        <button onClick={clear} className={buttonClass}>
          Clear
        </button>
      )}
    </div>
  );
}
