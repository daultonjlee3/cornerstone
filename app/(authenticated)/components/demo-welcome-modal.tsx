"use client";

import { useState, useEffect, useCallback } from "react";
import { Compass, Sparkles } from "lucide-react";
import { useTour } from "@/src/components/ui/tour";
import { TOUR_COMPLETED_KEY } from "@/config/tourSteps";

const DEMO_WELCOME_SHOWN_KEY = "demo_welcome_shown";

type Props = { isDemoGuest: boolean };

export function DemoWelcomeModal({ isDemoGuest }: Props) {
  const [open, setOpen] = useState(false);
  const { startTour } = useTour();

  useEffect(() => {
    if (!isDemoGuest || typeof window === "undefined") return;
    // If the new guided product tour hasn't been completed yet, it will show
    // its own welcome modal — don't stack two modals on first visit.
    const newTourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY) === "1";
    if (!newTourCompleted) return;
    const shown = sessionStorage.getItem(DEMO_WELCOME_SHOWN_KEY);
    if (!shown) setOpen(true);
  }, [isDemoGuest]);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") sessionStorage.setItem(DEMO_WELCOME_SHOWN_KEY, "1");
    setOpen(false);
  }, []);

  const handleGuided = useCallback(() => {
    dismiss();
    startTour("demo-guided");
  }, [dismiss, startTour]);

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
          Welcome to Cornerstone OS
        </h2>
        <p className="mt-3 text-[var(--muted)]">
          Choose how you&apos;d like to explore the platform.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={handleGuided}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3.5 text-base font-semibold text-white shadow-[0_6px_18px_rgba(59,130,246,0.35)] hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <Sparkles className="h-5 w-5" aria-hidden />
            Start 2-Minute Guided Tour
          </button>
          <button
            type="button"
            onClick={handleExplore}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--background)] px-4 py-3.5 text-base font-semibold text-[var(--foreground)] hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            <Compass className="h-5 w-5" aria-hidden />
            Explore the Live Demo
          </button>
        </div>
      </div>
    </div>
  );
}
