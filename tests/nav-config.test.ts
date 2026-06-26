import { describe, expect, it } from "vitest";
import { getNavConfig, isNavItemActive, isFleetProductProfile, usesCmmsOnboarding } from "../app/(authenticated)/nav-config";

describe("fleet navigation config", () => {
  it("fleet_intelligence profile leads with fleet operations and hides cmms operations group", () => {
    const groups = getNavConfig("fleet_intelligence");
    const labels = groups.map((g) => g.id);
    expect(labels[0]).toBe("fleet-operations");
    expect(labels).toContain("fleet-setup");
    expect(labels).toContain("integrations");
    expect(labels).toContain("implementation");
    expect(labels).not.toContain("cmms-assets");
    expect(labels).not.toContain("cmms-operations");

    const operations = groups.find((g) => g.id === "fleet-operations");
    expect(operations?.items.map((i) => i.label)).toEqual([
      "Fleet Command Center",
      "Recommendations",
      "Dispatch Intelligence",
      "Fleet Performance",
      "Exceptions",
    ]);

    const admin = groups.find((g) => g.id === "administration");
    expect(admin?.items.some((i) => i.href === "/onboarding-wizard")).toBe(false);
    expect(labels[labels.length - 1]).toBe("administration");
    expect(labels[labels.length - 2]).toBe("fleet-setup");
  });

  it("usesCmmsOnboarding is false only for fleet_intelligence", () => {
    expect(usesCmmsOnboarding("fleet_intelligence")).toBe(false);
    expect(usesCmmsOnboarding("hybrid")).toBe(true);
    expect(usesCmmsOnboarding("cmms")).toBe(true);
  });

  it("cmms profile keeps cmms operations and excludes fleet modules", () => {
    const groups = getNavConfig("cmms");
    const ids = groups.map((g) => g.id);
    expect(ids[0]).toBe("cmms-operations");
    expect(ids).not.toContain("fleet-setup");
    expect(ids).not.toContain("integrations");
    expect(ids).not.toContain("implementation");
  });

  it("hybrid profile includes fleet and cmms sections with admin last", () => {
    const groups = getNavConfig("hybrid");
    const ids = groups.map((g) => g.id);
    expect(ids).toContain("fleet-operations");
    expect(ids).toContain("fleet-setup");
    expect(ids).toContain("implementation");
    expect(ids).toContain("cmms-operations");
    expect(ids).toContain("cmms-assets");
    expect(ids[ids.length - 1]).toBe("administration");
    expect(ids.indexOf("fleet-setup")).toBeLessThan(ids.indexOf("cmms-assets"));
    expect(ids.indexOf("cmms-assets")).toBeLessThan(ids.indexOf("administration"));

    const fleetOps = groups.find((g) => g.id === "fleet-operations");
    expect(fleetOps?.items.some((i) => i.label === "Operations Intelligence")).toBe(true);
    expect(fleetOps?.items.some((i) => i.label === "Exceptions")).toBe(true);
  });

  it("hybrid cmms assets group is collapsed by default", () => {
    const fleetAssets = getNavConfig("hybrid").find((g) => g.id === "cmms-assets");
    expect(fleetAssets?.defaultCollapsed).toBe(true);
    expect(fleetAssets?.items.some((i) => i.href === "/work-orders")).toBe(true);
  });
});

describe("isNavItemActive", () => {
  it("distinguishes command center and recommendations on /operations", () => {
    const commandCenter = { label: "Fleet Command Center", href: "/operations" };
    const recommendations = {
      label: "Recommendations",
      href: "/operations?focus=recommendations",
    };
    const params = new URLSearchParams("focus=recommendations");
    expect(isNavItemActive(recommendations, "/operations", params)).toBe(true);
    expect(isNavItemActive(commandCenter, "/operations", params)).toBe(false);

    const empty = new URLSearchParams();
    expect(isNavItemActive(commandCenter, "/operations", empty)).toBe(true);
    expect(isNavItemActive(recommendations, "/operations", empty)).toBe(false);
  });

  it("distinguishes integrations and webhooks focus", () => {
    const integrations = { label: "Integrations", href: "/settings/integrations" };
    const webhooks = {
      label: "API & Webhooks",
      href: "/settings/integrations?focus=webhooks",
    };
    const webhookParams = new URLSearchParams("focus=webhooks");
    expect(isNavItemActive(webhooks, "/settings/integrations", webhookParams)).toBe(true);
    expect(isNavItemActive(integrations, "/settings/integrations", webhookParams)).toBe(false);
  });
});

describe("isFleetProductProfile", () => {
  it("returns true for fleet and hybrid", () => {
    expect(isFleetProductProfile("fleet_intelligence")).toBe(true);
    expect(isFleetProductProfile("hybrid")).toBe(true);
    expect(isFleetProductProfile("cmms")).toBe(false);
  });
});
