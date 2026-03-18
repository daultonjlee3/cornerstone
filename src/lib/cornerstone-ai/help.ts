/**
 * Help content for Cornerstone AI: in-app docs and tour guidance.
 * Used to ground HELP intent answers. No CMS; static content + tour config.
 */

import { tourConfigs, demoGuidedTourConfig } from "@/src/lib/tours/config";
import type { TourConfig } from "@/src/lib/tours/types";

const MODULE_KEYS = [
  "operations-center",
  "work-orders",
  "dispatch",
  "assets",
  "preventive-maintenance",
  "inventory",
  "requests",
  "technicians",
  "properties",
  "buildings",
  "vendors",
  "purchase-orders",
  "reports",
] as const;

export type HelpSection = {
  moduleKey: string;
  moduleName: string;
  title: string;
  content: string;
  path?: string;
};

/** Build help sections from tour configs (title + content per step). */
function getTourHelpSections(): HelpSection[] {
  const sections: HelpSection[] = [];
  const configs: TourConfig[] = [demoGuidedTourConfig, ...tourConfigs];
  for (const config of configs) {
    const moduleKey = config.id;
    const moduleName = config.name ?? config.id;
    for (const step of config.steps ?? []) {
      sections.push({
        moduleKey,
        moduleName,
        title: step.title ?? step.id,
        content: step.content ?? "",
        path: config.path,
      });
    }
  }
  return sections;
}

let cachedTourSections: HelpSection[] | null = null;

function getCachedTourSections(): HelpSection[] {
  if (!cachedTourSections) cachedTourSections = getTourHelpSections();
  return cachedTourSections;
}

/** Load markdown from docs/modules if available (server-only). */
function loadModuleDoc(moduleKey: string): string | null {
  try {
    const fs = require("fs");
    const path = require("path");
    const base = process.cwd();
    const filePath = path.join(base, "docs", "modules", `${moduleKey}.md`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8") as string;
    }
  } catch {
    // Ignore: docs may not be present in all environments
  }
  return null;
}

/** All help sections (tour steps + optional doc excerpts). Used for search. */
export function getAllHelpSections(): HelpSection[] {
  return getCachedTourSections();
}

/** Get help content for a specific module (tour steps + doc if present). */
export function getHelpDocByModule(moduleKey: string): { sections: HelpSection[]; docExcerpt: string | null } {
  const norm = (k: string) => k.toLowerCase().replace(/-/g, "");
  const tourSections = getCachedTourSections().filter(
    (s) => norm(s.moduleKey) === norm(moduleKey)
  );
  const doc = loadModuleDoc(moduleKey);
  return { sections: tourSections, docExcerpt: doc };
}

/** Simple keyword search over tour help sections. Returns sections with matching title or content. */
export function searchHelpDocs(query: string): HelpSection[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const all = getCachedTourSections();
  return all.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q) ||
      s.moduleName.toLowerCase().includes(q)
  );
}

/** Get page/route help context (e.g. for "What is this page for?"). */
export function getPageHelpContext(routeOrModuleKey: string): HelpSection[] {
  const key = routeOrModuleKey.replace(/^\//, "").replace(/\//g, "-") || "operations";
  const byModule = getHelpDocByModule(key);
  if (byModule.sections.length) return byModule.sections;
  const all = getCachedTourSections();
  const pathMatch = all.filter((s) => s.path && routeOrModuleKey.startsWith(s.path));
  return pathMatch.length ? pathMatch : all.slice(0, 5);
}

export { MODULE_KEYS };
