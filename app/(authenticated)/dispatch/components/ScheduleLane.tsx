"use client";

import { useDroppable } from "@dnd-kit/core";
import { DAY_START_HOUR, DEFAULT_AVAILABLE_HOURS, getSlotId } from "./dispatch-board-utils";

type ScheduleLaneProps = {
  id: string;
  name: string;
  selectedDate: string;
  totalScheduledHours: number;
  jobCount: number;
  /** When provided, used instead of DEFAULT_AVAILABLE_HOURS - totalScheduledHours for remaining. */
  remainingHours?: number;
  overDropId: string | null;
  isDraggingWorkOrder: boolean;
  timeLabels: { hour: number; label: string }[];
  currentTime?: { hour: number; minute: number } | null;
  children: React.ReactNode;
};

function LaneSlot({
  laneId,
  hour,
  hourIndex,
  selectedDate,
  isOver,
  showCurrentLine,
  currentMinute,
}: {
  laneId: string;
  hour: number;
  hourIndex: number;
  selectedDate: string;
  isOver: boolean;
  showCurrentLine: boolean;
  currentMinute: number;
}) {
  const { setNodeRef } = useDroppable({
    id: getSlotId(laneId, hour),
    data: { crewId: laneId, date: selectedDate, defaultHour: hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-[30px] flex-1 border-b border-[var(--card-border)]/80 transition-colors ${
        hourIndex % 2 === 0 ? "bg-[var(--card)]/30" : "bg-[var(--background)]"
      } ${isOver ? "bg-[var(--accent)]/12 ring-1 ring-inset ring-[var(--accent)]/25" : ""}`}
    >
      {showCurrentLine ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500/90"
          style={{ top: `${(currentMinute / 60) * 100}%` }}
        />
      ) : null}
    </div>
  );
}

export function ScheduleLane({
  id,
  name,
  selectedDate,
  totalScheduledHours,
  jobCount,
  remainingHours: remainingHoursProp,
  overDropId,
  isDraggingWorkOrder,
  timeLabels,
  currentTime,
  children,
}: ScheduleLaneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `crew-${id}`,
    data: {
      crewId: id,
      date: selectedDate,
      defaultHour: DAY_START_HOUR,
    },
  });
  const remaining =
    remainingHoursProp !== undefined
      ? Math.max(0, remainingHoursProp)
      : Math.max(0, DEFAULT_AVAILABLE_HOURS - totalScheduledHours);
  const highlight =
    isOver || (overDropId != null && String(overDropId).startsWith(`crew-${id}`));

  return (
    <div
      ref={setNodeRef}
      className={`relative flex min-w-[14rem] flex-1 flex-col border-r border-[var(--card-border)] last:border-r-0 ${
        highlight
          ? "bg-[var(--accent)]/8 ring-2 ring-inset ring-[var(--accent)]/20"
          : "bg-[var(--background)]"
      }`}
    >
      <div className="sticky top-0 z-10 shrink-0 border-b border-[var(--card-border)] bg-[var(--card)]/90 px-3 py-2">
        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{name}</p>
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">
          {totalScheduledHours.toFixed(1)}h · {jobCount} jobs · {remaining.toFixed(1)}h left
        </p>
      </div>
      <div className="relative flex min-h-[360px] flex-1 flex-col">
        <div className="absolute inset-0 flex flex-col">
          {timeLabels.map(({ hour }, hourIndex) => (
            <LaneSlot
              key={`${id}-${hour}`}
              laneId={id}
              hour={hour}
              hourIndex={hourIndex}
              selectedDate={selectedDate}
              isOver={overDropId === getSlotId(id, hour)}
              showCurrentLine={currentTime?.hour === hour}
              currentMinute={currentTime?.minute ?? 0}
            />
          ))}
        </div>
        {isDraggingWorkOrder ? (
          <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-[var(--accent)]/30" />
        ) : null}
        <div className="pointer-events-none absolute inset-0">{children}</div>
      </div>
    </div>
  );
}
