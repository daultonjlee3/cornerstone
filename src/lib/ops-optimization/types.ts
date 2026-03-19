import type { AiActionType } from "@/src/lib/cornerstone-ai/types";

export type OptimizationProposalImpact = "high" | "medium" | "low";
export type OptimizationProposalPriority = "urgent" | "high" | "medium" | "low";

export type OptimizationProposalType =
  | "auto_dispatch"
  | "rebalance"
  | "prioritize"
  | "pm_opportunity"
  | "asset_risk";

export type AffectedRecord = {
  id: string;
  label?: string | null;
  work_order_number?: string | null;
  title?: string | null;
  due_date?: string | null;
  priority?: string | null;
  assetId?: string | null;
  assetName?: string | null;
  failureCount?: number | null;
  technicianId?: string | null;
};

export type OptimizationProposedAction = {
  actionType: AiActionType;
  parameters: Record<string, unknown>;
};

export type OptimizationProposal = {
  id: string;
  type: OptimizationProposalType;
  title: string;
  summary: string;
  rationale: string;
  impact: OptimizationProposalImpact;
  priority: OptimizationProposalPriority;
  proposedAction?: OptimizationProposedAction;
  affectedRecords: AffectedRecord[];
  confirmationRequired: boolean;
};

