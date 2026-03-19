import type { GuidanceStep } from "./types";

const DEFAULT_ATTEMPTS = 8;
const ATTEMPT_DELAY_MS = 120;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isElementVisible(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export async function resolveAvailableSteps(
  steps: GuidanceStep[],
  attempts = DEFAULT_ATTEMPTS
): Promise<GuidanceStep[]> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const available = steps.filter((step) => isElementVisible(document.querySelector(step.selector)));
    if (available.length > 0 || attempt === attempts - 1) {
      return available;
    }
    await delay(ATTEMPT_DELAY_MS);
  }
  return [];
}
