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
      {KPI_ITEMS.map(({ key, label, view, tone, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => applyView(view)}
          className="text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded-lg"
          aria-label={`Filter by ${label}: ${stats[key]} items`}
        >
          <MetricCard
            title={label}
            value={stats[key]}
            trend={tone ? { label: `View ${label}`, tone } : undefined}
            icon={icon}
          />
        </button>
      ))}
    </div>
  );
}
