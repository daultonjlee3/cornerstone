/**
 * Company entity — top-level tenant in the multi-tenant SaaS model.
 * One company owns buildings, units, customers, assets, vendors, technicians, work orders, contracts, invoices, and inventory.
 */

import type { BaseEntity } from "./common";

export interface Company extends BaseEntity {
  name: string;
  slug?: string;
  logoUrl?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  timezone?: string;
  currency?: string;
}
