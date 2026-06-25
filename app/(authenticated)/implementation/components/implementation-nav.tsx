"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListChecks, Plug, ClipboardList, TrendingUp, Activity, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/implementation", label: "Overview", icon: ListChecks },
  { href: "/implementation/connections", label: "Connected Systems", icon: Plug },
  { href: "/implementation/imports", label: "Imports", icon: ClipboardList },
  { href: "/implementation/baseline", label: "Baseline", icon: TrendingUp },
  { href: "/implementation/readiness", label: "Readiness", icon: ListChecks },
  { href: "/implementation/sync-history", label: "Sync History", icon: Activity },
  { href: "/implementation/settings", label: "Settings", icon: Settings },
];

export function ImplementationNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-[var(--surface-border-subtle)] pb-4"
      aria-label="Implementation navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-action)] ${
              isActive
                ? "border-[var(--brand-action)] bg-[var(--status-operational-subtle)] text-[var(--text-primary)]"
                : "border-[var(--surface-border-subtle)] bg-[var(--surface-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
            }`}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
