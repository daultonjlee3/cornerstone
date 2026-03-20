import type { DispatchWorkOrder } from "../types";

/** Day view: 8am to 6pm (10 hours). */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 18;
export const DAY_TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;

/** Fixed lane header height so time column + all technician columns align. */
export const DISPATCH_LANE_HEADER_HEIGHT_PX = 96;

/** One hour row height in the day grid (time ruler + lane slots must match). */
export const DISPATCH_DAY_ROW_HEIGHT_PX = 40;

export function getDispatchDayBodyHeightPx(timeSlotCount: number): number {
  return timeSlotCount * DISPATCH_DAY_ROW_HEIGHT_PX;
}

export function getTimeSlotLabels(): { hour: number; label: string }[] {
  const labels: { hour: number; label: string }[] = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    labels.push({
      hour: h,
      label: h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`,
    });
  }
  return labels;
}

/**
 * Get position (left %, width %) for a work order card in the day grid.
 * Uses scheduled_start and scheduled_end; falls back to scheduled_date + default time and estimated_hours.
 */
export function getWorkOrderPosition(
  wo: DispatchWorkOrder,
  selectedDate: string
): { leftPercent: number; widthPercent: number } {
  const startISO = wo.scheduled_start;
  const endISO = wo.scheduled_end;
  const durationHours = wo.estimated_hours ?? 1;

  let startMinutes: number;
  let endMinutes: number;

  if (startISO && endISO) {
    const start = new Date(startISO);
    const end = new Date(endISO);
    startMinutes = start.getHours() * 60 + start.getMinutes();
    endMinutes = end.getHours() * 60 + end.getMinutes();
    if (endMinutes <= startMinutes) {
      endMinutes = startMinutes + Math.round(durationHours * 60);
    }
  } else {
    startMinutes = DAY_START_HOUR * 60;
    endMinutes = startMinutes + Math.round(durationHours * 60);
  }

  const dayStartMinutes = DAY_START_HOUR * 60;
  const dayEndMinutes = DAY_END_HOUR * 60;
  const leftOffset = Math.max(0, startMinutes - dayStartMinutes);
  const rightOffset = Math.min(dayEndMinutes - dayStartMinutes, endMinutes - dayStartMinutes);
  const widthMin = Math.max(0, rightOffset - leftOffset);

  return {
    leftPercent: (leftOffset / DAY_TOTAL_MINUTES) * 100,
    widthPercent: (widthMin / DAY_TOTAL_MINUTES) * 100,
  };
}

export const DEFAULT_AVAILABLE_HOURS = 10;

/** Slot droppable id for crew column + hour (e.g. "slot-{crewId}-8"). */
export function getSlotId(crewId: string, hour: number): string {
  return `slot-${crewId}-${hour}`;
}

/**
 * Parse slot id to get lane id (crew / tech / unassigned) and hour.
 * Format: `slot-{laneId}-{hour}` where `laneId` may contain dashes
 * (e.g. `tech-<uuid>`, `__unassigned__`). We take the segment after the last `-` as hour.
 */
export function parseSlotId(
  slotId: string
): { crewId: string; hour: number } | null {
  if (!slotId.startsWith("slot-")) return null;
  const rest = slotId.slice("slot-".length);
  const lastDash = rest.lastIndexOf("-");
  if (lastDash === -1) return null;
  const hour = parseInt(rest.slice(lastDash + 1), 10);
  if (Number.isNaN(hour)) return null;
  const crewId = rest.slice(0, lastDash);
  if (!crewId) return null;
  return { crewId, hour };
}

/** Convert top percent (0–100) in the day column to nearest start hour (DAY_START_HOUR–DAY_END_HOUR). */
export function percentToStartHour(percent: number): number {
  const p = Math.max(0, Math.min(100, percent));
  const totalMins = DAY_TOTAL_MINUTES;
  const startMins = (p / 100) * totalMins;
  const hour = DAY_START_HOUR + Math.floor(startMins / 60);
  return Math.max(DAY_START_HOUR, Math.min(DAY_END_HOUR, hour));
}

/** Duration in hours from height percent. */
export function heightPercentToHours(heightPercent: number): number {
  const totalMins = DAY_TOTAL_MINUTES;
  const mins = (heightPercent / 100) * totalMins;
  return Math.max(0.25, Math.round((mins / 60) * 4) / 4);
}

/** Add hours to an ISO date string. */
export function addHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d.toISOString();
}

/** Build ISO for start of a slot on a given date. */
export function toSlotISO(dateStr: string, hour: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
