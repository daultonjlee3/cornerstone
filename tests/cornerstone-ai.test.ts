/**
 * Unit tests for Cornerstone AI v1: intent classification, response formatting, help retrieval.
 * Run: npx vitest run tests/cornerstone-ai
 */

import { describe, it, expect } from "vitest";
import { classifyAiIntent } from "../src/lib/cornerstone-ai/intent";
import { formatAiResponse, sourcesFromHelpSections } from "../src/lib/cornerstone-ai/format";
import {
  getAllHelpSections,
  getHelpDocByModule,
  searchHelpDocs,
  type HelpSection,
} from "../src/lib/cornerstone-ai/help";

describe("classifyAiIntent", () => {
  it("classifies help questions", () => {
    expect(classifyAiIntent("How do I create a work order?")).toBe("HELP");
    expect(classifyAiIntent("What does In Progress mean?")).toBe("HELP");
    expect(classifyAiIntent("How do PM schedules work?")).toBe("HELP");
    expect(classifyAiIntent("Help with dispatch")).toBe("HELP");
  });

  it("classifies ops queries", () => {
    expect(classifyAiIntent("What work orders are overdue?")).toBe("OPS_QUERY");
    expect(classifyAiIntent("What is due today?")).toBe("OPS_QUERY");
    expect(classifyAiIntent("Which technicians are overloaded?")).toBe("OPS_QUERY");
    expect(classifyAiIntent("Summarize open work orders")).toBe("OPS_QUERY");
    expect(classifyAiIntent("What PMs are due this week?")).toBe("OPS_QUERY");
  });

  it("classifies record summary when context has entity", () => {
    expect(
      classifyAiIntent("Summarize this work order for a supervisor.", {
        entityType: "work_order",
        entityId: "wo-1",
      })
    ).toBe("RECORD_SUMMARY");
    expect(
      classifyAiIntent("Summarize this asset's service history.", {
        entityType: "asset",
        entityId: "a-1",
      })
    ).toBe("RECORD_SUMMARY");
  });

  it("classifies list summary", () => {
    expect(classifyAiIntent("Summarize the current open work order queue.")).toBe("LIST_SUMMARY");
    expect(classifyAiIntent("Explain this queue")).toBe("LIST_SUMMARY");
    expect(
      classifyAiIntent("Summarize the list", { entityType: "list" })
    ).toBe("LIST_SUMMARY");
  });

  it("returns UNKNOWN for empty or unclassifiable", () => {
    expect(classifyAiIntent("")).toBe("UNKNOWN");
    expect(classifyAiIntent("   ")).toBe("UNKNOWN");
    expect(classifyAiIntent("Random text xyz")).toBe("UNKNOWN");
  });
});

describe("formatAiResponse", () => {
  it("returns structured response with answer and parsed JSON block", () => {
    const raw =
      'Here is the summary.\n\n{"bulletHighlights":["A","B"],"followUpSuggestions":["Show overdue only"]}';
    const r = formatAiResponse(raw, "OPS_QUERY", "FULL");
    expect(r.intent).toBe("OPS_QUERY");
    expect(r.answer).toContain("summary");
    expect(r.bulletHighlights).toEqual(["A", "B"]);
    expect(r.followUpSuggestions).toEqual(["Show overdue only"]);
    expect(r.mode).toBe("FULL");
    expect(r.sources).toEqual([]);
  });

  it("handles missing JSON block", () => {
    const r = formatAiResponse("Just a plain answer.", "HELP", "LIGHT");
    expect(r.answer).toBe("Just a plain answer.");
    expect(r.bulletHighlights).toEqual([]);
    expect(r.followUpSuggestions).toEqual([]);
  });

  it("uses default answer when content is empty after strip", () => {
    const r = formatAiResponse('{"bulletHighlights":[],"followUpSuggestions":[]}', "HELP", "LIGHT");
    expect(r.answer).toContain("couldn");
  });

  it("applies options (sources, warnings)", () => {
    const r = formatAiResponse("Ok.", "HELP", "LIGHT", {
      sources: [{ title: "Work Orders" }],
      warnings: ["Near limit"],
    });
    expect(r.sources).toHaveLength(1);
    expect(r.sources![0].title).toBe("Work Orders");
    expect(r.warnings).toEqual(["Near limit"]);
  });
});

describe("sourcesFromHelpSections", () => {
  it("maps help sections to source refs", () => {
    const sections: HelpSection[] = [
      { moduleKey: "work-orders", moduleName: "Work Orders", title: "Create WO", content: "", path: "/work-orders" },
    ];
    const refs = sourcesFromHelpSections(sections);
    expect(refs).toHaveLength(1);
    expect(refs[0].title).toBe("Create WO");
    expect(refs[0].moduleKey).toBe("work-orders");
  });
});

describe("help retrieval", () => {
  it("getAllHelpSections returns array", () => {
    const sections = getAllHelpSections();
    expect(Array.isArray(sections)).toBe(true);
    if (sections.length > 0) {
      expect(sections[0]).toHaveProperty("moduleKey");
      expect(sections[0]).toHaveProperty("title");
      expect(sections[0]).toHaveProperty("content");
    }
  });

  it("getHelpDocByModule returns sections for known module", () => {
    const result = getHelpDocByModule("work-orders");
    expect(result).toHaveProperty("sections");
    expect(result).toHaveProperty("docExcerpt");
    expect(Array.isArray(result.sections)).toBe(true);
  });

  it("searchHelpDocs returns matching sections", () => {
    const sections = searchHelpDocs("work order");
    expect(Array.isArray(sections)).toBe(true);
  });

  it("searchHelpDocs returns empty for empty query", () => {
    expect(searchHelpDocs("")).toEqual([]);
    expect(searchHelpDocs("   ")).toEqual([]);
  });
});
