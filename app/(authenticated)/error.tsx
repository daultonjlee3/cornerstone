"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

/**
 * Root error boundary for all authenticated routes.
 * Catches uncaught errors thrown during server-component rendering or
 * client-side React rendering and shows a branded recovery screen.
 */
export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the browser console for debugging during development.
    console.error("[Cornerstone] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-[var(--foreground)]">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-sm text-[var(--muted)]">
        An unexpected error occurred. Your data is safe — this page failed to
        load correctly.
      </p>

      {error.digest && (
        <p className="mt-2 text-xs text-[var(--muted)]/60">
          Error reference: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Home className="h-4 w-4" aria-hidden />
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
