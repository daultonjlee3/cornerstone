"use client";

import { useMemo, useState, useTransition } from "react";
import { addWorkOrderNote } from "@/app/(authenticated)/work-orders/actions";
import { Button } from "@/src/components/ui/button";

type TimelineNote = {
  id: string;
  body: string;
  note_type: string | null;
  created_at: string;
  technician_id: string | null;
};

type TimelineEvent = {
  id: string;
  action_type: string;
  performed_at: string;
  metadata: Record<string, unknown> | null;
};

type NotesTimelineProps = {
  workOrderId: string;
  technicianId: string | null;
  notes: TimelineNote[];
  events: TimelineEvent[];
  onChanged: () => void;
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatEventLabel(event: TimelineEvent): string {
  const key = event.action_type;
  if (key === "job_started") return "Work started";
  if (key === "job_paused") return "Work paused";
  if (key === "job_completed") return "Work completed";
  if (key === "work_order_photo_uploaded") return "Photo uploaded";
  if (key === "labor_logged") return "Labor logged";
  if (key === "work_order_note_added") return "Note added";
  return key.replace(/_/g, " ");
}

export function NotesTimeline({
  workOrderId,
  technicianId,
  notes,
  events,
  onChanged,
}: NotesTimelineProps) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo(() => {
    const noteEntries = notes.map((note) => ({
      id: `note-${note.id}`,
      createdAt: note.created_at,
      type: "note" as const,
      title: note.note_type === "customer_visible" ? "Customer note" : "Technician note",
      body: note.body,
      technicianId: note.technician_id,
    }));
    const eventEntries = events.map((event) => ({
      id: `event-${event.id}`,
      createdAt: event.performed_at,
      type: "event" as const,
      title: formatEventLabel(event),
      body:
        (event.metadata?.caption as string | undefined) ??
        (event.metadata?.body_excerpt as string | undefined) ??
        null,
      technicianId: (event.metadata?.technician_id as string | undefined) ?? null,
    }));
    return [...noteEntries, ...eventEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notes, events]);

  const handleAddNote = () => {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const result = await addWorkOrderNote(workOrderId, body, "internal", technicianId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDraft("");
      onChanged();
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
      <h2 className="text-sm font-semibold text-[var(--foreground)]">Job timeline & notes</h2>
      <div className="space-y-2">
        <textarea
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add execution notes for this job..."
          className="ui-textarea"
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <Button type="button" onClick={handleAddNote} disabled={pending || !draft.trim()}>
          {pending ? "Saving…" : "Add note"}
        </Button>
      </div>

      <ul className="space-y-2">
        {entries.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--card-border)] px-3 py-4 text-sm text-[var(--muted)]">
            No timeline entries yet.
          </li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--foreground)]">{entry.title}</p>
                <p className="text-xs text-[var(--muted)]">{formatDateTime(entry.createdAt)}</p>
              </div>
              {entry.body ? <p className="mt-1 text-sm text-[var(--muted-strong)]">{entry.body}</p> : null}
              <p className="mt-1 text-xs text-[var(--muted)]">
                Technician ID: {entry.technicianId ?? "not captured"}
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
