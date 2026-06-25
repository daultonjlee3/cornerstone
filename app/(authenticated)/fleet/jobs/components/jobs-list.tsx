"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useCallback } from "react";
import { deleteFleetJob, saveFleetJob } from "../../actions";
import type { FleetJob } from "./job-form-modal";
import { JobFormModal } from "./job-form-modal";
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

type JobRow = FleetJob & {
  branch_name?: string | null;
  site_name?: string | null;
  external_source_id?: string | null;
  job_source?: string;
};

type JobsListProps = {
  jobs: JobRow[];
  branches: { id: string; name: string }[];
  sites: { id: string; name: string }[];
  trucks: { id: string; unit_number: string }[];
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function JobsList({
  jobs: initialJobs,
  branches,
  sites,
  trucks,
  error: initialError,
  totalCount: totalCountProp,
  page: pageProp = 1,
  pageSize: pageSizeProp = 25,
}: JobsListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const applyParams = useCallback(
    (updates: Record<string, string>) => {
      const query = buildParams(searchParams, updates);
      startTransition(() => {
        router.push(`/fleet/jobs${query ? `?${query}` : ""}`);
      });
    },
    [router, searchParams]
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<FleetJob | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const unassignedCount = initialJobs.filter((job) => !job.assigned_truck_id).length;
  const webhookCount = initialJobs.filter((job) => job.job_source === "Webhook").length;
  const totalRevenue = initialJobs.reduce((sum, job) => sum + (job.revenue_estimate ?? 0), 0);

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete job "${title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteFleetJob(id);
      if (result.error) setMessage({ type: "error", text: result.error });
      else {
        setMessage({ type: "success", text: "Job deleted." });
        router.refresh();
      }
    });
  };

  const openNew = () => {
    setEditingJob(null);
    setModalOpen(true);
  };
  const openEdit = (j: FleetJob) => {
    setEditingJob(j);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditingJob(null);
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
        <KpiCard label="Visible jobs" value={initialJobs.length} hint="Current page" />
        <KpiCard label="Unassigned jobs" value={unassignedCount} hint="Pending dispatch" emphasis={unassignedCount > 0 ? "warning" : "default"} />
        <KpiCard label="Webhook jobs" value={webhookCount} hint="Integrated intake" emphasis="info" />
        <KpiCard label="Revenue scope" value={formatCurrency(totalRevenue)} hint="Visible rows" emphasis="success" />
      </div>

      <SectionHeader
        title="Dispatch job ledger"
        description="Priority, revenue, source, and assignment details for operational scheduling."
        action={
          <div className="flex items-center gap-2">
            <StatusChip label={`${sites.length} sites`} tone="neutral" showDot={false} />
            <StatusChip label={`${trucks.length} trucks`} tone="neutral" showDot={false} />
            <Button type="button" onClick={openNew}>
              New Job
            </Button>
          </div>
        }
      />

      {initialJobs.length === 0 ? (
        <EmptyState
          title="No fleet jobs yet"
          description="Create jobs manually or ingest them from integrations to activate dispatch intelligence."
          action={
            <Button type="button" onClick={openNew}>
              Add your first job
            </Button>
          }
        />
      ) : (
        <DataTable className="shadow-[var(--elevation-1)]">
          <Table className="min-w-[700px]">
            <TableHead>
              <Th>Title</Th>
              <Th>Source</Th>
              <Th>External ID</Th>
              <Th>Branch</Th>
              <Th>Site</Th>
              <Th>Status</Th>
              <Th>Revenue</Th>
              <Th className="w-24">Actions</Th>
            </TableHead>
            <TBody>
              {initialJobs.map((j) => (
                <Tr key={j.id}>
                  <Td>{j.title}</Td>
                  <Td className="text-[var(--muted)] text-sm">{j.job_source ?? "Manual"}</Td>
                  <Td className="text-[var(--muted)] text-sm font-mono text-xs">
                    {j.external_source_id ?? "—"}
                  </Td>
                  <Td className="text-[var(--muted)]">{j.branch_name ?? "—"}</Td>
                  <Td className="text-[var(--muted)]">{j.site_name ?? "—"}</Td>
                  <Td>
                    <StatusBadge status={j.status} />
                  </Td>
                  <Td className="text-[var(--muted)]">{formatCurrency(j.revenue_estimate)}</Td>
                  <Td>
                    <ActionsDropdown
                      align="right"
                      items={[
                        { type: "button", label: "Edit", onClick: () => openEdit(j) },
                        {
                          type: "button",
                          label: "Delete",
                          onClick: () => handleDelete(j.id, j.title),
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

      <JobFormModal
        open={modalOpen}
        onClose={closeModal}
        job={editingJob}
        branches={branches}
        sites={sites}
        trucks={trucks}
        saveAction={saveFleetJob}
      />
    </div>
  );
}
