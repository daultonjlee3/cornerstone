"use client";

import type { ReactNode } from "react";
import { Button } from "@/src/components/ui/button";
import { Panel } from "@/src/components/design-system";

type OperationsScrollSectionProps = {
  children: ReactNode;
  maxHeightClass?: string;
  hasMore: boolean;
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  empty?: ReactNode;
  skeleton?: ReactNode;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  onRetry?: () => void;
  ariaLabel: string;
};

export function OperationsScrollSection({
  children,
  maxHeightClass = "max-h-[420px]",
  hasMore,
  loading,
  initialLoading,
  error,
  empty,
  skeleton,
  sentinelRef,
  onRetry,
  ariaLabel,
}: OperationsScrollSectionProps) {
  if (error) {
    return (
      <Panel level="default" padding="sm" className="border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)]">
        <p className="cs-text-body text-[var(--status-danger)]">{error}</p>
        {onRetry ? (
          <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </Panel>
    );
  }

  if (initialLoading) {
    return <div aria-busy="true" aria-label={`Loading ${ariaLabel}`}>{skeleton}</div>;
  }

  if (empty) {
    return <>{empty}</>;
  }

  return (
    <div className="relative">
      <div
        className={`${maxHeightClass} overflow-y-auto overscroll-contain rounded-xl border border-[var(--surface-border-subtle)] bg-[var(--surface-base)]`}
        aria-label={ariaLabel}
      >
        {children}
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
        {loading && !initialLoading ? (
          <div className="px-4 py-3 cs-text-caption cs-text-muted animate-pulse">Loading more…</div>
        ) : null}
      </div>
      {hasMore ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-xl bg-gradient-to-t from-[var(--surface-base)] to-transparent"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
