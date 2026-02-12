"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function DateFilter({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        Opened from
        <input
          ref={fromRef}
          type="date"
          defaultValue={from}
          onChange={(e) => update("from", e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        to
        <input
          ref={toRef}
          type="date"
          defaultValue={to}
          onChange={(e) => update("to", e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      {(from || to) && (
        <button
          onClick={clear}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Clear
        </button>
      )}
    </div>
  );
}
