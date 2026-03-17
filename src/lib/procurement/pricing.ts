/**
 * Centralized pricing and taxability resolution for procurement.
 * Use product default + vendor pricing override; avoid duplicating logic in UI and API.
 */

/** Product default: taxable = true/false. Vendor override: null = use product default; true/false = explicit. */
export function resolveTaxable(
  productTaxableDefault: boolean,
  vendorTaxOverride: boolean | null
): boolean {
  if (vendorTaxOverride === true) return true;
  if (vendorTaxOverride === false) return false;
  return productTaxableDefault;
}

/** Human-readable tax treatment for display (inherited vs explicit). */
export type TaxTreatmentLabel = "Use product default" | "Taxable" | "Non-taxable";

export function getTaxTreatmentLabel(
  vendorTaxOverride: boolean | null,
  productTaxableDefault: boolean
): TaxTreatmentLabel {
  if (vendorTaxOverride === true) return "Taxable";
  if (vendorTaxOverride === false) return "Non-taxable";
  return "Use product default";
}

/** Resolved display: what the effective taxable status is when using "use product default". */
export function getEffectiveTaxableDisplay(
  vendorTaxOverride: boolean | null,
  productTaxableDefault: boolean
): string {
  const effective = resolveTaxable(productTaxableDefault, vendorTaxOverride);
  if (vendorTaxOverride != null) return effective ? "Taxable" : "Non-taxable";
  return effective ? "Taxable (product default)" : "Non-taxable (product default)";
}
