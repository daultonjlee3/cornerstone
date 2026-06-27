import { describe, expect, it } from "vitest";
import {
  buildDispatchExceptionHref,
  resolveFleetExceptionAct,
} from "@/src/lib/fleet/ui/exception-actions";
import type { FleetOperationalException } from "@/src/types/fleet";

function exception(
  partial: Pick<FleetOperationalException, "id" | "category" | "href"> &
    Partial<FleetOperationalException>
): FleetOperationalException {
  return {
    severity: "critical",
    title: "Test",
    whyItMatters: "Test detail",
    recommendedAction: "Do something",
    ...partial,
  };
}

describe("fleet exception actions", () => {
  it("builds dispatch deep links with entity focus", () => {
    expect(buildDispatchExceptionHref("2026-06-28", { jobId: "job-1" })).toBe(
      "/dispatch?date=2026-06-28&job_id=job-1"
    );
    expect(buildDispatchExceptionHref("2026-06-28", { branchId: "branch-1" })).toBe(
      "/dispatch?date=2026-06-28&branch_id=branch-1"
    );
  });

  it("scrolls to recommendations for revenue exceptions on operations", () => {
    const act = resolveFleetExceptionAct(
      exception({
        id: "revenue-at-risk",
        category: "revenue",
        href: "/operations#fleet-recommendations",
      }),
      "/operations"
    );
    expect(act).toEqual({
      kind: "scroll",
      elementId: "fleet-recommendations",
      label: "Review queue",
    });
  });

  it("navigates to dispatch with contextual labels", () => {
    const act = resolveFleetExceptionAct(
      exception({
        id: "unassigned-job-1",
        category: "unassigned_job",
        href: "/dispatch?date=2026-06-28&job_id=job-1",
      }),
      "/operations"
    );
    expect(act).toEqual({
      kind: "navigate",
      href: "/dispatch?date=2026-06-28&job_id=job-1",
      label: "Assign on map",
    });
  });

  it("navigates away from operations for integration issues", () => {
    const act = resolveFleetExceptionAct(
      exception({
        id: "integration-abc",
        category: "integration",
        href: "/settings/integrations?connection=abc",
      }),
      "/operations"
    );
    expect(act).toEqual({
      kind: "navigate",
      href: "/settings/integrations?connection=abc",
      label: "Fix integration",
    });
  });
});
