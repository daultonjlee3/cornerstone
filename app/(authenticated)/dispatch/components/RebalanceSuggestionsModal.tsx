"use client";

import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import type { RebalanceSuggestion } from "../rebalance-utils";

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export type RebalanceSuggestionsModalProps = {
  open: boolean;
  onClose: () => void;
  suggestions: RebalanceSuggestion[];
  onApply: () => void;
  isApplying: boolean;
};

export function RebalanceSuggestionsModal({
  open,
  onClose,
  suggestions,
  onApply,
  isApplying,
}: RebalanceSuggestionsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule Optimization Suggestions"
      description="Suggested job moves from overloaded crews to those with available capacity. Review and apply to update the schedule."
      className="max-w-xl"
    >
      <div className="space-y-4">
        {suggestions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No rebalance suggestions right now. Workload is within capacity, or there are no safe jobs to move (in-progress and emergency jobs are excluded).
          </p>
        ) : (
          <ul className="space-y-3">
            {suggestions.map((s) => (
              <li
                key={s.workOrderId}
                className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 p-3 text-sm"
              >
                <p className="font-medium text-[var(--foreground)]">
                  {s.workOrderNumber ?? `WO`} — {s.title ?? "Work order"}
                </p>
                <p className="mt-1 text-[var(--muted)]">
                  {s.fromCrewName} → {s.toCrewName}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {formatTime(s.scheduledStart)} → {formatTime(s.scheduledStart)} ({s.durationHours.toFixed(1)}h)
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            onClick={onApply}
            disabled={suggestions.length === 0 || isApplying}
          >
            {isApplying ? "Applying…" : "Apply Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
