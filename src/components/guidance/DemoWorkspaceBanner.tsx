"use client";

import { FlaskConical, Sparkles } from "lucide-react";
import { useGuidance } from "@/hooks/useGuidance";

export function DemoWorkspaceBanner() {
  const { isLiveDemoMode, startLiveDemoTour } = useGuidance();

  if (!isLiveDemoMode) return null;

  return (
    <div
      className="sticky top-14 z-40 border-b border-[var(--accent)]/25 bg-[var(--accent)]/12 px-4 py-2.5 backdrop-blur sm:px-5"
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
            <FlaskConical className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p data-tour="demo-banner" className="truncate text-sm font-semibold text-[var(--foreground)]">
              Demo Workspace
            </p>
            <p className="truncate text-xs text-[var(--muted)]">
              Guided sample data. Changes here are isolated to your demo session.
            </p>
          </div>
        </div>
        <button
          type="button"
          data-tour="demo:start-tour"
          onClick={() => void startLiveDemoTour()}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(59,130,246,0.35)] hover:bg-[var(--accent-hover)]"
        >
          <Sparkles className="size-3.5" aria-hidden />
          Start Demo Tour
        </button>
      </div>
    </div>
  );
}
