/**
 * InventoryItem entity — parts, supplies, or materials tracked by the company.
 */

import type { BaseEntity } from "./common";

export interface InventoryItem extends BaseEntity {
  companyId: string;
  name: string;
  sku?: string | null;
  quantity: number;
  unit?: string | null;
  minQuantity?: number | null;
  location?: string | null;
  cost?: number | null;
  notes?: string | null;
}
