"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveWorkRequest, convertWorkRequestToWorkOrder, rejectWorkRequest } from "../actions";
import { Button } from "@/src/components/ui/button";
import { DataTable, Table, TableHead, TBody, Tr, Th, Td } from "@/src/components/ui/data-table";
import { ActionsDropdown } from "@/src/components/ui/actions-dropdown";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { PriorityBadge } from "@/src/components/ui/priority-badge";

export type WorkRequestListItem = {
  id: string;
  tenant_id: string;
  company_id: string | null;
  requester_name: string;
  requester_email: string;
  location: string;
  asset_id: string | null;
  asset_name: string | null;
  description: string;
  priority: string;
  photo_url: string | null;
  status: string;
  created_at: string;
  company_name: string | null;
  linked_work_order_id: string | null;
  linked_work_order_number: string | null;
  linked_work_order_status: string | null;
  linked_work_order_scheduled_date: string | null;
  linked_work_order_completed_at: string | null;
};

const PAGE_SIZE = 10;

function deriveTrackingStatus(request: WorkRequestListItem): string {
  const linkedStatus = String(request.linked_work_order_status ?? "").toLowerCase();
  if (linkedStatus === "completed" || linkedStatus === "closed") return "completed";
  if (
    linkedStatus === "scheduled" ||
    linkedStatus === "in_progress" ||
    linkedStatus === "on_hold" ||
    linkedStatus === "ready_to_schedule" ||
    linkedStatus === "new" ||
    linkedStatus === "open" ||
    linkedStatus === "assigned"
  ) {
    return "scheduled";
  }
  if (request.status === "converted_to_work_order") return "approved";
  return request.status;
}

export function RequestsList({ requests }: { requests: WorkRequestListItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((request) => {
      const haystack = [
        request.requester_name,
        request.requester_email,
        request.location,
        request.asset_name ?? "",
        request.company_name ?? "",
        request.description,
        request.linked_work_order_number ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesStatus = !statusFilter || request.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, requests, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const runAction = (
    fn: (id: string) => Promise<{ error?: string; success?: boolean; workOrderId?: string }>,
    id: string,
    successText: string
  ) => {
    startTransition(async () => {
      const result = await fn(id);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "success", text: successText });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.type === "error" ? "bg-red-500/10 text-red-700" : "bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3" data-tour="requests:filters">
        <div className="flex min-w-[280px] flex-1 flex-wrap items-end gap-2">
          <label className="w-full max-w-sm">
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Search</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              className="ui-input"
              placeholder="Requester, location, asset, description, WO #"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-[var(--muted)]">Status</span>
            <select
              className="ui-select"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="converted_to_work_order">Converted</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
        <Link href="/requests/submit">
          <Button>+ New Request</Button>
        </Link>
      </div>

      <div data-tour="requests:table">
        <DataTable>
        <Table className="min-w-[1120px]">
          <TableHead>
            <Th>Requester</Th>
            <Th>Location / Asset</Th>
            <Th>Priority</Th>
            <Th>Status</Th>
            <Th>Tracking</Th>
            <Th>Linked WO</Th>
            <Th>Created</Th>
            <Th className="w-64">Actions</Th>
          </TableHead>
          <TBody>
            {pageRows.length === 0 ? (
              <Tr>
                <td className="px-4 py-3.5 text-center text-[var(--muted)]" colSpan={8}>
                  No requests found.
                </td>
              </Tr>
            ) : null}

            {pageRows.map((request) => {
              const tracking = deriveTrackingStatus(request);
              const canApprove =
                request.status === "submitted" || request.status === "converted_to_work_order";
              const canReject = request.status === "submitted" || request.status === "approved";
              const canConvert = request.status === "submitted" || request.status === "approved";

              return (
                <Tr
                  key={request.id}
                  data-demo-scenario-target="request-row"
                  data-work-request-id={request.id}
                >
                  <Td>
                    <p className="font-medium text-[var(--foreground)]">{request.requester_name}</p>
                    <p className="text-xs text-[var(--muted)]">{request.requester_email}</p>
                    {request.company_name ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">{request.company_name}</p>
                    ) : null}
                  </Td>
                  <Td>
                    <p className="text-[var(--foreground)]">{request.location}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {request.asset_name ?? "No asset linked"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{request.description}</p>
                  </Td>
                  <Td>
                    <PriorityBadge priority={request.priority} />
                  </Td>
                  <Td>
                    <StatusBadge status={request.status} />
                  </Td>
                  <Td>
                    <StatusBadge status={tracking} />
                  </Td>
                  <Td>
                    {request.linked_work_order_id ? (
                      <Link
                        href={`/work-orders/${request.linked_work_order_id}`}
                        className="text-sm font-medium text-[var(--accent)] hover:underline"
                      >
                        {request.linked_work_order_number ??
                          request.linked_work_order_id.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">Not converted</span>
                    )}
                  </Td>
                  <Td className="text-xs text-[var(--muted)]">
                    {new Date(request.created_at).toLocaleString()}
                  </Td>
                  <Td>
                    <ActionsDropdown
                      align="right"
                      items={[
                        { type: "button", label: "Approve", onClick: () => runAction(approveWorkRequest, request.id, "Request approved."), disabled: pending || !canApprove },
                        { type: "button", label: "Reject", onClick: () => runAction(rejectWorkRequest, request.id, "Request rejected."), disabled: pending || !canReject },
                        { type: "button", label: "Convert to WO", onClick: () => runAction(convertWorkRequestToWorkOrder, request.id, "Request converted to work order."), disabled: pending || !canConvert },
                      ]}
                    />
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </DataTable>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--muted)]">
          Showing {(currentPage - 1) * PAGE_SIZE + (pageRows.length ? 1 : 0)}-
          {(currentPage - 1) * PAGE_SIZE + pageRows.length} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-[var(--muted)]">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
