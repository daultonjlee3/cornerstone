"use client";

import { memo, useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import type { FleetInsightTab, FleetKpiId, FleetKpiInsightPayload } from "@/src/lib/fleet/insights/types";
import { parseFleetKpiId } from "@/src/lib/fleet/insights/kpi-registry";
import type { FleetCommandCenterData } from "@/src/types/fleet";
import { FleetInsightPanel } from "./fleet-insight-panel";
import { useFleetKpiInsight } from "./fleet-insight-panel/useFleetKpiInsight";
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
  date: string;
  commandCenter: FleetCommandCenterData;
  acceptanceRate: number | null;
  pendingRecommendations: number;
  kpiReady: boolean;
  children: ReactNode;
};

function buildKpiDefinitions(
  cc: FleetCommandCenterData,
  acceptanceRate: number | null,
  pendingRecommendations: number
): KpiDefinition[] {
  return [
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
      value:
        cc.estimatedContributionToday != null
          ? formatFleetCurrency(cc.estimatedContributionToday)
          : "—",
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
      emphasis:
        cc.deadheadCostToday != null && cc.deadheadCostToday > 0 ? "warning" : "default",
      icon: Route,
    },
    {
      id: "overtime-risk",
      label: "Overtime risk",
      value: cc.overtimeCostToday != null ? formatFleetCurrency(cc.overtimeCostToday) : "—",
      hint: "Estimated today",
      emphasis:
        cc.overtimeCostToday != null && cc.overtimeCostToday > 0 ? "warning" : "default",
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
}

const FleetCommandKpiStrip = memo(function FleetCommandKpiStrip({
  kpis,
  kpiReady,
  selectedKpi,
  onSelect,
}: {
  kpis: KpiDefinition[];
  kpiReady: boolean;
  selectedKpi: FleetKpiId | null;
  onSelect: (kpiId: FleetKpiId) => void;
}) {
  if (!kpiReady) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--surface-border-subtle)]" aria-hidden />
        ))}
      </div>
    );
  }

  return (
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
          onSelect={() => onSelect(kpi.id)}
        />
      ))}
    </div>
  );
});

const FleetCommandKpiMain = memo(function FleetCommandKpiMain({ children }: { children: ReactNode }) {
  return <div className="fleet-kpi-workspace__main min-w-0">{children}</div>;
});

function readKpiFromLocation(): FleetKpiId | null {
  if (typeof window === "undefined") return null;
  return parseFleetKpiId(new URLSearchParams(window.location.search).get("kpi"));
}

export function FleetCommandKpiWorkspace({
  date,
  commandCenter,
  acceptanceRate,
  pendingRecommendations,
  kpiReady,
  children,
}: FleetCommandKpiWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { load } = useFleetKpiInsight(date);

  const [selectedKpi, setSelectedKpiState] = useState<FleetKpiId | null>(null);
  const [activeTab, setActiveTab] = useState<FleetInsightTab>("overview");
  const [search, setSearch] = useState("");
  const [payload, setPayload] = useState<FleetKpiInsightPayload | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

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
    setSelectedKpiState(readKpiFromLocation());
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setSelectedKpiState(parseFleetKpiId(new URLSearchParams(window.location.search).get("kpi")));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!selectedKpi) {
      setPayload(null);
      setInsightError(null);
      setInsightLoading(false);
      return;
    }

    let cancelled = false;
    setInsightLoading(true);
    setInsightError(null);

    void load(selectedKpi)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) {
          setPayload(null);
          setInsightError("Unable to load KPI insight.");
        }
      })
      .finally(() => {
        if (!cancelled) setInsightLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedKpi, load, date]);

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

  const kpis = buildKpiDefinitions(commandCenter, acceptanceRate, pendingRecommendations);

  return (
    <div className="fleet-kpi-workspace">
      <FleetCommandKpiStrip
        kpis={kpis}
        kpiReady={kpiReady}
        selectedKpi={selectedKpi}
        onSelect={handleKpiSelect}
      />

      <div
        className={`fleet-kpi-workspace__split ${selectedKpi ? "fleet-kpi-workspace__split--open" : ""}`}
      >
        <FleetCommandKpiMain>{children}</FleetCommandKpiMain>
        {selectedKpi ? (
          <div className="fleet-kpi-workspace__panel">
            <FleetInsightPanel
              kpiId={selectedKpi}
              payload={payload}
              loading={insightLoading}
              error={insightError ?? (payload ? null : insightLoading ? null : "Unable to load KPI insight.")}
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
