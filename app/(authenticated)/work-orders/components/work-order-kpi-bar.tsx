"use client";

import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Wrench,
  Pause,
  AlertTriangle,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { MetricCard } from "@/src/components/ui/metric-card";

export type WorkOrderKpiStats = {
  open: number;
  inProgress: number;
  onHold: number;
  overdue: number;
  dueToday: number;
  completedToday: number;
};

type WorkOrderKpiBarProps = {
  stats: WorkOrderKpiStats;
};

const KPI_ITEMS: {
  key: keyof WorkOrderKpiStats;
  label: string;
  view: string;
  tone?: "neutral" | "good" | "bad";
  icon: LucideIcon;
}[] = [
  { key: "open", label: "Open", view: "open", icon: ClipboardList },
  { key: "inProgress", label: "In Progress", view: "in_progress", icon: Wrench },
  { key: "onHold", label: "On Hold", view: "on_hold", icon: Pause },
  { key: "overdue", label: "Overdue", view: "overdue", tone: "bad", icon: AlertTriangle },
  { key: "dueToday", label: "Due Today", view: "due_today", tone: "bad", icon: Calendar },
  { key: "completedToday", label: "Completed Today", view: "completed_today", tone: "good", icon: CheckCircle },
];

function getCardVariant(
  key: keyof WorkOrderKpiStats,
  value: number
): "default" | "danger" | "success" {
  if (key === "overdue" && value > 0) return "danger";
  if (key === "completedToday" && value > 0) return "success";
  return "default";
}

function getCardDescription(
  key: keyof WorkOrderKpiStats,
  value: number
): string | undefined {
  if (key === "overdue" && value > 0)
    return value === 1 ? "Needs immediate action" : "Needs immediate action";
  if (key === "dueToday" && value > 0)
    return value === 1 ? "1 job due today" : `${value} jobs queued today`;
  if (key === "completedToday" && value === 0)
    return "No completions yet today";
  if (key === "completedToday" && value > 0)
    return value === 1 ? "1 completed" : `${value} completed today`;
  return undefined;
}

export function WorkOrderKpiBar({ stats }: WorkOrderKpiBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const applyView = useCallback(
    (view: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("view", view);
      router.push(`/work-orders?${next.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {KPI_ITEMS.map(({ key, label, view, tone, icon }) => {
        const value = stats[key];
        const variant = getCardVariant(key, value);
        const description = getCardDescription(key, value);
        return (
          <button
            key={key}
            type="button"
            onClick={() => applyView(view)}
            className="text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded-lg"
            aria-label={`Filter by ${label}: ${value} items`}
          >
            <MetricCard
              title={label}
              value={value}
              description={description}
              trend={tone ? { label: `View ${label}`, tone } : undefined}
              icon={icon}
              variant={variant}
              className={key === "overdue" && value > 0 ? "ring-1 ring-red-200/60" : ""}
            />
          </button>
        );
      })}
    </div>
  );
}
