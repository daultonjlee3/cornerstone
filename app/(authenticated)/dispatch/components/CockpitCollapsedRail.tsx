"use client";

import { ChevronLeft, ChevronRight, Inbox, Sparkles } from "lucide-react";
import { AppIcon, IconChip } from "@/src/components/design-system/icons";

type CockpitCollapsedRailProps = {
  side: "left" | "right";
  label: string;
  count: number;
  accent?: boolean;
  onExpand: () => void;
};

export function CockpitCollapsedRail({
  side,
  label,
  count,
  accent,
  onExpand,
}: CockpitCollapsedRailProps) {
  const panelIcon = side === "left" ? Inbox : Sparkles;

  return (
    <button
      type="button"
      className={`dispatch-console__rail-collapsed dispatch-console__rail-collapsed--${side}`}
      onClick={onExpand}
      aria-label={`Expand ${label}`}
      title={`Expand ${label}`}
    >
      {side === "left" ? (
        <AppIcon icon={ChevronRight} size="sm" intent="muted" className="dispatch-console__rail-collapsed-chevron" />
      ) : (
        <AppIcon icon={ChevronLeft} size="sm" intent="muted" className="dispatch-console__rail-collapsed-chevron" />
      )}
      {side === "right" && accent ? (
        <IconChip icon={Sparkles} variant="ai" size="sm" label={label} />
      ) : (
        <AppIcon icon={panelIcon} size="sm" intent={accent ? "operational" : "muted"} />
      )}
      <span className="dispatch-console__rail-collapsed-label">{label}</span>
      {count > 0 ? <span className="dispatch-console__rail-collapsed-badge">{count}</span> : null}
    </button>
  );
}
