/**
 * Help content for Cornerstone AI: in-app docs. Used to ground HELP intent answers.
 * Module docs are loaded from docs/modules when present.
 */

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

function moduleNameFromKey(moduleKey: string): string {
  return moduleKey
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** All help sections from static module list + optional doc excerpts. */
export function getAllHelpSections(): HelpSection[] {
  const sections: HelpSection[] = [];
  for (const key of MODULE_KEYS) {
    const doc = loadModuleDoc(key);
    if (doc?.trim()) {
      sections.push({
        moduleKey: key,
        moduleName: moduleNameFromKey(key),
        title: moduleNameFromKey(key),
        content: doc.slice(0, 4000),
      });
    }
  }
  return sections;
}

/** Get help content for a specific module (doc excerpt if present). */
export function getHelpDocByModule(moduleKey: string): {
  sections: HelpSection[];
  docExcerpt: string | null;
} {
  const doc = loadModuleDoc(moduleKey);
  if (!doc?.trim()) return { sections: [], docExcerpt: null };
  return {
    sections: [
      {
        moduleKey,
        moduleName: moduleNameFromKey(moduleKey),
        title: moduleNameFromKey(moduleKey),
        content: doc.slice(0, 4000),
      },
    ],
    docExcerpt: doc,
  };
}

/** Simple keyword search over help sections. */
export function searchHelpDocs(query: string): HelpSection[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return getAllHelpSections().filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q) ||
      s.moduleName.toLowerCase().includes(q)
  );
}

/** Page/route help context (e.g. for "What is this page for?"). */
export function getPageHelpContext(routeOrModuleKey: string): HelpSection[] {
  const key =
    routeOrModuleKey.replace(/^\//, "").replace(/\//g, "-") || "operations";
  const { sections } = getHelpDocByModule(key);
  if (sections.length) return sections;
  const all = getAllHelpSections();
  return all.slice(0, 5);
}

export { MODULE_KEYS };
