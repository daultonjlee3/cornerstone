/**
 * InventoryItem entity — parts, supplies, or materials tracked by the company.
 */

import type { BaseEntity } from "./common";

/**
 * Legacy inventory item model. Kept for backwards compatibility.
 */
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

export interface Product extends BaseEntity {
  companyId: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  category?: string | null;
  unitOfMeasure?: string | null;
  defaultVendorId?: string | null;
  defaultCost?: number | null;
  reorderPointDefault?: number | null;
  active: boolean;
}

export interface StockLocation extends BaseEntity {
  companyId: string;
  propertyId?: string | null;
  buildingId?: string | null;
  unitId?: string | null;
  name: string;
  locationType:
    | "warehouse"
    | "maintenance_shop"
    | "property_storage"
    | "building_storage"
    | "unit_storage"
    | "truck"
    | "other";
  active: boolean;
  isDefault: boolean;
}

export interface InventoryBalance extends BaseEntity {
  productId: string;
  stockLocationId: string;
  quantityOnHand: number;
  minimumStock?: number | null;
  reorderPoint?: number | null;
  lastCountedAt?: string | null;
}

export interface InventoryTransaction extends BaseEntity {
  companyId?: string | null;
  productId?: string | null;
  stockLocationId?: string | null;
  quantityChange: number;
  transactionType:
    | "purchase_received"
    | "work_order_usage"
    | "adjustment"
    | "transfer_in"
    | "transfer_out";
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
}

export interface PurchaseOrder extends BaseEntity {
  companyId: string;
  vendorId: string;
  poNumber: string;
  status: "draft" | "ordered" | "partially_received" | "received" | "cancelled";
  orderDate?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  totalCost: number;
}

export interface PurchaseOrderLine extends BaseEntity {
  purchaseOrderId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice?: number | null;
  lineTotal?: number | null;
  receivedQuantity: number;
}

export interface WorkOrderPartUsed extends BaseEntity {
  workOrderId: string;
  productId?: string | null;
  stockLocationId?: string | null;
  quantityUsed: number;
  notes?: string | null;
}
