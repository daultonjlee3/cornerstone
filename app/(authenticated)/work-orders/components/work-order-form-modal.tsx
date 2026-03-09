"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

export type WorkOrder = {
  id: string;
  work_order_number: string | null;
  title: string;
  company_id: string;
  customer_id: string | null;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
  asset_id: string | null;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  requested_by_name: string | null;
  requested_by_email: string | null;
  requested_by_phone: string | null;
  requested_at: string | null;
  scheduled_date: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  due_date: string | null;
  assigned_technician_id: string | null;
  assigned_crew_id: string | null;
  estimated_hours: number | null;
  estimated_technicians: number | null;
  actual_hours: number | null;
  billable: boolean;
  nte_amount: number | null;
  updated_at?: string | null;
  completed_at?: string | null;
};

type CompanyOption = { id: string; name: string };
type CustomerOption = { id: string; name: string; company_id: string };
type PropertyOption = { id: string; name: string; company_id: string };
type BuildingOption = { id: string; name: string; property_id: string };
type UnitOption = { id: string; name: string; building_id: string };
type AssetOption = {
  id: string;
  name: string;
  company_id: string;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
};
type TechnicianOption = { id: string; name: string };
type CrewOption = { id: string; name: string; company_id: string | null };

export type WorkOrderPrefill = {
  company_id?: string;
  customer_id?: string;
  property_id?: string;
  building_id?: string;
  unit_id?: string;
  asset_id?: string;
  /** Prefill title when creating from asset/location (e.g. "AC - Maintenance"). */
  title?: string;
  /** Prefill description when creating from asset (e.g. asset details). */
  description?: string;
};

type WorkOrderFormModalProps = {
  open: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  prefill: WorkOrderPrefill | null;
  companies: CompanyOption[];
  customers: CustomerOption[];
  properties: PropertyOption[];
  buildings: BuildingOption[];
  units: UnitOption[];
  assets: AssetOption[];
  technicians: TechnicianOption[];
  crews: CrewOption[];
  saveAction: (
    prev: { error?: string; success?: boolean },
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean }>;
};

/** Wraps a date or datetime input with a calendar button that opens the native picker. Input remains typeable. */
function DateInputWithPicker({
  id,
  name,
  type,
  defaultValue,
  className,
  "aria-label": ariaLabel,
}: {
  id: string;
  name: string;
  type: "date" | "datetime-local";
  defaultValue: string;
  className: string;
  "aria-label"?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    try {
      (inputRef.current as HTMLInputElement & { showPicker?: () => void })?.showPicker?.();
    } catch {
      inputRef.current?.focus();
    }
  };
  return (
    <div className="relative flex">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className={className + " pr-10"}
        aria-label={ariaLabel}
        placeholder={type === "date" ? "mm/dd/yyyy" : "mm/dd/yyyy --:--"}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        aria-label="Open calendar"
      >
        <CalendarIcon />
      </button>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

const emptyWorkOrder: WorkOrder = {
  id: "",
  work_order_number: "",
  title: "",
  company_id: "",
  customer_id: null,
  property_id: null,
  building_id: null,
  unit_id: null,
  asset_id: null,
  description: null,
  category: null,
  priority: "medium",
  status: "open",
  requested_by_name: null,
  requested_by_email: null,
  requested_by_phone: null,
  requested_at: null,
  scheduled_date: null,
  scheduled_start: null,
  scheduled_end: null,
  due_date: null,
  assigned_technician_id: null,
  assigned_crew_id: null,
  estimated_hours: null,
  estimated_technicians: null,
  actual_hours: null,
  billable: true,
  nte_amount: null,
};

const PRIORITIES = ["low", "medium", "high", "urgent", "emergency"] as const;
const STATUSES = ["open", "assigned", "in_progress", "on_hold", "completed", "cancelled", "closed"] as const;
const CATEGORIES = [
  "repair",
  "preventive_maintenance",
  "inspection",
  "installation",
  "emergency",
  "general",
] as const;

function getInitialLocation(
  workOrder: WorkOrder | null,
  prefill: WorkOrderPrefill | null
): {
  companyId: string;
  customerId: string;
  propertyId: string;
  buildingId: string;
  unitId: string;
  assetId: string;
} {
  if (workOrder?.id) {
    return {
      companyId: workOrder.company_id ?? "",
      customerId: workOrder.customer_id ?? "",
      propertyId: workOrder.property_id ?? "",
      buildingId: workOrder.building_id ?? "",
      unitId: workOrder.unit_id ?? "",
      assetId: workOrder.asset_id ?? "",
    };
  }
  if (prefill) {
    return {
      companyId: prefill.company_id ?? "",
      customerId: prefill.customer_id ?? "",
      propertyId: prefill.property_id ?? "",
      buildingId: prefill.building_id ?? "",
      unitId: prefill.unit_id ?? "",
      assetId: prefill.asset_id ?? "",
    };
  }
  return {
    companyId: "",
    customerId: "",
    propertyId: "",
    buildingId: "",
    unitId: "",
    assetId: "",
  };
}

export function WorkOrderFormModal({
  open,
  onClose,
  workOrder,
  prefill,
  companies,
  customers,
  properties,
  buildings,
  units,
  assets,
  technicians,
  crews,
  saveAction,
}: WorkOrderFormModalProps) {
  const isEdit = !!workOrder?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  const initial = useMemo(
    () => getInitialLocation(workOrder, prefill),
    [workOrder?.id, prefill, open]
  );

  const [companyId, setCompanyId] = useState(initial.companyId);
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [propertyId, setPropertyId] = useState(initial.propertyId);
  const [buildingId, setBuildingId] = useState(initial.buildingId);
  const [unitId, setUnitId] = useState(initial.unitId);
  const [assetId, setAssetId] = useState(initial.assetId);

  useEffect(() => {
    if (!open) return;
    const next = getInitialLocation(workOrder, prefill);
    setCompanyId(next.companyId);
    setCustomerId(next.customerId);
    setPropertyId(next.propertyId);
    setBuildingId(next.buildingId);
    setUnitId(next.unitId);
    setAssetId(next.assetId);
  }, [open, workOrder?.id, prefill?.company_id, prefill?.customer_id, prefill?.property_id, prefill?.building_id, prefill?.unit_id, prefill?.asset_id]);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const propertiesFiltered = useMemo(
    () => (companyId ? properties.filter((p) => p.company_id === companyId) : []),
    [companyId, properties]
  );
  const buildingsFiltered = useMemo(() => {
    let list = propertyId ? buildings.filter((b) => b.property_id === propertyId) : [];
    if (buildingId && !list.some((b) => b.id === buildingId)) {
      const bld = buildings.find((b) => b.id === buildingId);
      if (bld) list = [bld, ...list];
    }
    return list;
  }, [propertyId, buildings, buildingId]);
  const buildingIdsForProperty = useMemo(
    () => buildingsFiltered.map((b) => b.id),
    [buildingsFiltered]
  );
  const unitsFiltered = useMemo(() => {
    let list: typeof units;
    if (buildingId) list = units.filter((u) => u.building_id === buildingId);
    else if (propertyId && buildingIdsForProperty.length) list = units.filter((u) => buildingIdsForProperty.includes(u.building_id));
    else list = [];
    if (unitId && !list.some((u) => u.id === unitId)) {
      const unit = units.find((u) => u.id === unitId);
      if (unit) list = [unit, ...list];
    }
    return list;
  }, [buildingId, propertyId, buildingIdsForProperty, units, unitId]);
  const customersFiltered = useMemo(
    () => (companyId ? customers.filter((c) => c.company_id === companyId) : []),
    [companyId, customers]
  );
  const crewsFiltered = useMemo(
    () => (companyId ? crews.filter((c) => !c.company_id || c.company_id === companyId) : crews),
    [companyId, crews]
  );
  const assetsFiltered = useMemo(() => {
    if (!companyId) return [];
    let list = assets.filter((a) => a.company_id === companyId);
    if (unitId) list = list.filter((a) => a.unit_id === unitId);
    else if (buildingId) list = list.filter((a) => a.building_id === buildingId);
    else if (propertyId) list = list.filter((a) => a.property_id === propertyId);
    return list;
  }, [companyId, propertyId, buildingId, unitId, assets]);

  const handleCompanyChange = (value: string) => {
    setCompanyId(value);
    setCustomerId("");
    setPropertyId("");
    setBuildingId("");
    setUnitId("");
    setAssetId("");
  };
  const handlePropertyChange = (value: string) => {
    setPropertyId(value);
    setBuildingId("");
    setUnitId("");
    setAssetId("");
  };
  const handleBuildingChange = (value: string) => {
    setBuildingId(value);
    setUnitId("");
    setAssetId("");
  };
  const handleUnitChange = (value: string) => {
    setUnitId(value);
    const nextAssets = buildingId
      ? assets.filter((a) => a.company_id === companyId && a.building_id === buildingId && a.unit_id === value)
      : assets.filter((a) => a.company_id === companyId && a.unit_id === value);
    if (assetId && !nextAssets.some((a) => a.id === assetId)) setAssetId("");
  };
  const handleAssetChange = (value: string) => setAssetId(value);
  if (!open) return null;

  const wo = workOrder ?? emptyWorkOrder;
  const titleDefault = isEdit ? wo.title : (prefill?.title ?? wo.title);
  const descriptionDefault = isEdit ? (wo.description ?? "") : (prefill?.description ?? wo.description ?? "");
  const inputClass = "w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";
  const labelClass = "mb-1 block text-sm font-medium text-[var(--foreground)]";
  const sectionTitleClass = "mb-3 text-sm font-semibold text-[var(--foreground)] border-b border-[var(--card-border)] pb-2";

  const requestedAtDefault = wo.requested_at ?? (isEdit ? "" : new Date().toISOString().slice(0, 16));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit Work Order" : "New Work Order"}
          </h2>
        </div>
        <form action={formAction} className="space-y-6 p-6">
          {isEdit && <input type="hidden" name="id" value={wo.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}

          {/* Section 1: Basic Information */}
          <div>
            <h3 className={sectionTitleClass}>Basic Information</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="work_order_number" className={labelClass}>Work Order Number</label>
                <input
                  id="work_order_number"
                  name="work_order_number"
                  type="text"
                  readOnly={!!(isEdit && wo.work_order_number)}
                  defaultValue={wo.work_order_number ?? ""}
                  className={inputClass + (isEdit && wo.work_order_number ? " bg-[var(--card)] opacity-80" : "")}
                />
              </div>
              <div>
                <label htmlFor="title" className={labelClass}>Title *</label>
                <input id="title" name="title" type="text" required defaultValue={titleDefault} className={inputClass} />
              </div>
              <div>
                <label htmlFor="description" className={labelClass}>Description</label>
                <textarea id="description" name="description" rows={2} defaultValue={descriptionDefault} className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="category" className={labelClass}>Category</label>
                  <select id="category" name="category" defaultValue={wo.category ?? ""} className={inputClass}>
                    <option value="">None</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="priority" className={labelClass}>Priority</label>
                  <select id="priority" name="priority" defaultValue={wo.priority} className={inputClass}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="status" className={labelClass}>Status</label>
                  <select id="status" name="status" defaultValue={wo.status} className={inputClass}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Customer & Requester */}
          <div>
            <h3 className={sectionTitleClass}>Customer & Requester</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="company_id" className={labelClass}>Company *</label>
                <select
                  id="company_id"
                  name="company_id"
                  required
                  value={companyId}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="customer_id" className={labelClass}>Customer</label>
                <select
                  id="customer_id"
                  name="customer_id"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {customersFiltered.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="requested_by_name" className={labelClass}>Requested By Name</label>
                  <input id="requested_by_name" name="requested_by_name" type="text" defaultValue={wo.requested_by_name ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="requested_by_email" className={labelClass}>Requested By Email</label>
                  <input id="requested_by_email" name="requested_by_email" type="email" defaultValue={wo.requested_by_email ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="requested_by_phone" className={labelClass}>Requested By Phone</label>
                  <input id="requested_by_phone" name="requested_by_phone" type="text" defaultValue={wo.requested_by_phone ?? ""} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Location & Asset */}
          <div>
            <h3 className={sectionTitleClass}>Location & Asset</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="property_id" className={labelClass}>Property</label>
                <select id="property_id" name="property_id" value={propertyId} onChange={(e) => handlePropertyChange(e.target.value)} className={inputClass}>
                  <option value="">None</option>
                  {propertiesFiltered.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="building_id" className={labelClass}>Building</label>
                <select id="building_id" name="building_id" value={buildingId} onChange={(e) => handleBuildingChange(e.target.value)} className={inputClass}>
                  <option value="">None</option>
                  {buildingsFiltered.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="unit_id" className={labelClass}>Unit</label>
                <select id="unit_id" name="unit_id" value={unitId} onChange={(e) => handleUnitChange(e.target.value)} className={inputClass}>
                  <option value="">None</option>
                  {unitsFiltered.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="asset_id" className={labelClass}>Asset</label>
                <select id="asset_id" name="asset_id" value={assetId} onChange={(e) => handleAssetChange(e.target.value)} className={inputClass}>
                  <option value="">None</option>
                  {assetsFiltered.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Scheduling & Assignment */}
          <div>
            <h3 className={sectionTitleClass}>Scheduling & Assignment</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="requested_at" className={labelClass}>Requested At</label>
                  <DateInputWithPicker id="requested_at" name="requested_at" type="datetime-local" defaultValue={requestedAtDefault ? requestedAtDefault.slice(0, 16) : ""} className={inputClass} aria-label="Requested at date and time" />
                </div>
                <div>
                  <label htmlFor="scheduled_date" className={labelClass}>Scheduled Date</label>
                  <DateInputWithPicker id="scheduled_date" name="scheduled_date" type="date" defaultValue={wo.scheduled_date ?? ""} className={inputClass} aria-label="Scheduled date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="scheduled_start" className={labelClass}>Scheduled Start</label>
                  <DateInputWithPicker id="scheduled_start" name="scheduled_start" type="datetime-local" defaultValue={wo.scheduled_start ? String(wo.scheduled_start).slice(0, 16) : ""} className={inputClass} aria-label="Scheduled start date and time" />
                </div>
                <div>
                  <label htmlFor="scheduled_end" className={labelClass}>Scheduled End</label>
                  <DateInputWithPicker id="scheduled_end" name="scheduled_end" type="datetime-local" defaultValue={wo.scheduled_end ? String(wo.scheduled_end).slice(0, 16) : ""} className={inputClass} aria-label="Scheduled end date and time" />
                </div>
              </div>
              <div>
                <label htmlFor="due_date" className={labelClass}>Due Date</label>
                <DateInputWithPicker id="due_date" name="due_date" type="date" defaultValue={wo.due_date ?? ""} className={inputClass} aria-label="Due date" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="assigned_technician_id" className={labelClass}>Assigned Technician</label>
                  <select id="assigned_technician_id" name="assigned_technician_id" defaultValue={wo.assigned_technician_id ?? ""} className={inputClass}>
                    <option value="">None</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="assigned_crew_id" className={labelClass}>Assigned Crew</label>
                  <select id="assigned_crew_id" name="assigned_crew_id" defaultValue={wo.assigned_crew_id ?? ""} className={inputClass}>
                    <option value="">None</option>
                    {crewsFiltered.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="estimated_hours" className={labelClass}>Estimated Hours</label>
                  <input id="estimated_hours" name="estimated_hours" type="number" step="0.25" min="0" defaultValue={wo.estimated_hours ?? ""} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="estimated_technicians" className={labelClass}>Estimated Technicians</label>
                  <input id="estimated_technicians" name="estimated_technicians" type="number" min="0" defaultValue={wo.estimated_technicians ?? ""} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Billing & Controls */}
          <div>
            <h3 className={sectionTitleClass}>Billing & Controls</h3>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="billable"
                  defaultChecked={wo.billable !== false}
                  className="rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span className="text-sm text-[var(--foreground)]">Billable</span>
              </label>
              <div className="flex-1 min-w-[160px]">
                <label htmlFor="nte_amount" className={labelClass}>Not To Exceed Amount</label>
                <input id="nte_amount" name="nte_amount" type="number" step="0.01" min="0" defaultValue={wo.nte_amount ?? ""} className={inputClass} placeholder="0.00" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-[var(--card-border)]">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              {isPending ? "Saving…" : isEdit ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-[var(--foreground)] hover:bg-[var(--card-border)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
