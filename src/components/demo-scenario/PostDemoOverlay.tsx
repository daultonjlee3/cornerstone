"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDemoScenario } from "@/hooks/useDemoScenario";

const FEATURE_LINKS = [
  { label: "Work Orders", href: "/work-orders" },
  { label: "Assets", href: "/assets" },
  { label: "Dispatch", href: "/dispatch" },
  { label: "Inventory", href: "/inventory" },
] as const;

export function PostDemoOverlay() {
  const { enterExploreMode, restartDemo } = useDemoScenario();

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-hidden
      />
      <div
        className="relative z-[10000] w-full max-h-[90dvh] min-w-0 max-w-[28rem] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.3)] sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-demo-title"
      >
        <h1
          id="post-demo-title"
          className="text-center text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl"
        >
          Run your operation like this
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-[var(--muted)]">
          Cornerstone gives your team clarity, control, and visibility in minutes.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:mt-8">
          <Link
            href="/signup?source=demo"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-4 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_10px_24px_rgba(59,130,246,0.45)]"
          >
            Start Your Workspace
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={enterExploreMode}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-6 py-4 text-base font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--background)]/90"
          >
            Explore the App
          </button>
        </div>

        <div className="mt-6 border-t border-[var(--card-border)] pt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
            Jump to a feature
          </p>
          <div className="flex flex-wrap gap-2">
            {FEATURE_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={enterExploreMode}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/70 px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--background)]"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center">
          <button
            type="button"
            onClick={restartDemo}
            className="text-xs font-medium text-[var(--muted)] underline decoration-[var(--muted)]/50 underline-offset-2 hover:text-[var(--foreground)]"
          >
            Replay demo
          </button>
        </p>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(overlay, document.body) : null;
}
