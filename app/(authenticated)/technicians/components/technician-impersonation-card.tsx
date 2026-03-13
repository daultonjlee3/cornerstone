"use client";

import { useActionState } from "react";
import { startTechnicianImpersonationAction } from "../impersonation-actions";

export function TechnicianImpersonationCard({
  technicianId,
  technicianName,
  canImpersonate,
  hasLinkedLogin,
}: {
  technicianId: string;
  technicianName: string;
  canImpersonate: boolean;
  hasLinkedLogin: boolean;
}) {
  const [state, formAction, pending] = useActionState(startTechnicianImpersonationAction, {});

  return (
    <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <h2 className="text-base font-semibold text-[var(--foreground)]">Impersonate Technician</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Open the portal as {technicianName} and return to admin without signing out.
      </p>
      {!canImpersonate ? (
        <p className="mt-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700">
          Only owner/admin users can impersonate technicians.
        </p>
      ) : null}
      {canImpersonate && !hasLinkedLogin ? (
        <p className="mt-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-700">
          This technician has no linked login user. Enable portal login first.
        </p>
      ) : null}
      {state.error ? (
        <p className="mt-2 rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs text-red-700">{state.error}</p>
      ) : null}
      <form action={formAction} className="mt-3">
        <input type="hidden" name="technician_id" value={technicianId} />
        <button
          type="submit"
          disabled={pending || !canImpersonate || !hasLinkedLogin}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Starting..." : "Impersonate Technician"}
        </button>
      </form>
    </section>
  );
}
