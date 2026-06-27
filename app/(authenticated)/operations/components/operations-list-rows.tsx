"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Td, Tr } from "@/src/components/ui/data-table";
import { Panel, StatusChip } from "@/src/components/design-system";
import { fleetLegacySeverityToTone } from "@/src/components/design-system/chip-maps";
import type { ChipTone } from "@/src/components/design-system/types";
import type {
  FleetOperationalException,
  FleetRecommendationInstance,
} from "@/src/types/fleet";
import { formatFleetCurrency } from "@/src/lib/fleet/ui/format";
import { severityToFleetSeverity } from "@/src/lib/fleet/ui/severity";
import {
  resolveFleetExceptionAct,
  runFleetExceptionAct,
} from "@/src/lib/fleet/ui/exception-actions";
import {
  confidenceLabel,
  formatRecommendationType,
  recommendationConfidence,
  type RecommendationConfidence,
} from "./fleet-recommendation-utils";

function confidenceTone(confidence: RecommendationConfidence): ChipTone {
  switch (confidence) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    default:
      return "neutral";
  }
}

export function CompactRecommendationRow({
  recommendation,
  pending,
  onAction,
}: {
  recommendation: FleetRecommendationInstance;
  pending: boolean;
  onAction: (id: string, action: "accept" | "dismiss") => void;
}) {
  const confidence = recommendationConfidence(recommendation);
  const snapshot = recommendation.rationale.candidate_snapshots?.[0];
  const isCapacityOnly = recommendation.recommendation_type === "capacity_overload";

  return (
    <Panel level="default" padding="sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="cs-text-body font-medium">{recommendation.rationale.title}</p>
          <p className="cs-text-caption cs-text-muted mt-0.5">
            {formatRecommendationType(recommendation.recommendation_type)}
            {snapshot ? ` · ${formatFleetCurrency(snapshot.estimated_contribution)}` : ""}
          </p>
        </div>
        <StatusChip label={confidenceLabel(confidence)} tone={confidenceTone(confidence)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onAction(recommendation.id, "accept")}
          disabled={pending}
        >
          {isCapacityOnly ? "Acknowledge" : "Accept"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onAction(recommendation.id, "dismiss")}
          disabled={pending}
        >
          Dismiss
        </Button>
      </div>
    </Panel>
  );
}

export function ExceptionTableRow({ exception: ex }: { exception: FleetOperationalException }) {
  const tone = fleetLegacySeverityToTone(severityToFleetSeverity(ex.severity));
  const router = useRouter();
  const pathname = usePathname();
  const act = useMemo(() => resolveFleetExceptionAct(ex, pathname), [ex, pathname]);

  const handleAct = useCallback(() => {
    runFleetExceptionAct(act, (href) => router.push(href));
  }, [act, router]);

  return (
    <Tr>
      <Td>
        <StatusChip label={ex.severity} tone={tone} />
      </Td>
      <Td>
        <p className="font-medium">{ex.title}</p>
        <p className="cs-text-caption cs-text-muted mt-0.5">{ex.whyItMatters}</p>
      </Td>
      <Td className="cs-text-caption cs-text-muted">{ex.recommendedAction}</Td>
      <Td>
        <Button type="button" size="sm" variant="secondary" onClick={handleAct}>
          {act.label}
        </Button>
      </Td>
    </Tr>
  );
}
