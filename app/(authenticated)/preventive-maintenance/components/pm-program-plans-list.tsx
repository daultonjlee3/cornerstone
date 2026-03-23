"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { savePMProgramPlan, updatePMProgramPlanActive } from "../actions";
import { PMProgramPlanFormModal } from "./pm-program-plan-form-modal";

type PMProgramPlan = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: string | null;
  active: boolean;
  company_name?: string | null;
  schedule_count: number;
  next_due_run: string | null;
};

type Props = {
  plans: PMProgramPlan[];
  companies: { id: string; name: string }[];
};

export function PMProgramPlansList({ plans, companies }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingPlan, setEditingPlan] = useState<PMProgramPlan | null>(null);
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    setEditingPlan(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-[var(--foreground)]">PM Program Plans</h2>
        <button
          type="button"
          onClick={() => {
            setEditingPlan(null);
            setOpen(true);
          }}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          New PM Plan
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--background)]/70 text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Schedules</th>
              <th className="px-4 py-3">Next due run</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b border-[var(--card-border)] last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/preventive-maintenance/plans/${plan.id}`} className="font-medium text-[var(--accent)] hover:underline">
                    {plan.name}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">{plan.company_name ?? ""}</p>
                </td>
                <td className="px-4 py-3 text-[var(--muted)]">{plan.category ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{plan.schedule_count}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{plan.next_due_run ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{plan.active ? "active" : "inactive"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlan(plan);
                        setOpen(true);
                      }}
                      className="text-[var(--accent)] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await updatePMProgramPlanActive(plan.id, !plan.active);
                          router.refresh();
                        })
                      }
                      className="text-[var(--foreground)] hover:underline disabled:opacity-50"
                    >
                      {plan.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? (
        <PMProgramPlanFormModal
          open={open}
          onClose={close}
          companies={companies}
          plan={editingPlan}
          saveAction={savePMProgramPlan}
        />
      ) : null}
    </div>
  );
}
