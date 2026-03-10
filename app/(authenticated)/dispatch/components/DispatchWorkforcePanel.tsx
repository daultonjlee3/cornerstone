"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { StatusBadge } from "@/src/components/ui/status-badge";
import type { DispatchWorkforce } from "../dispatch-data";

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
      <Card className="min-h-0 flex-1">
        <CardHeader>
          <CardTitle>Technician workload</CardTitle>
          <CardDescription>Assignments, active jobs, and crew memberships</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable className="max-h-[360px] overflow-auto shadow-none">
            <Table className="min-w-[560px]">
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
                      <p className={`text-sm font-medium ${capacityTone(technician.availableCapacityHours)}`}>
                        {technician.availableCapacityHours.toFixed(1)}h
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {technician.workloadHoursToday.toFixed(1)}h planned
                      </p>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </DataTable>
        </CardContent>
      </Card>

      <Card className="min-h-0 flex-1">
        <CardHeader>
          <CardTitle>Crew workload</CardTitle>
          <CardDescription>Team capacity and assignment pressure</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable className="max-h-[320px] overflow-auto shadow-none">
            <Table className="min-w-[560px]">
              <TableHead>
                <Th>Crew</Th>
                <Th>Members</Th>
                <Th>Assigned</Th>
                <Th>Today</Th>
                <Th>Active</Th>
                <Th>Capacity</Th>
              </TableHead>
              <TBody>
                {workforce.crews.map((crew) => (
                  <Tr key={crew.id}>
                    <Td>{crew.name}</Td>
                    <Td>
                      <p className="text-[var(--muted)]">{crew.memberCount}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {crew.memberNames.length > 0
                          ? crew.memberNames.slice(0, 2).join(", ")
                          : "No members"}
                      </p>
                    </Td>
                    <Td className="text-[var(--muted)]">{crew.currentAssignments}</Td>
                    <Td className="text-[var(--muted)]">{crew.scheduledToday}</Td>
                    <Td className="text-[var(--muted)]">{crew.activeJobs}</Td>
                    <Td>
                      <p className={`text-sm font-medium ${capacityTone(crew.availableCapacityHours)}`}>
                        {crew.availableCapacityHours.toFixed(1)}h
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {crew.workloadHoursToday.toFixed(1)}h planned
                      </p>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}
