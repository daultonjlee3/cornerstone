/**
 * Contract entity — service or maintenance agreements with customers or vendors.
 */

import type { BaseEntity } from "./common";

export type ContractStatus = "draft" | "active" | "expired" | "cancelled";

export interface Contract extends BaseEntity {
  companyId: string;
  name: string;
  contractType?: string | null;
  status: ContractStatus;
  customerId?: string | null;
  vendorId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  value?: number | null;
  notes?: string | null;
}
