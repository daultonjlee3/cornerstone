/**
 * Technician entity — internal staff or contractors who perform work orders.
 */

import type { BaseEntity } from "./common";

export interface Technician extends BaseEntity {
  companyId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  employeeId?: string | null;
  skills?: string[] | null;
  isActive?: boolean;
  notes?: string | null;
}
