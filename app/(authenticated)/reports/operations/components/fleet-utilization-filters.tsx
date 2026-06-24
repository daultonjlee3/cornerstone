"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/src/components/ui/button";

type FleetUtilizationFiltersProps = {
  from: string;
  to: string;
  branchId?: string | null;
  truckId?: string | null;
  branches: Array<{ id: string; name: string }>;
  trucks: Array<{ id: string; unit_number: string }>;
};

export function FleetUtilizationFilters({
  from,
  to,
  branchId,
  truckId,
  branches,
  trucks,
}: FleetUtilizationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const apply = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value == null || value === "") next.delete(key);
        else next.set(key, value);
      }
      router.push(`/reports/operations?${next.toString()}`);
    },
    [router, searchParams]
  );

  const exportHref = `/api/fleet/utilization/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${
    branchId ? `&branch_id=${encodeURIComponent(branchId)}` : ""
  }${truckId ? `&truck_id=${encodeURIComponent(truckId)}` : ""}`;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)]/50 p-4">
      <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
        From
        <input
          type="date"
          defaultValue={from}
          className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1.5 text-sm"
          onChange={(e) => apply({ from: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
        To
        <input
          type="date"
          defaultValue={to}
          className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1.5 text-sm"
          onChange={(e) => apply({ to: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
        Branch
        <select
          defaultValue={branchId ?? ""}
          className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1.5 text-sm"
          onChange={(e) => apply({ branch_id: e.target.value || null })}
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-[var(--muted)]">
        Truck
        <select
          defaultValue={truckId ?? ""}
          className="rounded border border-[var(--card-border)] bg-[var(--background)] px-2 py-1.5 text-sm"
          onChange={(e) => apply({ truck_id: e.target.value || null })}
        >
          <option value="">All trucks</option>
          {trucks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.unit_number}
            </option>
          ))}
        </select>
      </label>
      <a href={exportHref} className="ml-auto">
        <Button type="button" variant="secondary" size="sm">
          Export CSV
        </Button>
      </a>
    </div>
  );
}
