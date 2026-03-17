"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useHintDismissed } from "@/src/components/ui/hint/useHintDismissed";

type HelperTipProps = {
  /** Unique id for dismiss persistence (localStorage). */
  id: string;
  message: string;
  /** Optional link or button after the message. */
  action?: ReactNode;
  className?: string;
};

/**
 * Rule-based helper tip: subtle, dismissible, non-intrusive.
 * Use for next-action guidance derived from real data (deterministic logic only).
 */
export function HelperTip({ id, message, action, className = "" }: HelperTipProps) {
  const [dismissed, dismiss] = useHintDismissed(id);

  if (dismissed) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-[var(--card-border)]/80 bg-[var(--background)]/90 px-3 py-2 text-xs text-[var(--muted)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate">{message}</p>
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded p-1 text-[var(--muted)] hover:bg-[var(--foreground)]/10 hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
