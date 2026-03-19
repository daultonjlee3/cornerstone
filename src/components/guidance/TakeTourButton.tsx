"use client";

import { MapPinned } from "lucide-react";
import { useGuidance } from "@/hooks/useGuidance";

type TakeTourButtonProps = {
  className?: string;
  compact?: boolean;
};

export function TakeTourButton({ className = "", compact = false }: TakeTourButtonProps) {
  const {
    startProductTourForCurrentPage,
    startLiveDemoTour,
    hasProductTourForCurrentPage,
    isLiveDemoMode,
  } = useGuidance();

  const canStart = isLiveDemoMode || hasProductTourForCurrentPage;
  const label = isLiveDemoMode ? "Start Demo Tour" : "Take Tour";

  return (
    <button
      type="button"
      data-tour="guidance:take-tour-button"
      disabled={!canStart}
      onClick={() => void (isLiveDemoMode ? startLiveDemoTour() : startProductTourForCurrentPage())}
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
