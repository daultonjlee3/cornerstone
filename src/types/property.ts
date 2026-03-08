/**
 * Property-related entities: Building and Unit.
 * Buildings belong to a company; units belong to a building.
 */

import type { BaseEntity } from "./common";

export interface Building extends BaseEntity {
  companyId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}

export interface Unit extends BaseEntity {
  buildingId: string;
  nameOrNumber: string;
  floor?: string | null;
  squareFootage?: number | null;
  notes?: string | null;
}
