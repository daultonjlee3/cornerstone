/** Deterministic helpers for Peachtree fleet demo seed */

export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function pickWeighted<T extends { weight: number }>(
  rng: () => number,
  items: readonly T[]
): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export function intBetween(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function moneyBetween(rng: () => number, min: number, max: number): number {
  return Math.round((min + rng() * (max - min)) / 50) * 50;
}

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export function demoBoardDate(): string {
  return addDays(todayDateOnly(), 1);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Eastern Time offset for demo (EDT = UTC-4 in summer) */
const ET_OFFSET_HOURS = -4;

export function etSlotIso(dayOffset: number, hourET: number, minuteET = 0): string {
  const base = new Date();
  base.setUTCHours(12, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  const dateStr = base.toISOString().slice(0, 10);
  const utcHour = hourET - ET_OFFSET_HOURS;
  return `${dateStr}T${String(utcHour).padStart(2, "0")}:${String(minuteET).padStart(2, "0")}:00.000Z`;
}

export function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function insertBatches<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  rows: T[],
  batchSize = 80
): Promise<void> {
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
  }
}

export function jobDescription(
  jobType: string,
  estHours: number,
  actHours: number | null,
  revenue: number
): string {
  const revPerHour = actHours != null && actHours > 0 ? Math.round(revenue / actHours) : null;
  const parts = [
    `Type: ${jobType}`,
    `Est hours: ${estHours.toFixed(1)}`,
    actHours != null ? `Actual hours: ${actHours.toFixed(1)}` : null,
    revPerHour != null ? `Revenue/hr: $${revPerHour}` : null,
    `Contribution est: $${Math.round(revenue * 0.38)}`,
  ].filter(Boolean);
  return parts.join(" | ");
}
