/**
 * Vendor entity — external contractors or suppliers used by the company.
 */

import type { BaseEntity } from "./common";

export interface Vendor extends BaseEntity {
  companyId: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  preferredVendor?: boolean;
  serviceTypes?: string[] | null;
  notes?: string | null;
}
