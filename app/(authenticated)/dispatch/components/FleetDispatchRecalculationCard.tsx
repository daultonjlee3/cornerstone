"use client";

import type { FleetRecommendationRecalculationNotice } from "@/src/types/fleet";

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "−";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

type FleetDispatchRecalculationCardProps = {
  notice: FleetRecommendationRecalculationNotice;
};

export function FleetDispatchRecalculationCard({ notice }: FleetDispatchRecalculationCardProps) {
  const replacement = notice.replacements?.[0];

  return (
    <div className="mb-3 rounded-lg border border-[rgba(45,212,191,0.28)] bg-[rgba(15,23,42,0.92)] p-3 text-[11px] leading-relaxed text-[#9aa4b2]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#5eead4]">
        Recommendation updated
      </p>
      <p className="mt-1 text-[#cbd5e1]">{notice.message}</p>

      {replacement ? (
        <div className="mt-3 grid gap-2 rounded-md border border-[rgba(148,163,184,0.15)] bg-[rgba(2,6,23,0.55)] p-2.5">
          {replacement.previous_unit_number ? (
            <p>
              <span className="text-[#94a3b8]">Previous truck:</span>{" "}
              <span className="font-medium text-[#e2e8f0]">{replacement.previous_unit_number}</span>
              {replacement.reason ? (
                <span className="text-[#94a3b8]"> — {replacement.reason}</span>
              ) : null}
            </p>
          ) : null}
          {replacement.new_unit_number ? (
            <p>
              <span className="text-[#94a3b8]">New recommendation:</span>{" "}
              <span className="font-medium text-[#e2e8f0]">Truck {replacement.new_unit_number}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-1">
            {replacement.expected_contribution != null ? (
              <p>
                <span className="text-[#94a3b8]">Expected contribution:</span>{" "}
                <span className="font-medium text-[#86efac]">
                  {formatMoney(replacement.expected_contribution)}
                </span>
              </p>
            ) : null}
            {replacement.contribution_delta != null ? (
              <p>
                <span className="text-[#94a3b8]">Contribution delta:</span>{" "}
                <span className="font-medium text-[#86efac]">
                  {formatMoney(replacement.contribution_delta)}
                </span>
              </p>
            ) : null}
            {replacement.confidence != null ? (
              <p>
                <span className="text-[#94a3b8]">Confidence:</span>{" "}
                <span className="font-medium text-[#e2e8f0]">{Math.round(replacement.confidence)}%</span>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
