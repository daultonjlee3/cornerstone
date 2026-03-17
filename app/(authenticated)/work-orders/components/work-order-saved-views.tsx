"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const SAVED_VIEWS: { id: string; label: string; view: string }[] = [
  { id: "open", label: "My Open Work", view: "open" },
  { id: "unassigned", label: "Unassigned", view: "unassigned" },
  { id: "overdue", label: "Overdue", view: "overdue" },
  { id: "due_today", label: "Due Today", view: "due_today" },
  { id: "pm", label: "Preventive Maintenance", view: "pm" },
  { id: "high_priority", label: "High Priority", view: "high_priority" },
  { id: "completed_today", label: "Completed Today", view: "completed_today" },
];

export function WorkOrderSavedViews() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? "";

  const applyView = useCallback(
    (view: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("view", view);
      router.push(`/work-orders?${next.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-[var(--muted)]">Saved views:</span>
      {SAVED_VIEWS.map(({ id, label, view }) => (
        <button
          key={id}
          type="button"
          onClick={() => applyView(view)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            currentView === view
              ? "bg-[var(--accent)] text-white"
              : "border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--background)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
