"use client";

import { Check, X } from "lucide-react";
import type { AssignmentValidationResult } from "@/src/lib/fleet/dispatch/assignment-service";
import type { AssignmentPanelMode } from "../useDispatchMapAssignment";
import { formatCurrency, formatTime } from "../fleet-dispatch-utils";

type DispatchAssignmentConfirmPanelProps = {
  mode: AssignmentPanelMode;
  validation: AssignmentValidationResult | null;
  committing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onCompareAlternatives?: () => void;
};

export function DispatchAssignmentConfirmPanel({
  mode,
  validation,
  committing,
  onConfirm,
  onCancel,
  onCompareAlternatives,
}: DispatchAssignmentConfirmPanelProps) {
  if (mode === "idle" || !validation) return null;

  if (mode === "loading") {
    return (
      <aside className="opmap-assignment-panel opmap-assignment-panel--loading" aria-busy="true">
        <p className="opmap-assignment-panel__eyebrow">Validating assignment</p>
        <p className="opmap-assignment-panel__title">Running constraint engine…</p>
      </aside>
    );
  }

  if (mode === "invalid") {
    return (
      <aside className="opmap-assignment-panel opmap-assignment-panel--invalid" role="alert">
        <header className="opmap-assignment-panel__header">
          <div>
            <p className="opmap-assignment-panel__eyebrow">Cannot assign</p>
            <h2 className="opmap-assignment-panel__title">
              {validation.unitNumber} → {validation.jobTitle}
            </h2>
          </div>
          <button type="button" className="opmap-assignment-panel__close" onClick={onCancel} aria-label="Close">
            <X className="size-4" />
          </button>
        </header>
        <ul className="opmap-assignment-panel__blockers">
          {validation.blockingReasons.map((reason) => (
            <li key={reason.code}>{reason.message}</li>
          ))}
        </ul>
        <button type="button" className="opmap-assignment-panel__cancel" onClick={onCancel}>
          Dismiss
        </button>
      </aside>
    );
  }

  return (
    <aside className="opmap-assignment-panel opmap-assignment-panel--confirm">
      <header className="opmap-assignment-panel__header">
        <div>
          <p className="opmap-assignment-panel__eyebrow">Confirm assignment</p>
          <h2 className="opmap-assignment-panel__title">
            Assign {validation.unitNumber} to {validation.jobTitle}?
          </h2>
        </div>
        <button type="button" className="opmap-assignment-panel__close" onClick={onCancel} aria-label="Close">
          <X className="size-4" />
        </button>
      </header>

      <div className="opmap-assignment-panel__metrics">
        {validation.expectedContribution != null ? (
          <div>
            <span className="opmap-assignment-panel__label">Expected contribution</span>
            <span className="opmap-assignment-panel__value">
              {formatCurrency(validation.expectedContribution)}
            </span>
          </div>
        ) : null}
        {validation.estimatedDeadheadMiles != null ? (
          <div>
            <span className="opmap-assignment-panel__label">Deadhead</span>
            <span className="opmap-assignment-panel__value">
              {validation.estimatedDeadheadMiles.toFixed(1)} mi
            </span>
          </div>
        ) : null}
        {validation.estimatedDriveMinutes != null ? (
          <div>
            <span className="opmap-assignment-panel__label">Drive time</span>
            <span className="opmap-assignment-panel__value">
              {Math.round(validation.estimatedDriveMinutes)} min
            </span>
          </div>
        ) : null}
        {validation.eta ? (
          <div>
            <span className="opmap-assignment-panel__label">ETA</span>
            <span className="opmap-assignment-panel__value">{formatTime(validation.eta)}</span>
          </div>
        ) : null}
        <div>
          <span className="opmap-assignment-panel__label">Confidence</span>
          <span className="opmap-assignment-panel__value">{validation.confidence}%</span>
        </div>
      </div>

      {validation.utilizationImpact ? (
        <p className="opmap-assignment-panel__impact">{validation.utilizationImpact}</p>
      ) : null}
      {validation.overtimeRisk ? (
        <p className="opmap-assignment-panel__impact">{validation.overtimeRisk}</p>
      ) : null}
      {validation.slaImpact ? (
        <p className="opmap-assignment-panel__impact">{validation.slaImpact}</p>
      ) : null}

      {validation.explanation.length > 0 ? (
        <ul className="opmap-assignment-panel__reasons">
          {validation.explanation.slice(0, 3).map((reason) => (
            <li key={reason}>
              <Check className="size-3.5 shrink-0" aria-hidden />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="opmap-assignment-panel__actions">
        <button
          type="button"
          className="opmap-assignment-panel__confirm"
          disabled={committing}
          onClick={onConfirm}
        >
          {committing ? "Assigning…" : "Confirm assignment"}
        </button>
        <div className="opmap-assignment-panel__secondary">
          <button type="button" className="opmap-assignment-panel__secondary-btn" onClick={onCancel}>
            Cancel
          </button>
          {validation.alternatives.length > 0 && onCompareAlternatives ? (
            <button
              type="button"
              className="opmap-assignment-panel__secondary-btn"
              onClick={onCompareAlternatives}
            >
              Compare alternatives
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
