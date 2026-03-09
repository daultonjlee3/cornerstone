import type { DispatchWorkOrder } from "../types";

/** Day view: 8am to 6pm (10 hours). */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 18;
export const DAY_TOTAL_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;

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
