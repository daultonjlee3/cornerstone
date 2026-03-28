"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Users,
  MapPin,
  CheckCircle,
  Zap,
  CalendarClock,
} from "lucide-react";

type WorkOrderForInsights = {
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  assigned_technician_id?: string | null;
  assigned_crew_id?: string | null;
  vendor_id?: string | null;
  technician_name?: string | null;
  location?: string | null;
  asset_name?: string | null;
  asset_id?: string | null;
  source_type?: string | null;
  completed_at?: string | null;
  scheduled_date?: string | null;
};

type InsightLevel = "urgent" | "warning" | "ok";

type FocusInsight = {
  id: string;
  level: InsightLevel;
  text: string;
  actionLabel: string;
  href: string;
  icon: React.ElementType;
};

const LEVEL_STYLES: Record<
  InsightLevel,
  { bg: string; border: string; text: string; iconBg: string; btnBg: string }
> = {
  urgent: {
    bg: "bg-red-50/70 dark:bg-red-950/20",
    border: "border-red-100 dark:border-red-900/30",
    text: "text-red-700 dark:text-red-400",
    iconBg:
      "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
    btnBg:
      "border-red-200 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50",
  },
  warning: {
    bg: "bg-amber-50/70 dark:bg-amber-950/20",
    border: "border-amber-100 dark:border-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    iconBg:
      "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
    btnBg:
      "border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50",
  },
  ok: {
    bg: "bg-emerald-50/70 dark:bg-emerald-950/20",
    border: "border-emerald-100 dark:border-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    iconBg:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
    btnBg:
      "border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50",
  },
};

const DOT_CLASS: Record<InsightLevel, string> = {
  urgent: "bg-red-500",
  warning: "bg-amber-400",
  ok: "bg-emerald-500",
};

function computeInsights(
  workOrders: WorkOrderForInsights[],
  today: string
): FocusInsight[] {
  const insights: FocusInsight[] = [];

  // 1. Overdue high-priority work orders
  const overdueHigh = workOrders.filter(
    (wo) =>
      wo.due_date &&
      wo.due_date < today &&
      wo.status !== "completed" &&
      wo.status !== "cancelled" &&
      (wo.priority === "high" ||
        wo.priority === "urgent" ||
        wo.priority === "emergency")
  );
  if (overdueHigh.length > 0) {
    insights.push({
      id: "overdue-high",
      level: "urgent",
      text: `${overdueHigh.length} high-priority work order${overdueHigh.length !== 1 ? "s are" : " is"} overdue and need${overdueHigh.length !== 1 ? "" : "s"} immediate attention`,
      actionLabel: "View overdue",
      href: "/work-orders?view=overdue",
      icon: AlertTriangle,
    });
  }

  // 2. Unassigned work orders that are overdue or due today
  const unassignedCritical = workOrders.filter(
    (wo) =>
      wo.due_date &&
      wo.due_date <= today &&
      wo.status !== "completed" &&
      wo.status !== "cancelled" &&
      !wo.assigned_technician_id &&
      !wo.assigned_crew_id &&
      !wo.vendor_id
  );
  if (unassignedCritical.length > 0) {
    insights.push({
      id: "unassigned-critical",
      level: "urgent",
      text: `${unassignedCritical.length} unassigned work order${unassignedCritical.length !== 1 ? "s are" : " is"} overdue or due today — needs dispatch`,
      actionLabel: "Assign now",
      href: "/work-orders?view=unassigned",
      icon: Zap,
    });
  }

  // 3. Technician overload — busiest tech with 3+ in-progress jobs today
  const techInProgress: Record<string, { name: string; count: number }> = {};
  for (const wo of workOrders) {
    if (
      wo.assigned_technician_id &&
      wo.technician_name &&
      wo.status === "in_progress"
    ) {
      const id = wo.assigned_technician_id;
      if (!techInProgress[id])
        techInProgress[id] = { name: wo.technician_name, count: 0 };
      techInProgress[id].count++;
    }
  }
  const overloadedTechs = Object.values(techInProgress)
    .filter((t) => t.count >= 3)
    .sort((a, b) => b.count - a.count);
  if (overloadedTechs.length > 0) {
    const top = overloadedTechs[0];
    insights.push({
      id: "tech-overload",
      level: "warning",
      text: `${top.name} is handling ${top.count} active jobs today — may be over capacity`,
      actionLabel: "Open dispatch",
      href: "/dispatch",
      icon: Users,
    });
  }

  // 4. Overdue preventive maintenance jobs
  const overduePM = workOrders.filter(
    (wo) =>
      wo.due_date &&
      wo.due_date < today &&
      wo.status !== "completed" &&
      wo.status !== "cancelled" &&
      wo.source_type === "preventive_maintenance"
  );
  if (overduePM.length >= 2) {
    insights.push({
      id: "overdue-pm",
      level: "warning",
      text: `${overduePM.length} preventive maintenance job${overduePM.length !== 1 ? "s were" : " was"} missed this week`,
      actionLabel: "View PM",
      href: "/work-orders?view=overdue",
      icon: CalendarClock,
    });
  }

  // 5. Multiple open work orders on the same asset (recurring issue signal)
  const openByAsset: Record<string, { name: string; count: number }> = {};
  for (const wo of workOrders) {
    if (
      wo.asset_id &&
      wo.asset_name &&
      wo.status !== "completed" &&
      wo.status !== "cancelled"
    ) {
      if (!openByAsset[wo.asset_id])
        openByAsset[wo.asset_id] = { name: wo.asset_name, count: 0 };
      openByAsset[wo.asset_id].count++;
    }
  }
  const assetHotspots = Object.values(openByAsset)
    .filter((a) => a.count >= 3)
    .sort((a, b) => b.count - a.count);
  if (assetHotspots.length > 0) {
    const top = assetHotspots[0];
    insights.push({
      id: "asset-cluster",
      level: "warning",
      text: `${top.count} open work orders on ${top.name} — may indicate a recurring issue`,
      actionLabel: "Investigate",
      href: "/work-orders?view=open",
      icon: MapPin,
    });
  }

  // 6. Good news: completions today (only shown if no urgent items)
  const urgentCount = insights.filter((i) => i.level === "urgent").length;
  if (urgentCount === 0) {
    const completedToday = workOrders.filter((wo) => {
      if (wo.status !== "completed" || !wo.completed_at) return false;
      return String(wo.completed_at).slice(0, 10) === today;
    });
    if (completedToday.length > 0) {
      insights.push({
        id: "good-progress",
        level: "ok",
        text: `${completedToday.length} work order${completedToday.length !== 1 ? "s" : ""} completed today — operations on track`,
        actionLabel: "View completed",
        href: "/work-orders?view=completed_today",
        icon: CheckCircle,
      });
    }
  }

  // Cap at 5 insights, prioritize urgent first
  const sorted = [
    ...insights.filter((i) => i.level === "urgent"),
    ...insights.filter((i) => i.level === "warning"),
    ...insights.filter((i) => i.level === "ok"),
  ];
  return sorted.slice(0, 5);
}

type TodaysFocusPanelProps = {
  workOrders: WorkOrderForInsights[];
};

export function TodaysFocusPanel({ workOrders }: TodaysFocusPanelProps) {
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const insights = useMemo(
    () => computeInsights(workOrders, today),
    [workOrders, today]
  );

  if (insights.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-emerald-200/70 bg-emerald-50/50 px-4 py-3 shadow-[var(--shadow-soft)] dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <span
          className="size-2 shrink-0 rounded-full bg-emerald-500"
          aria-hidden
        />
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Today&apos;s Focus
          </span>
          <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-400">
            All work orders are on track — no issues requiring immediate attention.
          </p>
        </div>
      </div>
    );
  }

  const urgentCount = insights.filter((i) => i.level === "urgent").length;

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-soft)]"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-[var(--card-border)] bg-[var(--background)]/60 px-4 py-2.5">
        <span
          className={`size-2 shrink-0 rounded-full ${urgentCount > 0 ? "animate-pulse bg-red-500" : "bg-amber-400"}`}
          aria-hidden
        />
        <h2 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
          Today&apos;s Focus
        </h2>
        <span className="ml-auto text-xs text-[var(--muted)]">
          {insights.length} item{insights.length !== 1 ? "s" : ""} need
          {insights.length === 1 ? "s" : ""} attention
        </span>
      </div>

      {/* Insight rows */}
      <div className="divide-y divide-[var(--card-border)]">
        {insights.map((insight) => {
          const styles = LEVEL_STYLES[insight.level];
          const Icon = insight.icon;
          return (
            <div
              key={insight.id}
              className={`flex items-center gap-3 px-4 py-2.5 ${styles.bg}`}
            >
              {/* Level dot */}
              <span
                className={`size-1.5 shrink-0 rounded-full ${DOT_CLASS[insight.level]}`}
                aria-hidden
              />
              {/* Icon */}
              <div
                className={`flex shrink-0 items-center justify-center rounded-md p-1.5 ${styles.iconBg}`}
                aria-hidden
              >
                <Icon className="size-3.5" strokeWidth={2} />
              </div>
              {/* Text */}
              <p className={`flex-1 text-sm font-medium ${styles.text}`}>
                {insight.text}
              </p>
              {/* Action button */}
              <button
                type="button"
                onClick={() => router.push(insight.href)}
                className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${styles.btnBg}`}
              >
                {insight.actionLabel} →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
