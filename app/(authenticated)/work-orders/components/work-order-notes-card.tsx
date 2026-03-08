"use client";

import { useState } from "react";
import { useTransition } from "react";
import { addWorkOrderNote } from "../actions";
import { formatDateTime } from "./detail-utils";

const cardClass = "rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm";
const cardTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)]";
const btnClass =
  "rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

type Note = { id: string; body: string; note_type: string | null; created_at: string };

type WorkOrderNotesCardProps = {
  workOrderId: string;
  notes: Note[];
  onNotesChange: () => void;
};

export function WorkOrderNotesCard({ workOrderId, notes, onNotesChange }: WorkOrderNotesCardProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<"internal" | "customer_visible">("internal");
  const [addPending, startAddTransition] = useTransition();

  const internalNotes = notes.filter((n) => (n.note_type ?? "internal") === "internal");
  const customerNotes = notes.filter((n) => n.note_type === "customer_visible");

  const handleAdd = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    startAddTransition(async () => {
      const result = await addWorkOrderNote(workOrderId, trimmed, noteType);
      if (result.error) return;
      setNoteText("");
      setAddOpen(false);
      onNotesChange();
    });
  };

  const renderNoteList = (list: Note[], title: string) => (
    <div>
      <h3 className="mb-2 text-xs font-medium text-[var(--muted)]">{title}</h3>
      <ul className="space-y-2">
        {list.map((n) => (
          <li key={n.id} className="rounded border border-[var(--card-border)] bg-[var(--background)] p-2 text-sm">
            <p className="text-[var(--foreground)]">{n.body}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{formatDateTime(n.created_at)}</p>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={cardClass}>
      <h2 className={cardTitleClass}>Notes & activity</h2>
      <div className="space-y-4">
        {internalNotes.length > 0 && renderNoteList(internalNotes, "Internal notes")}
        {customerNotes.length > 0 && renderNoteList(customerNotes, "Customer-visible notes")}
        {notes.length === 0 && !addOpen && (
          <p className="text-sm text-[var(--muted)]">No notes yet.</p>
        )}
      </div>
      {addOpen ? (
        <div className="mt-4 space-y-2 rounded border border-[var(--card-border)] bg-[var(--background)] p-3">
          <select
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as "internal" | "customer_visible")}
            className="w-full rounded border border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5 text-sm"
          >
            <option value="internal">Internal note</option>
            <option value="customer_visible">Customer-visible note</option>
          </select>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Note text..."
            rows={2}
            className="w-full rounded border border-[var(--card-border)] bg-[var(--card)] px-2 py-1.5 text-sm placeholder:text-[var(--muted)]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={addPending || !noteText.trim()}
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {addPending ? "Saving…" : "Save note"}
            </button>
            <button type="button" onClick={() => { setAddOpen(false); setNoteText(""); }} className={btnClass}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAddOpen(true)} className={`mt-4 ${btnClass}`}>
          Add note
        </button>
      )}
    </div>
  );
}
