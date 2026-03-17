/**
 * Temporary feature flags for scoping the product surface.
 * These modules remain implemented in the backend but are hidden in the UI.
 */

export const featureFlags = {
  customers: false,
  invoicing: false,
  contracts: false,
} as const;

