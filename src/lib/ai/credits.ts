/**
 * Credits abstraction for AI usage.
 * Cost (USD) is source of truth; credits are derived for UI/marketing (e.g. "AI credits included").
 * Conversion is centralized here so it can be tuned without scattering literals.
 */

/** USD to credits: 1 USD = this many credits. Tune for friendly numbers (e.g. $0.01 = 1 credit). */
const USD_TO_CREDITS = 100;

/**
 * Convert estimated cost (USD) to credits for display and storage.
 */
export function costUsdToCredits(costUsd: number): number {
  if (!Number.isFinite(costUsd) || costUsd < 0) return 0;
  return Math.round(costUsd * USD_TO_CREDITS * 10000) / 10000;
}

/**
 * Convert credits back to approximate USD (for reporting). Not used for enforcement.
 */
export function creditsToUsd(credits: number): number {
  if (!Number.isFinite(credits) || credits < 0) return 0;
  return credits / USD_TO_CREDITS;
}
