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
import {
  DataTable,
  Table,
  TableHead,
  Th,
  TBody,
  Tr,
  Td,
} from "@/src/components/ui/data-table";

type TruckRow = Truck & { branch_name?: string | null };

type TrucksListProps = {
  trucks: TruckRow[];
  branches: { id: string; name: string }[];
  error?: string | null;
  totalCount?: number;
  page?: number;
  pageSize?: number;
};

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
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-lg font-medium text-[var(--foreground)]">Trucks</h2>
        <Button type="button" onClick={openNew}>
          New Truck
        </Button>
      </div>

      {initialTrucks.length === 0 ? (
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">No trucks yet.</p>
          <Button type="button" onClick={openNew} className="mt-4">
            Add your first truck
          </Button>
        </div>
      ) : (
        <DataTable>
          <Table className="min-w-[600px]">
            <TableHead>
              <Th>Unit #</Th>
              <Th>Type</Th>
              <Th>Branch</Th>
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
