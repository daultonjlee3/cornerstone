"use client";

import { StatusBadge } from "@/src/components/ui/status-badge";

type WorkOrderStatusBadgeProps = {
  status: string;
};

export function WorkOrderStatusBadge({ status }: WorkOrderStatusBadgeProps) {
  return <StatusBadge status={status} />;
}
