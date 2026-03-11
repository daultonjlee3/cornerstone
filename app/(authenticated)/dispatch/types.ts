/**
 * Dispatch module types. Used by DispatchView, dispatch-data, and board utils.
 */

export type DispatchWorkOrder = {
  id: string;
  work_order_number?: string | null;
  title?: string | null;
  status?: string | null;
  priority?: string | null;
  category?: string | null;
  scheduled_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  due_date?: string | null;
  assigned_crew_id?: string | null;
  assigned_crew_name?: string | null;
  assigned_technician_id?: string | null;
  assigned_technician_name?: string | null;
  estimated_hours?: number | null;
  company_id?: string | null;
  property_id?: string | null;
  building_id?: string | null;
  unit_id?: string | null;
  asset_id?: string | null;
  asset_name?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_coordinate_source?: "work_order" | "asset" | "building" | "property" | null;
  location_coordinate_accuracy?: "exact" | "fallback" | null;
  assignment_type?: "technician" | "crew" | "unassigned";
  /** Resolved display: "Property / Building / Unit" */
  property_name?: string | null;
  building_name?: string | null;
  unit_name?: string | null;
  /** PM-generated work order */
  source_type?: string | null;
  preventive_maintenance_plan_id?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

export type DispatchCrew = {
  id: string;
  name?: string | null;
  company_id?: string | null;
  scheduled_today?: DispatchWorkOrder[];
  /** Total scheduled hours for the selected day (for utilization). */
  total_scheduled_hours?: number;
  /** Job count on the selected day. */
  job_count?: number;
};
