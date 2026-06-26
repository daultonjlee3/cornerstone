/**
 * Context-aware suggested prompts for Fleet Intelligence Copilot.
 */

import type { FleetCopilotScreen } from "./types";

export type CopilotPromptCategory = {
  id: string;
  label: string;
  prompts: string[];
};

const DISPATCH_SELECTED: CopilotPromptCategory = {
  id: "selected_recommendation",
  label: "Selected recommendation",
  prompts: [
    "Why is this truck recommended?",
    "What happens if I reject this recommendation?",
    "Which alternatives were considered?",
    "Why is confidence low?",
    "What is the revenue impact if I accept?",
  ],
};

const DISPATCH_WORKSPACE: CopilotPromptCategory = {
  id: "dispatch_workspace",
  label: "Dispatch Workspace",
  prompts: [
    "Which jobs are still unassigned?",
    "Which recommendation has the highest impact?",
    "Which trucks are unavailable?",
    "Where is revenue at risk?",
  ],
};

const COMMAND_CENTER: CopilotPromptCategory = {
  id: "command_center",
  label: "Command Center",
  prompts: [
    "What needs attention today?",
    "Is dispatch ready?",
    "What is the biggest risk?",
    "What should I do first?",
    "Where is revenue at risk today?",
  ],
};

const FLEET_PERFORMANCE: CopilotPromptCategory = {
  id: "fleet_performance",
  label: "Fleet Performance",
  prompts: [
    "What branch has the highest contribution?",
    "Which truck is the most profitable?",
    "What is driving deadhead this week?",
    "Which operator has the highest contribution?",
  ],
};

const FLEET_OPERATIONS: CopilotPromptCategory = {
  id: "fleet_operations",
  label: "Live execution",
  prompts: [
    "Which jobs are running late?",
    "Which trucks are idle right now?",
    "What exceptions need attention?",
    "Which unassigned jobs are most urgent?",
  ],
};

const INTEGRATIONS: CopilotPromptCategory = {
  id: "integrations",
  label: "Integrations",
  prompts: [
    "Which systems are unhealthy?",
    "When was the last sync?",
    "What data is missing?",
    "Is Samsara connected?",
  ],
};

const PRODUCT_HELP: CopilotPromptCategory = {
  id: "product_help",
  label: "How Cornerstone works",
  prompts: [
    "How does the recommendation engine choose trucks?",
    "What does deadhead mean?",
    "Where does contribution come from?",
    "What screen should I use to review live execution?",
  ],
};

export function resolveFleetCopilotScreen(pathname: string): FleetCopilotScreen {
  if (pathname.startsWith("/dispatch")) return "dispatch";
  if (pathname.startsWith("/operations")) return "command_center";
  if (pathname.startsWith("/reports/operations")) return "performance";
  if (pathname.startsWith("/settings/integrations") || pathname.startsWith("/implementation")) {
    return pathname.startsWith("/implementation") ? "implementation" : "integrations";
  }
  if (
    pathname.startsWith("/fleet") ||
    pathname.startsWith("/performance") ||
    pathname.startsWith("/exceptions")
  ) {
    return "operations";
  }
  return "default";
}

export function getFleetCopilotPromptCategories(
  screen: FleetCopilotScreen,
  hasSelectedRecommendation: boolean
): CopilotPromptCategory[] {
  if (screen === "dispatch") {
    return hasSelectedRecommendation
      ? [DISPATCH_SELECTED, DISPATCH_WORKSPACE, PRODUCT_HELP]
      : [DISPATCH_WORKSPACE, INTEGRATIONS, PRODUCT_HELP];
  }
  if (screen === "command_center") {
    return [COMMAND_CENTER, FLEET_PERFORMANCE, INTEGRATIONS];
  }
  if (screen === "performance") {
    return [FLEET_PERFORMANCE, PRODUCT_HELP, INTEGRATIONS];
  }
  if (screen === "operations") {
    return [FLEET_OPERATIONS, FLEET_PERFORMANCE, INTEGRATIONS];
  }
  if (screen === "integrations" || screen === "implementation") {
    return [INTEGRATIONS, COMMAND_CENTER, PRODUCT_HELP];
  }
  return [COMMAND_CENTER, DISPATCH_WORKSPACE, FLEET_PERFORMANCE, INTEGRATIONS, PRODUCT_HELP];
}

export function flattenFleetCopilotPrompts(
  categories: CopilotPromptCategory[],
  limit = 6
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cat of categories) {
    for (const prompt of cat.prompts) {
      if (seen.has(prompt)) continue;
      seen.add(prompt);
      out.push(prompt);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
