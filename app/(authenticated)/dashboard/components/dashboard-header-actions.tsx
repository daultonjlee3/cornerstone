"use client";

import Link from "next/link";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/ui/tooltip";
import { Button } from "@/src/components/ui/button";

export function DashboardHeaderActions() {
  return (
    <>
      <Tooltip placement="bottom">
        <TooltipTrigger>
          <Link href="/reports">
            <Button variant="secondary">Operations Reports</Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent>View operations reports</TooltipContent>
      </Tooltip>
      <Tooltip placement="bottom">
        <TooltipTrigger>
          <Link href="/dispatch">
            <Button variant="secondary">Open Dispatch</Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent>Schedule field work</TooltipContent>
      </Tooltip>
      <Tooltip placement="bottom">
        <TooltipTrigger>
          <Link href="/work-orders">
            <Button>Open Work Orders</Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent>Track maintenance tasks</TooltipContent>
      </Tooltip>
    </>
  );
}
