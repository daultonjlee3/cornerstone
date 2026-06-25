"use client";

import Link from "next/link";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/src/components/ui/tooltip";
import { Button } from "@/src/components/ui/button";
import type { ProductProfile } from "@/src/types/fleet";
import { isFleetProductProfile } from "../../nav-config";

type DashboardHeaderActionsProps = {
  productProfile?: ProductProfile;
};

export function DashboardHeaderActions({
  productProfile = "cmms",
}: DashboardHeaderActionsProps) {
  if (isFleetProductProfile(productProfile)) {
    return (
      <>
        <Tooltip placement="bottom">
          <TooltipTrigger>
            <Link href="/reports/operations">
              <Button variant="secondary">Fleet Performance</Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Utilization and revenue analytics</TooltipContent>
        </Tooltip>
        <Tooltip placement="bottom">
          <TooltipTrigger>
            <Link href="/dispatch">
              <Button variant="secondary">Dispatch Intelligence</Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Open dispatch board</TooltipContent>
        </Tooltip>
        <Tooltip placement="bottom">
          <TooltipTrigger>
            <Link href="/operations?focus=exceptions">
              <Button variant="secondary">Exceptions</Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Review operational exceptions</TooltipContent>
        </Tooltip>
        <Tooltip placement="bottom">
          <TooltipTrigger>
            <Link href="/operations?focus=recommendations">
              <Button>Recommendations</Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>Review pending fleet recommendations</TooltipContent>
        </Tooltip>
      </>
    );
  }

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
