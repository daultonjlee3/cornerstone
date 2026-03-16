"use client";

import { formatDate } from "@/src/lib/date-utils";
import type { CompanyOption, TechnicianOption } from "@/src/types/common";

export type CrewRow = {
  id: string;
  name?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  crew_lead_id?: string | null;
  crew_lead_name?: string | null;
  description?: string | null;
  notes?: string | null;
  is_active?: boolean;
  updated_at?: string | null;
  member_count?: number;
  active_work_orders?: number;
};

export type CrewsListProps = {
  crews: CrewRow[];
  companies: CompanyOption[];
  technicians: TechnicianOption[];
  searchQuery: string;
};


export function CrewsList({ crews, searchQuery }: CrewsListProps) {
  return (
    <div className="space-y-4">
      {searchQuery && (
        <p className="text-sm text-[var(--muted)]">
          Showing crews matching &quot;{searchQuery}&quot;
        </p>
      )}
      {crews.length === 0 ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">
            {searchQuery ? "No crews match your search." : "No crews yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)] bg-[var(--background)]">
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Name</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Company</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Lead</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Status</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Members</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Active WOs</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)]">Updated</th>
                </tr>
              </thead>
              <tbody>
                {crews.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--background)]/50"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {c.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{c.company_name ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{c.crew_lead_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          c.is_active !== false
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-[var(--muted)]"
                        }
                      >
                        {c.is_active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] tabular-nums">
                      {c.member_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] tabular-nums">
                      {c.active_work_orders ?? 0}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatDate(c.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
