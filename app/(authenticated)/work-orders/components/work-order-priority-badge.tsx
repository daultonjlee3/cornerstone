"use client";

import { PriorityBadge } from "@/src/components/ui/priority-badge";

type WorkOrderPriorityBadgeProps = {
  priority: string;
};

export function WorkOrderPriorityBadge({ priority }: WorkOrderPriorityBadgeProps) {
  return <PriorityBadge priority={priority} />;
}
