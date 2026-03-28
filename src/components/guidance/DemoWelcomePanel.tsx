"use client";

import Link from "next/link";
import {
  Compass,
  Wrench,
  Truck,
  Box,
  CalendarCheck,
  Warehouse,
  Store,
  ShoppingCart,
  ExternalLink,
  Smartphone,
  BarChart2,
  Inbox,
} from "lucide-react";
import { useGuidance } from "@/hooks/useGuidance";
import { DemoStartFreeTrialButton } from "./DemoStartFreeTrialButton";

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

const SECONDARY_PATH = [
  {
    id: "inventory",
    title: "Inventory",
    description: "Track stock levels and keep parts available for active maintenance work.",
    href: "/inventory",
    icon: Warehouse,
  },
  {
    id: "vendors",
    title: "Vendors",
    description: "Manage external partners and service providers tied to maintenance execution.",
    href: "/vendors",
    icon: Store,
  },
  {
    id: "purchase-orders",
    title: "Purchase Orders",
    description: "Handle procurement workflows for parts and services in one place.",
    href: "/purchase-orders",
    icon: ShoppingCart,
  },
  {
    id: "work-requests",
    title: "Work Requests",
    description: "Review incoming requests and convert approved items into structured work.",
    href: "/requests",
    icon: Inbox,
  },
  {
    id: "request-portal",
    title: "Request Portal",
    description: "Share a public request intake experience for occupants and requesters.",
    href: "/request",
    icon: ExternalLink,
  },
  {
    id: "technician-portal",
    title: "Technician Portal",
    description: "Give field technicians a focused mobile-friendly execution workspace.",
    href: "/portal",
    icon: Smartphone,
  },
  {
    id: "reporting",
    title: "Reporting",
    description: "Analyze operations trends and performance metrics across your workspace.",
    href: "/reports",
    icon: BarChart2,
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
        <DemoStartFreeTrialButton />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {DEMO_PATH.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--background)]/55 p-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.title}</h3>
                  {index === 0 ? (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">Start here</p>
                  ) : null}
                </div>
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

      <div className="mt-5 border-t border-[var(--card-border)] pt-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Explore more capabilities</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Dive deeper into supporting workflows across inventory, vendors, portals, and reporting.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SECONDARY_PATH.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--card-border)]/80 bg-[var(--background)]/40 p-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)]/12 text-[var(--accent)]">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <h4 className="text-xs font-semibold text-[var(--foreground)]">{item.title}</h4>
                </div>
                <p className="mt-1.5 min-h-[34px] text-[11px] leading-relaxed text-[var(--muted)]">
                  {item.description}
                </p>
                <Link
                  href={item.href}
                  className="mt-2 inline-flex min-h-[30px] items-center justify-center rounded-md border border-[var(--card-border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
                >
                  Open {item.title}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
