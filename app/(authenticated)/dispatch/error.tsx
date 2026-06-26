"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DispatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dispatch] page error", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Dispatch board unavailable</h1>
      <p className="max-w-md text-sm text-[var(--text-muted)]">
        {error.message || "Something went wrong while loading the dispatch console."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
        <Link
          href="/operations"
          className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Back to operations
        </Link>
      </div>
    </div>
  );
}
