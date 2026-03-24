"use client";

import { useState, useEffect, useCallback } from "react";
import { Compass, Sparkles } from "lucide-react";
import { useTour } from "@/src/components/ui/tour";

const DEMO_WELCOME_SHOWN_KEY = "demo_welcome_modal_v2";

type Props = {
  isDemoGuest: boolean;
  /** Called when user starts the 90s demo (e.g. expand sidebar so targets are visible). */
  onStartGuidedTour?: () => void;
};

export function DemoWelcomeModal({ isDemoGuest, onStartGuidedTour }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isDemoGuest || typeof window === "undefined") return;
    const shown = sessionStorage.getItem(DEMO_WELCOME_SHOWN_KEY);
    if (!shown) setOpen(true);
  }, [isDemoGuest]);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") sessionStorage.setItem(DEMO_WELCOME_SHOWN_KEY, "1");
    setOpen(false);
  }, []);

  const { startTour } = useTour();
  const handleGuided = useCallback(() => {
    dismiss();
    onStartGuidedTour?.();
    startTour("demo-guided");
  }, [dismiss, onStartGuidedTour, startTour]);

  const handleExplore = useCallback(() => {
    dismiss();
  }, [dismiss]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-welcome-title"
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.25)]">
        <h2 id="demo-welcome-title" className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Welcome to the demo workspace
        </h2>
        <p className="mt-2 text-[var(--muted)]">
          Four steps, real clicks—open a priority job, complete it, see the board move. About two minutes.
        </p>

        <div className="mt-5 space-y-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 p-4">
          <div>
            <p className="font-medium text-[var(--foreground)]">Guided workflow demo</p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Priority plan → work order → mark complete → back to Operations. No slide-through Next buttons.
            </p>
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">Explore on your own</p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Sample data, no script—browse at your pace.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={handleGuided}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3.5 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
            Start 90-Second Demo
          </button>
          <button
            type="button"
            onClick={handleExplore}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3.5 text-base font-semibold text-[var(--foreground)] hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <Compass className="h-5 w-5 shrink-0" aria-hidden />
            Explore
          </button>
        </div>
      </div>
    </div>
  );
}
