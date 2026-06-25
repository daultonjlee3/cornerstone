"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useCallback } from "react";
import { deleteTruck, saveTruck } from "../../actions";
import type { Truck } from "./truck-form-modal";
import { TruckFormModal } from "./truck-form-modal";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { ActionsDropdown } from "@/src/components/ui/actions-dropdown";
import { Pagination } from "@/src/components/ui/pagination";
import { EmptyState, KpiCard, SectionHeader, StatusChip } from "@/src/components/design-system";
import {
  DataTable,
  Table,
  TableHead,
  Th,
  TBody,
  Tr,
  Td,
} from "@/src/components/ui/data-table";

type TruckRow = Truck & {
  branch_name?: string | null;
  last_telematics_at?: string | null;
  telematics_status?: "online" | "stale" | "offline";
  latest_latitude?: number | null;
  latest_longitude?: number | null;
};

type TrucksListProps = {
  trucks: TruckRow[];
  branches: { id: string; name: string }[];
  error?: string | null;
  totalCount?: number;
  page?: number;
  pageSize?: number;
};

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return "—";
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

const TELEMATICS_LABELS = {
  online: "Online",
  stale: "Stale",
  offline: "Offline",
} as const;

function buildParams(searchParams: URLSearchParams, updates: Record<string, string>): string {
  const next = new URLSearchParams(searchParams.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (value === "" || value == null) next.delete(key);
    else next.set(key, value);
  });
  return next.toString();
}

export function TrucksList({
  trucks: initialTrucks,
  branches,
  error: initialError,
  totalCount: totalCountProp,
  page: pageProp = 1,
  pageSize: pageSizeProp = 25,
}: TrucksListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const applyParams = useCallback(
    (updates: Record<string, string>) => {
      const query = buildParams(searchParams, updates);
      startTransition(() => {
        router.push(`/fleet/trucks${query ? `?${query}` : ""}`);
      });
    },
    [router, searchParams]
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const onlineCount = initialTrucks.filter((truck) => truck.telematics_status === "online").length;
  const staleCount = initialTrucks.filter((truck) => truck.telematics_status === "stale").length;
  const offlineCount = initialTrucks.length - onlineCount - staleCount;

  const handleDelete = (id: string, unitNumber: string) => {
    if (!confirm(`Delete truck "${unitNumber}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteTruck(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Truck deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingTruck(null);
    setModalOpen(true);
  };
  const openEdit = (t: Truck) => {
    setEditingTruck(t);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingTruck(null);
    router.refresh();
  };

  if (initialError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{initialError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message && (
        <div
          className={`rounded-[var(--radius-lg)] border px-4 py-2 text-sm ${
            message.type === "error"
              ? "border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)] bg-[var(--status-danger-subtle)] text-[var(--status-danger)]"
              : "border-[color-mix(in_srgb,var(--status-success)_25%,transparent)] bg-[var(--status-success-subtle)] text-[var(--status-success)]"
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Visible trucks" value={initialTrucks.length} hint="Current page" />
        <KpiCard label="GPS online" value={onlineCount} hint="Live telemetry" emphasis="success" />
        <KpiCard label="GPS stale" value={staleCount} hint="Sync risk" emphasis={staleCount > 0 ? "warning" : "default"} />
        <KpiCard label="Offline" value={offlineCount} hint="Needs investigation" emphasis={offlineCount > 0 ? "danger" : "default"} />
      </div>

      <SectionHeader
        title="Truck registry"
        description="Vehicle records, branch assignment, and telematics health."
        action={
          <div className="flex items-center gap-2">
            <StatusChip label={`${branches.length} branches`} tone="neutral" showDot={false} />
            <Button type="button" onClick={openNew}>
              New Truck
            </Button>
          </div>
        }
      />

      {initialTrucks.length === 0 ? (
        <EmptyState
          title="No trucks yet"
          description="Create your first truck record to unlock dispatch recommendations and utilization tracking."
          action={
            <Button type="button" onClick={openNew}>
              Add your first truck
            </Button>
          }
        />
      ) : (
        <DataTable className="shadow-[var(--elevation-1)]">
          <Table className="min-w-[600px]">
            <TableHead>
              <Th>Unit #</Th>
              <Th>Type</Th>
              <Th>Branch</Th>
              <Th>GPS</Th>
              <Th>Last GPS</Th>
              <Th>Status</Th>
              <Th className="w-24">Actions</Th>
            </TableHead>
            <TBody>
              {initialTrucks.map((t) => (
                <Tr key={t.id}>
                  <Td>{t.unit_number}</Td>
                  <Td className="text-[var(--muted)]">{t.truck_type}</Td>
                  <Td className="text-[var(--muted)]">{t.branch_name ?? "—"}</Td>
                  <Td>
                    <span
                      className={
                        t.telematics_status === "online"
                          ? "text-emerald-600 dark:text-emerald-400 text-sm"
                          : t.telematics_status === "stale"
                            ? "text-amber-600 dark:text-amber-400 text-sm"
                            : "text-[var(--muted)] text-sm"
                      }
                      title={
                        t.latest_latitude != null && t.latest_longitude != null
                          ? `${t.latest_latitude.toFixed(4)}, ${t.latest_longitude.toFixed(4)}`
                          : undefined
                      }
                    >
                      {t.telematics_status
                        ? TELEMATICS_LABELS[t.telematics_status]
                        : "Offline"}
                    </span>
                  </Td>
                  <Td className="text-[var(--muted)] text-sm">
                    {formatRelativeTime(t.last_telematics_at)}
                  </Td>
                  <Td>
                    <StatusBadge status={t.status} />
                  </Td>
                  <Td>
                    <ActionsDropdown
                      align="right"
                      items={[
                        { type: "button", label: "Edit", onClick: () => openEdit(t) },
                        {
                          type: "button",
                          label: "Delete",
                          onClick: () => handleDelete(t.id, t.unit_number),
                          disabled: isPending,
                          destructive: true,
                        },
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          {totalCountProp != null && (
            <Pagination
              page={pageProp}
              pageSize={pageSizeProp}
              totalCount={totalCountProp}
              onPageChange={(p) => applyParams({ page: String(p) })}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageSizeChange={(size) => applyParams({ page_size: String(size), page: "1" })}
            />
          )}
        </DataTable>
      )}

      <TruckFormModal
        open={modalOpen}
        onClose={closeModal}
        truck={editingTruck}
        branches={branches}
        saveAction={saveTruck}
      />
    </div>
  );
}
