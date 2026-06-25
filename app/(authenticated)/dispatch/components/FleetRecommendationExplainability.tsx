"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Check,
  Clock,
  DollarSign,
  Gauge,
  MapPin,
  Route,
  Satellite,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Wrench,
  X,
} from "lucide-react";
import type { FleetDispatchBoardData, FleetRecommendationInstance } from "@/src/types/fleet";
import {
  buildRecommendationExplanation,
  factorQualityLabel,
  type FactorQuality,
  type RecommendationExplanation,
} from "@/src/lib/fleet-recommendation-engine/explainability";
import { confidenceLabel } from "../../operations/components/fleet-recommendation-utils";
import { confidenceTone, formatCurrency } from "./fleet-dispatch-utils";
import { useMemo } from "react";

type FleetRecommendationExplainabilityProps = {
  recommendation: FleetRecommendationInstance;
  board: FleetDispatchBoardData;
};

export function FleetRecommendationExplainability({
  recommendation,
  board,
}: FleetRecommendationExplainabilityProps) {
  const explanation = useMemo(
    () => buildRecommendationExplanation(recommendation, board),
    [recommendation, board]
  );

  return (
    <div className="mt-2.5 space-y-2.5">
      <ConfidenceBlock explanation={explanation} />
      {explanation.dataFreshness ? (
        <DataFreshnessBlock freshness={explanation.dataFreshness} />
      ) : null}
      {explanation.capacitySummary ? (
        <CapacityOverloadSummary summary={explanation.capacitySummary} />
      ) : null}
      {explanation.comparisonRows.length > 0 ? (
        <ComparisonTable explanation={explanation} />
      ) : null}
      <ExplainWhyPanel explanation={explanation} />
      <FactorScoresGrid factors={explanation.factorScores} />
      <DecisionImpactPanel impact={explanation.decisionImpact} />
      {explanation.ignoreRisk ? <IgnoreRiskBanner message={explanation.ignoreRisk} /> : null}
    </div>
  );
}

function ConfidenceBlock({ explanation }: { explanation: RecommendationExplanation }) {
  return (
    <div className="rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/60 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
          Recommendation confidence
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${confidenceTone(explanation.confidence)}`}
        >
          {confidenceLabel(explanation.confidence)}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-[var(--foreground)]">
        {explanation.confidenceExplanation}
      </p>
    </div>
  );
}

function DataFreshnessBlock({
  freshness,
}: {
  freshness: NonNullable<RecommendationExplanation["dataFreshness"]>;
}) {
  return (
    <div
      className={`rounded-lg border px-2.5 py-2 ${
        freshness.isStale
          ? "border-amber-300 bg-amber-50 dark:bg-amber-500/5"
          : "border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
          Data freshness
        </p>
        <span className="text-[9px] font-medium text-[var(--muted)]">
          GPS: {freshness.telematicsLabel}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-[var(--foreground)]">
        {freshness.isStale
          ? "Signals may be stale — verify truck location before accepting."
          : "Telematics and board state are current enough to trust this recommendation."}
      </p>
      {freshness.generatedAt ? (
        <p className="mt-0.5 text-[10px] text-[var(--muted)]">
          Generated {new Date(freshness.generatedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}

function CapacityOverloadSummary({
  summary,
}: {
  summary: NonNullable<RecommendationExplanation["capacitySummary"]>;
}) {
  return (
    <div className="rounded-lg border border-amber-300 bg-[var(--status-warning-subtle)] px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
        Branch capacity alert
      </p>
      <p className="mt-1 text-[11px] text-[var(--foreground)]">
        {summary.sourceBranch} at {summary.overloadPct}% committed
        {summary.targetBranch ? ` · rebalance target: ${summary.targetBranch}` : ""}
      </p>
    </div>
  );
}

function ComparisonTable({ explanation }: { explanation: RecommendationExplanation }) {
  const columns = [
    ...(explanation.recommended ? [explanation.recommended] : []),
    ...explanation.alternatives,
  ];

  if (columns.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--surface-border-subtle)]">
      <p className="border-b border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/60 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
        Truck comparison
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/60">
              <th className="px-2 py-1.5 text-left font-semibold text-[var(--muted)]">Metric</th>
              {columns.map((col, index) => (
                <th
                  key={col.truckId}
                  className={`px-2 py-1.5 text-left font-bold ${index === 0 ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}
                >
                  {index === 0 ? "★ " : `#${index + 1} `}
                  {col.unitNumber}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {explanation.comparisonRows.map((row) => (
              <tr key={row.key} className="border-b border-[var(--surface-border-subtle)]/60 last:border-0">
                <td className="px-2 py-1 font-medium text-[var(--muted)]">{row.label}</td>
                {row.cells.map((cell, index) => {
                  const isWinner = row.winnerIndex === index;
                  return (
                    <td
                      key={`${row.key}-${cell.truckId}`}
                      className={`px-2 py-1 tabular-nums ${isWinner ? "bg-[var(--status-success-subtle)] font-bold text-[var(--status-success)]" : "text-[var(--foreground)]"}`}
                    >
                      {isWinner ? "▸ " : ""}
                      {cell.display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExplainWhyPanel({ explanation }: { explanation: RecommendationExplanation }) {
  const winnerLabel = explanation.recommended?.unitNumber ?? "This option";

  return (
    <div className="rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/60 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Explain why</p>
      <p className="mt-1 text-[11px] font-semibold text-[var(--foreground)]">
        Cornerstone selected {winnerLabel} because:
      </p>
      <ul className="mt-1 space-y-0.5">
        {explanation.winnerReasons.map((reason) => (
          <li key={reason} className="flex items-start gap-1.5 text-[10px] leading-snug">
            <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" />
            {reason}
          </li>
        ))}
      </ul>

      {explanation.loserReasons.length > 0 ? (
        <div className="mt-2 border-t border-[var(--surface-border-subtle)] pt-2">
          <p className="text-[10px] font-semibold text-[var(--muted)]">Why alternatives lost</p>
          <div className="mt-1 space-y-1.5">
            {explanation.loserReasons.map((loser) => (
              <div key={loser.unitNumber}>
                <p className="text-[10px] font-bold text-[var(--foreground)]">{loser.unitNumber}</p>
                <ul className="mt-0.5 space-y-0.5">
                  {loser.reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-1.5 text-[10px] text-[var(--muted)]">
                      <X className="mt-0.5 size-3 shrink-0 text-red-500" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const FACTOR_ICONS: Record<string, LucideIcon> = {
  travelImpact: MapPin,
  deadhead: Route,
  utilizationImpact: Gauge,
  capacityImpact: TrendingUp,
  telematicsFreshness: Satellite,
  revenue: DollarSign,
  equipment: Wrench,
  operator: User,
};

function qualityColor(quality: FactorQuality): string {
  switch (quality) {
    case "excellent":
      return "text-emerald-700 border-emerald-300 dark:text-emerald-400";
    case "good":
      return "text-blue-700 border-blue-300 dark:text-blue-400";
    case "neutral":
      return "text-[var(--muted)] border-[var(--surface-border-subtle)]";
    default:
      return "text-red-700 border-red-300 dark:text-red-400";
  }
}

function FactorScoresGrid({
  factors,
}: {
  factors: RecommendationExplanation["factorScores"];
}) {
  if (factors.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/60 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Decision factors</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {factors.map((factor) => {
          const Icon = FACTOR_ICONS[factor.key] ?? Sparkles;
          return (
            <div
              key={factor.key}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 ${qualityColor(factor.quality)}`}
            >
              <Icon className="size-3 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-[9px] font-semibold uppercase opacity-80">{factor.label}</p>
                <p className="text-[10px] font-bold">{factor.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DecisionImpactPanel({
  impact,
}: {
  impact: RecommendationExplanation["decisionImpact"];
}) {
  const items: Array<{ icon: LucideIcon; label: string; value: string }> = [];
  if (impact.travelReducedMiles != null && impact.travelReducedMiles > 0) {
    items.push({
      icon: Route,
      label: "Travel reduced",
      value: `${impact.travelReducedMiles} mi`,
    });
  }
  if (impact.arrivalImprovedMinutes != null && impact.arrivalImprovedMinutes > 0) {
    items.push({
      icon: Clock,
      label: "Arrival improved",
      value: `${impact.arrivalImprovedMinutes} min`,
    });
  }
  if (impact.projectedUtilizationPct != null) {
    items.push({
      icon: Gauge,
      label: "Projected utilization",
      value: `${impact.projectedUtilizationPct}%`,
    });
  }
  if (impact.branchCapacityLabel) {
    items.push({
      icon: Shield,
      label: "Branch capacity",
      value: impact.branchCapacityLabel,
    });
  }
  if (impact.contributionImprovement != null && impact.contributionImprovement > 0) {
    items.push({
      icon: DollarSign,
      label: "Contribution gain",
      value: formatCurrency(impact.contributionImprovement),
    });
  }
  if (impact.laborSaved != null && impact.laborSaved > 0) {
    items.push({
      icon: DollarSign,
      label: "Labor saved",
      value: formatCurrency(impact.laborSaved),
    });
  }
  if (impact.overtimeAvoided != null && impact.overtimeAvoided > 0) {
    items.push({
      icon: Clock,
      label: "Overtime avoided",
      value: formatCurrency(impact.overtimeAvoided),
    });
  }
  if (impact.fuelSaved != null && impact.fuelSaved > 0) {
    items.push({
      icon: Route,
      label: "Fuel saved",
      value: formatCurrency(impact.fuelSaved),
    });
  }
  if (impact.revenueProtected != null && impact.revenueProtected > 0) {
    items.push({
      icon: DollarSign,
      label: "Revenue protected",
      value: formatCurrency(impact.revenueProtected),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/60 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
        If you accept
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/60 px-2 py-1.5"
          >
            <div className="flex items-center gap-1">
              <item.icon className="size-3 text-[var(--accent)]" />
              <span className="text-[9px] font-semibold uppercase text-[var(--muted)]">{item.label}</span>
            </div>
            <p className="mt-0.5 text-[11px] font-bold tabular-nums">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IgnoreRiskBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-[var(--status-danger-subtle)] px-2.5 py-2">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-600" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
          If ignored
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-[var(--foreground)]">{message}</p>
      </div>
    </div>
  );
}

export { factorQualityLabel };
