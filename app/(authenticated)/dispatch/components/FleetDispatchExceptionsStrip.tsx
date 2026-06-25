"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FleetOperationalException } from "@/src/types/fleet";
import { groupExceptions, scrollToSection } from "./fleet-dispatch-utils";

type FleetDispatchExceptionsStripProps = {
  exceptions: FleetOperationalException[];
};

function severityBorder(severity: FleetOperationalException["severity"]): string {
  switch (severity) {
    case "critical":
      return "border-l-[var(--status-danger)]";
    case "warning":
      return "border-l-[var(--status-warning)]";
    default:
      return "border-l-[var(--surface-border-subtle)]";
  }
}

function severityText(severity: FleetOperationalException["severity"]): string {
  switch (severity) {
    case "critical":
      return "text-[var(--status-danger)]";
    case "warning":
      return "text-[var(--status-warning)]";
    default:
      return "text-[var(--foreground)]";
  }
}

export function FleetDispatchExceptionsStrip({ exceptions }: FleetDispatchExceptionsStripProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const groups = groupExceptions(exceptions);

  if (groups.length === 0) return null;

  const criticalCount = exceptions.filter((e) => e.severity === "critical").length;
  const warningCount = exceptions.filter((e) => e.severity === "warning").length;

  return (
    <div id="fleet-exceptions" className="border-b border-[var(--surface-border-subtle)]">
      <button
        type="button"
        className="flex w-full items-center justify-between px-2 py-1.5 text-left"
        onClick={() => setPanelOpen((v) => !v)}
      >
        <p className="text-[11px] text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">Exceptions</span>
          {" · "}
          {criticalCount > 0 ? (
            <span className="font-semibold text-[var(--status-danger)]">{criticalCount} critical</span>
          ) : null}
          {criticalCount > 0 && warningCount > 0 ? ", " : null}
          {warningCount > 0 ? (
            <span className="text-[var(--status-warning)]">{warningCount} warning</span>
          ) : null}
          {criticalCount === 0 && warningCount === 0 ? (
            <span>{exceptions.length} info</span>
          ) : null}
        </p>
        <ChevronDown
          className={`size-3.5 text-[var(--muted)] transition ${panelOpen ? "rotate-180" : ""}`}
        />
      </button>

      {panelOpen ? (
        <div className="space-y-1 border-t border-[var(--surface-border-subtle)] px-2 pb-2 pt-1">
          {groups.map((group) => (
            <ExceptionGroup key={group.category} group={group} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ExceptionGroup({
  group,
}: {
  group: ReturnType<typeof groupExceptions>[number];
}) {
  const [open, setOpen] = useState(false);
  const top = group.items[0];

  return (
    <div
      className={`rounded-md border border-[var(--surface-border-subtle)] border-l-[3px] bg-[var(--surface-default)]/72 shadow-[var(--elevation-1)] ${severityBorder(group.severity)}`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronDown
          className={`size-3 shrink-0 text-[var(--muted)] transition ${open ? "rotate-180" : "-rotate-90"}`}
        />
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold ${severityText(group.severity)}`}>
            {group.label}
            <span className="ml-1 font-normal text-[var(--muted)]">({group.count})</span>
          </p>
          {!open && top ? (
            <p className="truncate text-[10px] text-[var(--muted)]">{top.title}</p>
          ) : null}
        </div>
      </button>

      {open ? (
        <ul className="space-y-0.5 border-t border-[var(--surface-border-subtle)] px-2 pb-1.5 pt-1">
          {group.items.slice(0, 4).map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                className="w-full rounded px-1.5 py-1 text-left transition hover:bg-[var(--background)]"
                onClick={() => {
                  if (ex.href.startsWith("#")) scrollToSection(ex.href.slice(1));
                  else if (ex.href.startsWith("/dispatch")) scrollToSection("fleet-job-queue");
                }}
              >
                <p className="text-[11px] font-medium text-[var(--foreground)]">{ex.title}</p>
                <p className="text-[10px] text-[var(--muted)]">{ex.whyItMatters}</p>
                <p className="text-[10px] font-medium text-[var(--accent)]">→ {ex.recommendedAction}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
