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
