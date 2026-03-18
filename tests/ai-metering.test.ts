/**
 * Unit tests for AI metering: pricing, credits, and quota decision logic.
 * Run: npx vitest run tests/ai-metering
 */

import { describe, it, expect } from "vitest";
import {
  getModelPricing,
  estimateRequestCostUsd,
} from "../src/lib/ai/pricing";
import { costUsdToCredits, creditsToUsd } from "../src/lib/ai/credits";
import { computeQuotaDecision } from "../src/lib/ai/metering";
import type { TenantAiConfig } from "../src/lib/ai/types";

describe("pricing", () => {
  it("returns pricing for known model", () => {
    const p = getModelPricing("openai", "gpt-4o-mini");
    expect(p).toBeDefined();
    expect(p!.inputPer1k).toBe(0.00015);
    expect(p!.outputPer1k).toBe(0.0006);
  });

  it("returns undefined for unknown model", () => {
    expect(getModelPricing("unknown", "model")).toBeUndefined();
  });

  it("estimates request cost correctly", () => {
    const cost = estimateRequestCostUsd("openai", "gpt-4o-mini", 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeCloseTo(0.00015 + 0.0003, 6);
  });
});

describe("credits", () => {
  it("converts USD to credits", () => {
    expect(costUsdToCredits(0)).toBe(0);
    expect(costUsdToCredits(1)).toBe(100);
    expect(costUsdToCredits(0.01)).toBe(1);
  });

  it("credits to USD roundtrip", () => {
    const usd = 0.05;
    const credits = costUsdToCredits(usd);
    expect(creditsToUsd(credits)).toBeCloseTo(usd, 4);
  });
});

function defaultConfig(overrides: Partial<TenantAiConfig> = {}): TenantAiConfig {
  return {
    id: "id",
    tenantId: "t1",
    aiEnabled: true,
    monthlyIncludedCostUsd: 20,
    monthlySoftLimitUsd: 30,
    monthlyHardLimitUsd: 40,
    warningThresholdPercent: 80,
    overagePolicy: "DEGRADE_TO_LIGHT",
    lightModelOnlyOverSoftLimit: true,
    includedCreditsMonthly: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("computeQuotaDecision", () => {
  it("under limit allows full mode", () => {
    const config = defaultConfig();
    const d = computeQuotaDecision(config, 5, 1, "FULL");
    expect(d.allowed).toBe(true);
    expect(d.mode).toBe("FULL");
    expect(d.hardLimitReached).toBe(false);
  });

  it("over soft limit degrades to light when policy is DEGRADE_TO_LIGHT", () => {
    const config = defaultConfig();
    const d = computeQuotaDecision(config, 32, 1, "FULL");
    expect(d.allowed).toBe(true);
    expect(d.mode).toBe("LIGHT");
    expect(d.softLimitReached).toBe(true);
  });

  it("over hard limit blocks when policy is BLOCK", () => {
    const config = defaultConfig({ overagePolicy: "BLOCK" });
    const d = computeQuotaDecision(config, 41, 1, "FULL");
    expect(d.allowed).toBe(false);
    expect(d.mode).toBe("BLOCKED");
    expect(d.hardLimitReached).toBe(true);
  });

  it("no tenant config (defaults) used when no row", () => {
    const config = defaultConfig();
    const d = computeQuotaDecision(config, 0, 0.5, "FULL");
    expect(d.allowed).toBe(true);
    expect(d.mode).toBe("FULL");
  });

  it("ai disabled blocks", () => {
    const config = defaultConfig({ aiEnabled: false });
    const d = computeQuotaDecision(config, 0, 1, "FULL");
    expect(d.allowed).toBe(false);
    expect(d.mode).toBe("BLOCKED");
  });

  it("invalid config: hard < soft would be rejected by DB; decision still uses config values", () => {
    const config = defaultConfig({ monthlyHardLimitUsd: 25, monthlySoftLimitUsd: 30 });
    const d = computeQuotaDecision(config, 20, 5, "FULL");
    expect(d.remainingEstimatedBudgetUsd).toBe(5);
  });
});
