"use client";

import Link from "next/link";
import { Compass, Wrench, Truck, Box, CalendarCheck, Sparkles } from "lucide-react";
import { useGuidance } from "@/hooks/useGuidance";

const DEMO_PATH = [
  {
    id: "operations",
    title: "Operations Center",
    description: "Get a live snapshot of urgent work, overdue tasks, and team priorities.",
    href: "/operations",
    icon: Compass,
  },
  {
    id: "work-orders",
    title: "Work Orders",
    description: "Track maintenance from intake to completion with status and ownership.",
    href: "/work-orders",
    icon: Wrench,
  },
  {
    id: "dispatch",
    title: "Dispatch",
    description: "Coordinate assignments and balance technician workload in one board.",
    href: "/dispatch",
    icon: Truck,
  },
  {
    id: "assets",
    title: "Assets",
    description: "Explore equipment records and maintenance history tied to real work.",
    href: "/assets",
    icon: Box,
  },
  {
    id: "preventive-maintenance",
    title: "Preventive Maintenance",
    description: "Review recurring plans that turn history into proactive reliability.",
    href: "/preventive-maintenance",
    icon: CalendarCheck,
  },
] as const;

export function DemoWelcomePanel() {
  const { isLiveDemoMode } = useGuidance();

  if (!isLiveDemoMode) return null;

  return (
    <section
      id="demo-welcome"
      className="mb-6 rounded-2xl border border-[var(--accent)]/20 bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            Demo Workspace
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Welcome to the Cornerstone demo</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            You are viewing safe sample data. Use this guided path to explore core workflows quickly.
          </p>
        </div>
        <Link
          href="/signup?source=demo"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow)] hover:bg-[var(--accent-hover)]"
        >
          <Sparkles className="size-4" aria-hidden />
          Start Free Trial
        </Link>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {DEMO_PATH.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/55 p-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
                  <Icon className="size-4" aria-hidden />
                </span>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.title}</h3>
              </div>
              <p className="mt-2 min-h-[40px] text-xs leading-relaxed text-[var(--muted)]">{item.description}</p>
              <Link
                href={item.href}
                className="mt-3 inline-flex min-h-[36px] items-center justify-center rounded-lg border border-[var(--card-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
              >
                Open {item.title}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
