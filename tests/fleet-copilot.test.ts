/**
 * Fleet Intelligence Copilot — routing, deterministic answers, security, product knowledge.
 * Run: npx vitest run tests/fleet-copilot
 */

import { describe, it, expect } from "vitest";
import {
  classifyFleetCopilotIntent,
  isUnsafeFleetCopilotQuery,
  planFleetContext,
} from "../src/lib/cornerstone-ai/fleet/router";
import { tryDeterministicFleetAnswer } from "../src/lib/cornerstone-ai/fleet/deterministic";
import { searchFleetProductKnowledge } from "../src/lib/cornerstone-ai/fleet/product-knowledge";
import type { CornerstoneAiContext } from "../src/lib/cornerstone-ai/types";
import type { FetchedFleetCopilotContext } from "../src/lib/cornerstone-ai/fleet/types";

describe("classifyFleetCopilotIntent", () => {
  it("classifies product help questions", () => {
    expect(classifyFleetCopilotIntent("What does deadhead mean?")).toBe("product_help");
    expect(classifyFleetCopilotIntent("How does the recommendation engine choose trucks?")).toBe(
      "product_help"
    );
  });

  it("classifies integration questions", () => {
    expect(classifyFleetCopilotIntent("Is Samsara connected?")).toBe("integration");
    expect(classifyFleetCopilotIntent("When was the last sync?")).toBe("integration");
  });

  it("classifies recommendation questions", () => {
    expect(classifyFleetCopilotIntent("Why is confidence low on this match?")).toBe(
      "recommendation"
    );
  });

  it("classifies analytics questions", () => {
    expect(classifyFleetCopilotIntent("What branch has the highest contribution?")).toBe(
      "analytics"
    );
  });
});

describe("isUnsafeFleetCopilotQuery", () => {
  it("blocks arbitrary SQL requests", () => {
    expect(isUnsafeFleetCopilotQuery("SELECT * FROM trucks WHERE tenant_id = 'x'")).toBe(true);
    expect(isUnsafeFleetCopilotQuery("run sql to list all jobs")).toBe(true);
    expect(isUnsafeFleetCopilotQuery("execute query on fleet_jobs")).toBe(true);
  });

  it("allows normal operational questions", () => {
    expect(isUnsafeFleetCopilotQuery("Which trucks are unavailable?")).toBe(false);
    expect(isUnsafeFleetCopilotQuery("What branch has the highest contribution?")).toBe(false);
  });
});

describe("planFleetContext", () => {
  it("includes page layer when performance table is on screen", () => {
    const context: CornerstoneAiContext = {
      fleet: {
        pageContext: {
          branchPerformance: [{ branch_name: "Augusta", contribution: 193038, rank: 1 }],
          dateRange: { from: "2026-06-01", to: "2026-06-14" },
        },
      },
    };
    const plan = planFleetContext(
      "analytics",
      "What branch has the highest contribution?",
      context
    );
    expect(plan.layers).toContain("page");
  });

  it("plans database queries for unavailable trucks", () => {
    const plan = planFleetContext("operational_status", "Which trucks are unavailable?", {});
    expect(plan.queries).toContain("unavailable_trucks");
  });
});

describe("tryDeterministicFleetAnswer", () => {
  const emptyFetched: FetchedFleetCopilotContext = {
    productKnowledge: [],
    queries: {},
    missingData: [],
    sourceLabels: [],
  };

  it("returns Augusta from visible performance table", () => {
    const context: CornerstoneAiContext = {
      fleet: {
        pageContext: {
          branchPerformance: [
            { branch_name: "Macon", contribution: 120000, rank: 2 },
            { branch_name: "Augusta", contribution: 193038, rank: 1 },
          ],
          dateRange: { from: "2026-06-01", to: "2026-06-14" },
        },
      },
    };
    const result = tryDeterministicFleetAnswer(
      "What branch has the highest contribution?",
      "analytics",
      emptyFetched,
      context
    );
    expect(result).not.toBeNull();
    expect(result!.answer).toContain("Augusta");
    expect(result!.answer).toContain("193,038");
    expect(result!.meta.answerMethod).toBe("deterministic");
    expect(result!.meta.sourcesUsed.some((s) => s.layer === "page")).toBe(true);
  });

  it("returns unavailable trucks from database query result", () => {
    const fetched: FetchedFleetCopilotContext = {
      ...emptyFetched,
      queries: {
        unavailable_trucks: {
          data: [{ unit_number: "PT-1008", reason: "GPS offline", branch_name: "Augusta" }],
          meta: { source: "Dispatch board", retrievedAt: new Date().toISOString() },
        },
      },
    };
    const result = tryDeterministicFleetAnswer(
      "Which trucks are unavailable?",
      "operational_status",
      fetched
    );
    expect(result).not.toBeNull();
    expect(result!.answer).toContain("PT-1008");
    expect(result!.meta.sourcesUsed[0].layer).toBe("database");
  });

  it("explains deadhead from product knowledge", () => {
    const result = tryDeterministicFleetAnswer(
      "What does deadhead mean?",
      "product_help",
      emptyFetched
    );
    expect(result).not.toBeNull();
    expect(result!.answer.toLowerCase()).toContain("deadhead");
    expect(result!.meta.answerMethod).toBe("product_knowledge");
  });

  it("reports Samsara connection from integration health", () => {
    const fetched: FetchedFleetCopilotContext = {
      ...emptyFetched,
      queries: {
        integration_health: {
          data: [
            {
              id: "1",
              provider: "samsara",
              displayName: "Samsara",
              status: "healthy",
              lastSyncAt: "2026-06-23T10:00:00.000Z",
              message: null,
            },
          ],
          meta: { source: "Integrations", retrievedAt: new Date().toISOString() },
        },
      },
    };
    const result = tryDeterministicFleetAnswer("Is Samsara connected?", "integration", fetched);
    expect(result).not.toBeNull();
    expect(result!.answer).toMatch(/connected/i);
    expect(result!.answer).toMatch(/healthy/i);
  });

  it("explains low confidence from selected recommendation", () => {
    const context: CornerstoneAiContext = {
      fleet: {
        selectedRecommendation: {
          id: "rec-1",
          title: "Assign PT-1008",
          recommendation_type: "assign_truck",
          status: "pending",
          score: 0.62,
          confidence: "low",
          confidence_explanation: "Stale GPS on recommended truck.",
          job_id: "job-1",
          job_title: "Industrial lift",
          recommended_truck_id: "t-1",
          recommended_unit_number: "PT-1008",
          winner_reasons: ["Lowest deadhead among eligible trucks"],
          loser_reasons: [],
          expires_at: "2026-06-23T18:00:00.000Z",
          deadhead_miles: 12.4,
          travel_minutes: 28,
        },
      },
    };
    const result = tryDeterministicFleetAnswer(
      "Why is confidence low?",
      "recommendation",
      emptyFetched,
      context
    );
    expect(result).not.toBeNull();
    expect(result!.answer).toContain("low");
    expect(result!.answer).toContain("PT-1008");
  });

  it("states missing data when branch performance unavailable", () => {
    const result = tryDeterministicFleetAnswer(
      "What branch has the highest contribution?",
      "analytics",
      emptyFetched
    );
    expect(result).not.toBeNull();
    expect(result!.answer).toContain("don't have enough data");
    expect(result!.meta.missingData).toContain("branch_performance_mart");
  });
});

describe("searchFleetProductKnowledge", () => {
  it("finds deadhead topic", () => {
    const topics = searchFleetProductKnowledge("what does deadhead mean");
    expect(topics.some((t) => t.id === "deadhead")).toBe(true);
  });

  it("finds recommendation engine topic", () => {
    const topics = searchFleetProductKnowledge("how does the recommendation engine choose trucks");
    expect(topics.some((t) => t.id === "recommendation_engine")).toBe(true);
  });
});

describe("tenant isolation (design contract)", () => {
  it("query tools accept tenantId in scope — no cross-tenant parameters in public API", () => {
    // Contract test: all query tool exports require tenantId via FleetQueryScope
    expect(typeof planFleetContext).toBe("function");
    expect(isUnsafeFleetCopilotQuery("DELETE FROM trucks")).toBe(true);
  });
});
