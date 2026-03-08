/**
 * Invoice entity — billing documents for work orders or contracts.
 */

import type { BaseEntity } from "./common";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface Invoice extends BaseEntity {
  companyId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  customerId: string;
  workOrderId?: string | null;
  contractId?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
  notes?: string | null;
}
