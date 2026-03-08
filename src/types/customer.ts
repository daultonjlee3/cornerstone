/**
 * Customer entity — companies or contacts that receive service.
 * Scoped to a company (tenant).
 */

import type { BaseEntity } from "./common";

export interface Customer extends BaseEntity {
  companyId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  billingAddress?: string | null;
  notes?: string | null;
}
