"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useCallback } from "react";
import { deleteBranch, saveBranch } from "../actions";
import type { Branch } from "./branch-form-modal";
import { BranchFormModal } from "./branch-form-modal";
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

type BranchRow = Branch & { company_name?: string | null };

type BranchesListProps = {
  branches: BranchRow[];
  companies: { id: string; name: string }[];
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

export function BranchesList({
  branches: initialBranches,
  companies,
  error: initialError,
  totalCount: totalCountProp,
  page: pageProp = 1,
  pageSize: pageSizeProp = 25,
}: BranchesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const applyParams = useCallback(
    (updates: Record<string, string>) => {
      const query = buildParams(searchParams, updates);
      startTransition(() => {
        router.push(`/branches${query ? `?${query}` : ""}`);
      });
    },
    [router, searchParams]
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const activeCount = initialBranches.filter((branch) => branch.status === "active").length;
  const inactiveCount = initialBranches.length - activeCount;

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete branch "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteBranch(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Branch deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingBranch(null);
    setModalOpen(true);
  };
  const openEdit = (b: Branch) => {
    setEditingBranch(b);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingBranch(null);
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
        <KpiCard label="Visible branches" value={initialBranches.length} hint="Current page" />
        <KpiCard label="Active branches" value={activeCount} hint="Operational" emphasis="success" />
        <KpiCard label="Inactive branches" value={inactiveCount} hint="Non-operational" emphasis={inactiveCount > 0 ? "warning" : "default"} />
        <KpiCard label="Companies" value={companies.length} hint="Mapped ownership" />
      </div>

      <SectionHeader
        title="Branch directory"
        description="Depot records, jurisdiction, and operational status for fleet coverage."
        action={
          <div className="flex items-center gap-2">
            <StatusChip label={`${companies.length} companies`} tone="neutral" showDot={false} />
            <Button type="button" onClick={openNew}>
              New Branch
            </Button>
          </div>
        }
      />

      {initialBranches.length === 0 ? (
        <EmptyState
          title="No branches yet"
          description="Add at least one branch to route jobs, compute capacity, and enable branch-level dispatch intelligence."
          action={
            <Button type="button" onClick={openNew}>
              Add your first branch
            </Button>
          }
        />
      ) : (
        <DataTable className="shadow-[var(--elevation-1)]">
          <Table className="min-w-[600px]">
            <TableHead>
              <Th>Name</Th>
              <Th>Code</Th>
              <Th>Company</Th>
              <Th>Location</Th>
              <Th>Status</Th>
              <Th className="w-24">Actions</Th>
            </TableHead>
            <TBody>
              {initialBranches.map((b) => (
                <Tr key={b.id}>
                  <Td>{b.name}</Td>
                  <Td className="text-[var(--muted)]">{b.code ?? "—"}</Td>
                  <Td className="text-[var(--muted)]">{b.company_name ?? "—"}</Td>
                  <Td className="text-[var(--muted)]">
                    {[b.city, b.state].filter(Boolean).join(", ") || "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={b.status} />
                  </Td>
                  <Td>
                    <ActionsDropdown
                      align="right"
                      items={[
                        { type: "button", label: "Edit", onClick: () => openEdit(b) },
                        {
                          type: "button",
                          label: "Delete",
                          onClick: () => handleDelete(b.id, b.name),
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

      <BranchFormModal
        open={modalOpen}
        onClose={closeModal}
        branch={editingBranch}
        companies={companies}
        saveAction={saveBranch}
      />
    </div>
  );
}
