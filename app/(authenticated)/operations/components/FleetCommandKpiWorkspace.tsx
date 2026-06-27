"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Clock,
  DollarSign,
  Percent,
  Route,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import { KpiCard } from "@/src/components/design-system";
import { formatFleetCurrency } from "@/src/lib/fleet/ui/format";
import { buildFleetKpiInsightFromTodayView } from "@/src/lib/fleet/insights/build-kpi-insights";
import type { FleetInsightTab, FleetKpiId } from "@/src/lib/fleet/insights/types";
import { parseFleetKpiId } from "@/src/lib/fleet/insights/kpi-registry";
import type { FleetTodayViewData } from "@/src/types/fleet";
import { FleetInsightPanel } from "./fleet-insight-panel";
import "./fleet-insight-panel/fleet-insight-panel.css";

type KpiDefinition = {
  id: FleetKpiId;
  label: string;
  hint: string;
  value: string | number;
  emphasis?: "default" | "success" | "warning" | "danger" | "info" | "operational";
  iconProminent?: boolean;
  icon: typeof Truck;
};

type FleetCommandKpiWorkspaceProps = {
  todayView: FleetTodayViewData;
  acceptanceRate: number | null;
  children: ReactNode;
};

export function FleetCommandKpiWorkspace({
  todayView,
  acceptanceRate,
  children,
}: FleetCommandKpiWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cc = todayView.commandCenter;
  const pendingRecommendations =
    todayView.pendingRecommendationCount ??
    todayView.recommendations.summary.volume ??
    todayView.recommendations.pending.length;

  const [selectedKpi, setSelectedKpiState] = useState<FleetKpiId | null>(() =>
    parseFleetKpiId(searchParams.get("kpi"))
  );
  const [activeTab, setActiveTab] = useState<FleetInsightTab>("overview");
  const [search, setSearch] = useState("");

  const syncKpiUrl = useCallback(
    (kpiId: FleetKpiId | null) => {
      const params = new URLSearchParams(window.location.search);
      if (kpiId) params.set("kpi", kpiId);
      else params.delete("kpi");
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      window.history.replaceState(null, "", url);
    },
    [pathname]
  );

  const setSelectedKpi = useCallback(
    (kpiId: FleetKpiId | null) => {
      setSelectedKpiState(kpiId);
      syncKpiUrl(kpiId);
    },
    [syncKpiUrl]
  );

  useEffect(() => {
    const onPopState = () => {
      setSelectedKpiState(parseFleetKpiId(new URLSearchParams(window.location.search).get("kpi")));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const payload = useMemo(() => {
    if (!selectedKpi) return null;
    try {
      return buildFleetKpiInsightFromTodayView(selectedKpi, todayView);
    } catch {
      return null;
    }
  }, [selectedKpi, todayView]);

  const handleKpiSelect = useCallback(
    (kpiId: FleetKpiId) => {
      if (selectedKpi === kpiId) {
        setSelectedKpi(null);
        return;
      }
      setActiveTab("overview");
      setSearch("");
      setSelectedKpi(kpiId);
    },
    [selectedKpi, setSelectedKpi]
  );

  const handleAction = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  const kpis: KpiDefinition[] = [
    {
      id: "active-trucks",
      label: "Active trucks",
      value: cc.activeTrucks,
      hint: "Live on GPS",
      emphasis: "operational",
      iconProminent: true,
      icon: Truck,
    },
    {
      id: "idle-offline",
      label: "Idle / offline",
      value: cc.idleTrucks,
      hint: "Needs attention",
      emphasis: cc.idleTrucks > 0 ? "warning" : "default",
      icon: Clock,
    },
    {
      id: "jobs-today",
      label: "Jobs today",
      value: cc.jobsToday,
      hint: `${cc.unassignedJobs} unassigned`,
      emphasis: cc.unassignedJobs > 0 ? "warning" : "default",
      icon: ClipboardList,
    },
    {
      id: "utilization",
      label: "Utilization",
      value: cc.utilizationPercent != null ? `${cc.utilizationPercent.toFixed(1)}%` : "—",
      hint: "Billable today",
      icon: Percent,
    },
    {
      id: "est-contribution",
      label: "Est. contribution",
      value: cc.estimatedContributionToday != null ? formatFleetCurrency(cc.estimatedContributionToday) : "—",
      hint: "Operational margin",
      emphasis: "success",
      iconProminent: true,
      icon: DollarSign,
    },
    {
      id: "deadhead-cost",
      label: "Deadhead cost",
      value: cc.deadheadCostToday != null ? formatFleetCurrency(cc.deadheadCostToday) : "—",
      hint: "Today",
      emphasis: cc.deadheadCostToday != null && cc.deadheadCostToday > 0 ? "warning" : "default",
      icon: Route,
    },
    {
      id: "overtime-risk",
      label: "Overtime risk",
      value: cc.overtimeCostToday != null ? formatFleetCurrency(cc.overtimeCostToday) : "—",
      hint: "Estimated today",
      emphasis: cc.overtimeCostToday != null && cc.overtimeCostToday > 0 ? "warning" : "default",
      icon: Users,
    },
    {
      id: "acceptance-rate",
      label: "Acceptance rate",
      value: acceptanceRate != null ? `${acceptanceRate.toFixed(0)}%` : "—",
      hint: `${pendingRecommendations} pending`,
      emphasis: pendingRecommendations > 0 ? "info" : "default",
      iconProminent: true,
      icon: Sparkles,
    },
  ];

  return (
    <div className="fleet-kpi-workspace">
      <div className="fleet-kpi-workspace__kpis grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            icon={kpi.icon}
            emphasis={kpi.emphasis}
            iconProminent={kpi.iconProminent}
            interactive
            selected={selectedKpi === kpi.id}
            onSelect={() => handleKpiSelect(kpi.id)}
          />
        ))}
      </div>

      <div
        className={`fleet-kpi-workspace__split ${selectedKpi ? "fleet-kpi-workspace__split--open" : ""}`}
      >
        <div className="fleet-kpi-workspace__main min-w-0">{children}</div>
        {selectedKpi ? (
          <div className="fleet-kpi-workspace__panel">
            <FleetInsightPanel
              kpiId={selectedKpi}
              payload={payload}
              loading={false}
              error={payload ? null : "Unable to load KPI insight."}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={() => setSelectedKpi(null)}
              search={search}
              onSearchChange={setSearch}
              onAction={handleAction}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
