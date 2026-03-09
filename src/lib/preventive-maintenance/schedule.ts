export type PreventiveMaintenanceFrequencyType =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

type DateInput = string | Date;

type NextRunParams = {
  frequencyType: PreventiveMaintenanceFrequencyType;
  frequencyInterval: number;
  baseDate: DateInput;
};

type NextRunAfterExecutionParams = {
  frequencyType: PreventiveMaintenanceFrequencyType;
  frequencyInterval: number;
  currentNextRunDate: DateInput;
  executedOn: DateInput;
};

function toUtcDateOnly(value: DateInput): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  const [y, m, d] = text.split("-").map((part) => parseInt(part, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnly(value: DateInput): string {
  const date = toUtcDateOnly(value);
  return date.toISOString().slice(0, 10);
}

function daysInMonthUtc(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addMonthsClamped(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const maxDay = daysInMonthUtc(targetYear, normalizedMonth);

  return new Date(Date.UTC(targetYear, normalizedMonth, Math.min(day, maxDay)));
}

export function calculateNextRunDate(params: NextRunParams): string {
  const interval = Math.max(1, Math.trunc(params.frequencyInterval || 1));
  const base = toUtcDateOnly(params.baseDate);
  let next: Date;

  switch (params.frequencyType) {
    case "daily":
      next = new Date(base.getTime());
      next.setUTCDate(next.getUTCDate() + interval);
      break;
    case "weekly":
      next = new Date(base.getTime());
      next.setUTCDate(next.getUTCDate() + interval * 7);
      break;
    case "monthly":
      next = addMonthsClamped(base, interval);
      break;
    case "quarterly":
      next = addMonthsClamped(base, interval * 3);
      break;
    case "yearly":
      next = addMonthsClamped(base, interval * 12);
      break;
    default:
      next = new Date(base.getTime());
  }

  return formatDateOnly(next);
}

export function isPreventiveMaintenanceDue(
  nextRunDate: DateInput,
  referenceDate: DateInput = new Date()
): boolean {
  const due = toUtcDateOnly(nextRunDate).getTime();
  const reference = toUtcDateOnly(referenceDate).getTime();
  return due <= reference;
}

export function calculateNextRunDateAfterExecution(
  params: NextRunAfterExecutionParams
): string {
  const executedOn = toUtcDateOnly(params.executedOn);
  let candidate = formatDateOnly(params.currentNextRunDate);

  while (toUtcDateOnly(candidate).getTime() <= executedOn.getTime()) {
    candidate = calculateNextRunDate({
      frequencyType: params.frequencyType,
      frequencyInterval: params.frequencyInterval,
      baseDate: candidate,
    });
  }

  return candidate;
}

export function describeFrequency(
  frequencyType: PreventiveMaintenanceFrequencyType,
  frequencyInterval: number
): string {
  const interval = Math.max(1, Math.trunc(frequencyInterval || 1));
  if (interval === 1) {
    switch (frequencyType) {
      case "daily":
        return "Every day";
      case "weekly":
        return "Every week";
      case "monthly":
        return "Every month";
      case "quarterly":
        return "Every quarter";
      case "yearly":
        return "Every year";
      default:
        return "Every interval";
    }
  }
  return `Every ${interval} ${frequencyType}`;
}
