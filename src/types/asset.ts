/**
 * Asset entity — equipment, systems, or physical items maintained (e.g. HVAC, elevators).
 * Can be linked to a building or unit.
 */

import type { BaseEntity } from "./common";

export interface Asset extends BaseEntity {
  companyId: string;
  buildingId?: string | null;
  unitId?: string | null;
  name: string;
  assetType?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  installDate?: string | null;
  warrantyExpires?: string | null;
  notes?: string | null;
}
