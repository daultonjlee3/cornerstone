"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useCallback } from "react";
import { deleteUnit } from "../actions";
import type { Unit } from "./unit-form-modal";
import { UnitFormModal } from "./unit-form-modal";
import { saveUnit } from "../actions";
import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { ActionsDropdown } from "@/src/components/ui/actions-dropdown";
import { Pagination } from "@/src/components/ui/pagination";
import {
  DataTable,
  Table,
  TableHead,
  Th,
  TBody,
  Tr,
  Td,
} from "@/src/components/ui/data-table";

type BuildingOption = { id: string; name: string };

type UnitsListProps = {
  units: Unit[];
  buildings: BuildingOption[];
  error?: string | null;
  totalCount?: number;
  page?: number;
  pageSize?: number;
};

function unitDisplayName(u: Unit): string {
  return u.unit_name ?? u.name_or_number ?? "—";
}

function buildingDisplayName(u: Unit): string {
  const b = u.building;
  if (!b) return "—";
  return (b as { building_name?: string }).building_name ?? (b as { name?: string }).name ?? "—";
}

function buildParams(searchParams: URLSearchParams, updates: Record<string, string>): string {
  const next = new URLSearchParams(searchParams.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (value === "" || value == null) next.delete(key);
    else next.set(key, value);
  });
  return next.toString();
}

export function UnitsList({
  units: initialUnits,
  buildings,
  error: initialError,
  totalCount: totalCountProp,
  page: pageProp = 1,
  pageSize: pageSizeProp = 25,
}: UnitsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const applyParams = useCallback(
    (updates: Record<string, string>) => {
      const query = buildParams(searchParams, updates);
      startTransition(() => router.push(`/units${query ? `?${query}` : ""}`));
    },
    [router, searchParams]
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete unit "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteUnit(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Unit deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingUnit(null);
    setModalOpen(true);
  };
  const openEdit = (u: Unit) => {
    setEditingUnit(u);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingUnit(null);
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
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-[var(--accent)]/10 text-[var(--accent)]"
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium text-[var(--foreground)]">Units</h2>
        <Button type="button" onClick={openNew}>
          New Unit
        </Button>
      </div>

      {initialUnits.length === 0 ? (
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">No units yet.</p>
          <Button type="button" onClick={openNew} className="mt-4">
            Add your first unit
          </Button>
        </div>
      ) : (
        <DataTable>
          <Table className="min-w-[700px]">
            <TableHead>
              <Th>Unit</Th>
              <Th>Building</Th>
              <Th>Floor</Th>
              <Th>Status</Th>
              <Th className="w-32">Actions</Th>
            </TableHead>
            <TBody>
              {initialUnits.map((u) => (
                <Tr key={u.id}>
                  <Td>{unitDisplayName(u)}</Td>
                  <Td className="text-[var(--muted)]">{buildingDisplayName(u)}</Td>
                  <Td className="text-[var(--muted)]">{u.floor ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={u.status} />
                  </Td>
                  <Td>
                    <ActionsDropdown
                      align="right"
                      items={[
                        { type: "link", label: "Create Work Order", href: `/work-orders?new=1&company_id=${encodeURIComponent((u.building as { company_id?: string })?.company_id ?? "")}&property_id=${encodeURIComponent((u.building as { property_id?: string })?.property_id ?? "")}&building_id=${encodeURIComponent(u.building_id)}&unit_id=${encodeURIComponent(u.id)}` },
                        { type: "button", label: "Edit", onClick: () => openEdit(u) },
                        { type: "button", label: "Delete", onClick: () => handleDelete(u.id, unitDisplayName(u)), disabled: isPending, destructive: true },
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

      <UnitFormModal
        open={modalOpen}
        onClose={closeModal}
        unit={editingUnit}
        buildings={buildings}
        saveAction={saveUnit}
      />
    </div>
  );
}
