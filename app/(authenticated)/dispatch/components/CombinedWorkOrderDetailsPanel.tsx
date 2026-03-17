"use client";

import { Button } from "@/src/components/ui/button";
import { StatusBadge } from "@/src/components/ui/status-badge";
import type { DispatchWorkOrder } from "../types";
import type { DispatchTechnicianWorkload } from "../dispatch-data";
import { DispatchSpeedActions } from "./DispatchSpeedActions";
import { SuggestedTechniciansPanel } from "./SuggestedTechniciansPanel";

function locationLine(workOrder: DispatchWorkOrder): string {
  const pieces = [
    workOrder.property_name,
    workOrder.building_name,
    workOrder.unit_name,
    workOrder.location,
  ].filter(Boolean);
  return pieces.join(" / ") || "—";
}

export type CombinedWorkOrderDetailsPanelProps = {
  selectedWorkOrder: DispatchWorkOrder | null;
  technicians: DispatchTechnicianWorkload[];
  workOrders: DispatchWorkOrder[];
  selectedDate: string;
  onAssign: (workOrderId: string, technicianId: string) => void;
  assigning?: boolean;
  onOpenWorkOrder: (workOrderId: string) => void;
};

export function CombinedWorkOrderDetailsPanel({
  selectedWorkOrder,
  technicians,
  workOrders,
  selectedDate,
  onAssign,
  assigning = false,
  onOpenWorkOrder,
}: CombinedWorkOrderDetailsPanelProps) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
      <div className="shrink-0 border-b border-[var(--card-border)] px-2.5 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Work order details
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!selectedWorkOrder ? (
          <p className="py-4 text-center text-xs text-[var(--muted)]">
            Select a work order from the map or queue.
          </p>
        ) : (
          <div className="space-y-2">
            <div>
              <p className="text-xs font-semibold text-[var(--foreground)]">
                {selectedWorkOrder.work_order_number
                  ? `${selectedWorkOrder.work_order_number} · ${selectedWorkOrder.title ?? "Work order"}`
                  : selectedWorkOrder.title ?? "Work order"}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {selectedWorkOrder.priority ? (
                  <span className="rounded border border-[var(--card-border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-medium">
                    {String(selectedWorkOrder.priority)}
                  </span>
                ) : null}
                {selectedWorkOrder.status ? (
                  <StatusBadge status={selectedWorkOrder.status} />
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted)]" title={locationLine(selectedWorkOrder)}>
                {locationLine(selectedWorkOrder)}
              </p>
            </div>
            <DispatchSpeedActions
              selectedWorkOrder={selectedWorkOrder}
              technicians={technicians}
              onAssign={onAssign}
              assigning={assigning}
            />
            <SuggestedTechniciansPanel
              selectedWorkOrder={selectedWorkOrder}
              technicians={technicians}
              workOrders={workOrders}
              selectedDate={selectedDate}
              onAssign={onAssign}
              assigning={assigning}
            />
            <Button
              variant="secondary"
              size="sm"
              className="h-7 w-full text-[11px]"
              onClick={() => onOpenWorkOrder(selectedWorkOrder.id)}
            >
              Open work order
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
