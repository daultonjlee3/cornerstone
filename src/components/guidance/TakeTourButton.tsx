"use client";

import { MapPinned, Sparkles } from "lucide-react";
import { useGuidance } from "@/hooks/useGuidance";
import { useTour } from "@/src/components/ui/tour";

type TakeTourButtonProps = {
  className?: string;
  compact?: boolean;
};

export function TakeTourButton({ className = "", compact = false }: TakeTourButtonProps) {
  const { startProductTourForCurrentPage, hasProductTourForCurrentPage } = useGuidance();
  const { startTour, isDemoGuest } = useTour();

  if (isDemoGuest) {
    return (
      <button
        type="button"
        data-tour="guidance:take-tour-button"
        onClick={() => startTour("demo-guided")}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/15 ${
          compact ? "h-8 px-2.5 text-xs" : "min-h-[40px]"
        } ${className}`}
        aria-label="Start 90-second demo"
      >
        <Sparkles className={compact ? "size-3.5" : "size-4"} aria-hidden />
        Start 90-Second Demo
      </button>
    );
  }

  const canStart = hasProductTourForCurrentPage;
  const label = "Take Tour";

  return (
    <button
      type="button"
      data-tour="guidance:take-tour-button"
      disabled={!canStart}
      onClick={() => void startProductTourForCurrentPage()}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3 py-2 text-sm font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/15 disabled:cursor-not-allowed disabled:opacity-50 ${
        compact ? "h-8 px-2.5 text-xs" : "min-h-[40px]"
      } ${className}`}
      aria-label={label}
    >
      <MapPinned className={compact ? "size-3.5" : "size-4"} aria-hidden />
      {label}
    </button>
  );
}
