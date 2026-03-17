/**
 * Shared types used across Cornerstone entities.
 * All entities are multi-tenant and keyed by companyId where applicable.
 */

/** ISO date string for timestamps (Supabase-friendly). */
export type Timestamp = string;

/** UUID string for primary/foreign keys (Supabase default). */
export type Id = string;

/** Base fields present on most entities for auditing and multi-tenancy. */
export interface BaseEntity {
  id: Id;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Optional base fields for create payloads (id and timestamps are server-generated). */
export type CreateBase = Omit<BaseEntity, "id" | "createdAt" | "updatedAt">;

// ─── Shared "option" types ────────────────────────────────────────────────────
// Used in dropdowns/selects across many modules. Defined once here instead of
// being re-declared (identically) in every component file that uses them.

export type CompanyOption = { id: string; name: string };
export type TechnicianOption = { id: string; name: string; company_id?: string | null };
export type VendorOption = { id: string; name: string; company_id: string; service_type?: string | null };
export type PropertyOption = { id: string; name: string; company_id: string };
export type BuildingOption = { id: string; name: string; property_id: string };
export type UnitOption = { id: string; name: string; building_id: string };
export type AssetOption = {
  id: string;
  name: string;
  company_id: string;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
};
export type CrewOption = { id: string; name: string; company_id?: string | null };
