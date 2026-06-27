import type { FleetInsightTab, FleetKpiId, FleetKpiInsightPayload } from "@/src/lib/fleet/insights/types";

export { FleetInsightPanel } from "./FleetInsightPanel";
export { useFleetKpiInsight, invalidateFleetKpiInsightCache } from "./useFleetKpiInsight";

export const INSIGHT_TABS: { id: FleetInsightTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "records", label: "Records" },
  { id: "recommendations", label: "Recommendations" },
  { id: "history", label: "History" },
];

export type FleetInsightPanelProps = {
  kpiId: FleetKpiId;
  payload: FleetKpiInsightPayload | null;
  loading: boolean;
  error: string | null;
  activeTab: FleetInsightTab;
  onTabChange: (tab: FleetInsightTab) => void;
  onClose: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  onAction: (href: string) => void;
};
