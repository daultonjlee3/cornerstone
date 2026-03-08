"use client";

import { useState } from "react";
import { useTransition } from "react";
import { addWorkOrderChecklistItem, toggleWorkOrderChecklistItem } from "../actions";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";
const btnClass =
  "rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

type ChecklistItem = { id: string; label: string; completed: boolean; sort_order: number };

type WorkOrderChecklistCardProps = {
  workOrderId: string;
  items: ChecklistItem[];
  onToggle: (itemId: string, completed: boolean) => void;
  onItemsChange: () => void;
  isPending?: boolean;
};

export function WorkOrderChecklistCard({
  workOrderId,
  items,
  onToggle,
  onItemsChange,
  isPending = false,
}: WorkOrderChecklistCardProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [addPending, startAddTransition] = useTransition();

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    startAddTransition(async () => {
      const result = await addWorkOrderChecklistItem(workOrderId, trimmed);
      if (result.error) return;
      setNewLabel("");
      setAddOpen(false);
      onItemsChange();
    });
  };

  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Checklist</h2>
      {items.length === 0 && !addOpen ? (
        <p className="text-sm text-[var(--muted)]">No checklist items.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggle(item.id, item.completed)}
                disabled={isPending}
                className={`h-5 w-5 shrink-0 rounded border ${
                  item.completed
                    ? "border-[var(--accent)] bg-[var(--accent)]"
                    : "border-[var(--card-border)] bg-[var(--card)]"
                } flex items-center justify-center text-white text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50`}
                aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
              >
                {item.completed && "✓"}
              </button>
              <span
                className={`text-sm ${item.completed ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"}`}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      )}
      {addOpen ? (
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Checklist item label"
            className="flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={addPending || !newLabel.trim()}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {addPending ? "Adding…" : "Add"}
          </button>
          <button type="button" onClick={() => { setAddOpen(false); setNewLabel(""); }} className={btnClass}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setAddOpen(true)} className={`mt-4 w-full sm:w-auto ${btnClass}`}>
          Add checklist item
        </button>
      )}
    </div>
  );
}
