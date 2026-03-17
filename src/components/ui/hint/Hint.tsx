"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useHintDismissed } from "./useHintDismissed";
import { Button } from "@/src/components/ui/button";

export type HintVariant = "banner" | "card" | "empty-state" | "tip";

type HintProps = {
  /** Unique id for persistence; when dismissed, we store in localStorage so we don’t show again. */
  id: string;
  variant?: HintVariant;
  title?: string;
  message: string;
  /** Optional action (e.g. link or button) shown after the message. */
  action?: ReactNode;
  /** When true, show the hint even if it was previously dismissed (e.g. for one-time overrides). */
  forceShow?: boolean;
  /** Optional className for the wrapper. */
  className?: string;
};

const variantClasses: Record<HintVariant, string> = {
  banner:
    "rounded-lg border border-[var(--card-border)] bg-[var(--accent)]/8 px-4 py-3 text-sm text-[var(--foreground)]",
  card:
    "rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)] text-sm",
  "empty-state":
    "rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--background)]/60 p-5 text-center text-sm text-[var(--muted)]",
  tip:
    "rounded-lg border border-[var(--card-border)]/80 bg-[var(--background)]/80 px-3 py-2 text-xs text-[var(--muted)]",
};

export function Hint({
  id,
  variant = "banner",
  title,
  message,
  action,
  forceShow = false,
  className = "",
}: HintProps) {
  const [dismissed, dismiss] = useHintDismissed(id);

  if (!forceShow && dismissed) return null;

  const baseClass = variantClasses[variant];

  return (
    <div
      className={`relative ${baseClass} ${className}`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded p-1 text-[var(--muted)] hover:bg-[var(--foreground)]/10 hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        aria-label="Dismiss hint"
      >
        <X className="size-3.5" />
      </button>
      {title ? (
        <p className="mb-0.5 font-medium text-[var(--foreground)] pr-6">{title}</p>
      ) : null}
      <p className={title ? "text-[var(--muted)]" : "pr-6"}>{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
