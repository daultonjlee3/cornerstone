"use client";

import { Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { StatusBadge } from "@/src/components/ui/status-badge";
import type { DispatchWorkforce } from "../dispatch-data";
import { WorkloadPanel } from "./WorkloadPanel";

type DispatchWorkforcePanelProps = {
  workforce: DispatchWorkforce;
};

function capacityTone(value: number): string {
  if (value < 0) return "text-red-600";
  if (value <= 1.5) return "text-amber-600";
  return "text-emerald-600";
}

export function DispatchWorkforcePanel({ workforce }: DispatchWorkforcePanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <WorkloadPanel
        title="Technician workload"
        description="Assigned jobs, active jobs, estimated hours today, and crew membership."
        tableClassName="max-h-[360px] overflow-auto"
      >
        <Table className="min-w-[640px]">
          <TableHead>
            <Th>Technician</Th>
            <Th>Status</Th>
            <Th>Assigned</Th>
            <Th>Today</Th>
            <Th>Active</Th>
            <Th>Capacity</Th>
          </TableHead>
          <TBody>
            {workforce.technicians.map((technician) => (
              <Tr key={technician.id}>
                <Td>
                  <p className="font-medium">{technician.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {technician.crewMemberships.length > 0
                      ? technician.crewMemberships.join(", ")
                      : "No crew membership"}
                  </p>
                </Td>
                <Td>
                  <StatusBadge status={technician.status} />
                </Td>
                <Td className="text-[var(--muted)]">{technician.currentAssignments}</Td>
                <Td className="text-[var(--muted)]">{technician.scheduledToday}</Td>
                <Td className="text-[var(--muted)]">{technician.inProgress}</Td>
                <Td>
                  <p className={`text-sm font-semibold ${capacityTone(technician.availableCapacityHours)}`}>
                    {technician.availableCapacityHours.toFixed(1)}h remaining
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Capacity {technician.dailyCapacityHours.toFixed(1)}h · Assigned{" "}
                    {technician.workloadHoursToday.toFixed(1)}h
                  </p>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </WorkloadPanel>

      <WorkloadPanel
        title="Crew workload"
        description="Members, assignments, total scheduled hours, and available capacity."
        tableClassName="max-h-[320px] overflow-auto"
      >
        <Table className="min-w-[720px]">
          <TableHead>
            <Th>Crew</Th>
            <Th>Members</Th>
            <Th>Assigned</Th>
            <Th>Today</Th>
            <Th>Active</Th>
            <Th>Capacity model</Th>
          </TableHead>
          <TBody>
            {workforce.crews.map((crew) => (
              <Tr key={crew.id} className={crew.availableCapacityHours < 0 ? "bg-red-50/70" : ""}>
                <Td className="font-medium">{crew.name}</Td>
                <Td>
                  <p className="text-[var(--muted)]">{crew.memberCount}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {crew.memberNames.length > 0 ? crew.memberNames.join(", ") : "No members"}
                  </p>
                </Td>
                <Td className="text-[var(--muted)]">{crew.currentAssignments}</Td>
                <Td className="text-[var(--muted)]">{crew.scheduledToday}</Td>
                <Td className="text-[var(--muted)]">{crew.activeJobs}</Td>
                <Td>
                  <p className={`text-sm font-semibold ${capacityTone(crew.availableCapacityHours)}`}>
                    {crew.availableCapacityHours.toFixed(1)}h remaining
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Capacity {crew.dailyCapacityHours.toFixed(1)}h · Assigned{" "}
                    {crew.workloadHoursToday.toFixed(1)}h
                  </p>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </WorkloadPanel>
    </div>
  );
}
