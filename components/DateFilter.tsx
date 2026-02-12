"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DateFilter({ from, to }: { from?: string; to?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
    router.replace("/");
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        From
        <input
          type="date"
          defaultValue={from}
          onChange={(e) => update("from", e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        To
        <input
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
