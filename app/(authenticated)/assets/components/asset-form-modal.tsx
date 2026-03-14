"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { LocationBreadcrumb } from "@/src/components/ui/location-breadcrumb";

export type Asset = {
  id: string;
  asset_name: string | null;
  name?: string;
  company_id: string;
  parent_asset_id?: string | null;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
  asset_tag: string | null;
  asset_type?: string | null;
  category: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  install_date: string | null;
  expected_life_years?: number | null;
  replacement_cost?: number | null;
  warranty_expires?: string | null;
  status: string;
  condition?: string | null;
  notes: string | null;
  description?: string | null;
  location_notes?: string | null;
};

type CompanyOption = { id: string; name: string };
type PropertyOption = { id: string; name: string; company_id?: string };
type BuildingOption = { id: string; name: string; property_id?: string };
type UnitOption = { id: string; name: string; building_id?: string };
type ParentAssetOption = {
  id: string;
  name: string;
  company_id: string;
  parent_asset_id: string | null;
  property_id?: string | null;
  building_id?: string | null;
  unit_id?: string | null;
};

type AssetFormModalProps = {
  open: boolean;
  onClose: () => void;
  asset: Asset | null;
  companies: CompanyOption[];
  properties: PropertyOption[];
  buildings: BuildingOption[];
  units: UnitOption[];
  parentCandidates: ParentAssetOption[];
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

import { ASSET_TYPE_OPTIONS } from "../constants";

const CONDITION_OPTIONS = ["excellent", "good", "fair", "poor"] as const;
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "retired", label: "Retired" },
] as const;

const emptyAsset: Asset = {
  id: "",
  asset_name: "",
  company_id: "",
  parent_asset_id: null,
  property_id: null,
  building_id: null,
  unit_id: null,
  asset_tag: null,
  category: null,
  manufacturer: null,
  model: null,
  serial_number: null,
  install_date: null,
  expected_life_years: null,
  replacement_cost: null,
  status: "active",
  notes: null,
};

const inputClass =
  "ui-input";

export function AssetFormModal({
  open,
  onClose,
  asset,
  companies,
  properties,
  buildings,
  units,
  parentCandidates,
  saveAction,
}: AssetFormModalProps) {
  const isEdit = !!asset?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});
  const a = asset ?? emptyAsset;

  const singleCompanyId = companies.length === 1 ? companies[0].id : "";
  const [companyId, setCompanyId] = useState(a.company_id || singleCompanyId);
  const [propertyId, setPropertyId] = useState(a.property_id ?? "");
  const [buildingId, setBuildingId] = useState(a.building_id ?? "");
  const [unitId, setUnitId] = useState(a.unit_id ?? "");
  const [isSubAsset, setIsSubAsset] = useState(!!(a.parent_asset_id ?? ""));
  const [parentAssetId, setParentAssetId] = useState(a.parent_asset_id ?? "");
  const [parentSearch, setParentSearch] = useState("");
  const [lockedFromParent, setLockedFromParent] = useState(false);
  const [assetTypeSelect, setAssetTypeSelect] = useState(
    () => (a.asset_type ?? a.category ?? "").trim()
  );

  useEffect(() => {
    if (open && a) {
      const defaultCompany = a.company_id || (companies.length === 1 ? companies[0].id : "");
      setCompanyId(defaultCompany);
      setPropertyId(a.property_id ?? "");
      setBuildingId(a.building_id ?? "");
      setUnitId(a.unit_id ?? "");
      const hasParent = !!(a.parent_asset_id ?? "");
      setIsSubAsset(hasParent);
      setParentAssetId(a.parent_asset_id ?? "");
      setParentSearch("");
      setLockedFromParent(hasParent);
      setAssetTypeSelect((a.asset_type ?? a.category ?? "").trim());
    }
  }, [
    open,
    a.company_id,
    companies.length,
    a.property_id,
    a.building_id,
    a.unit_id,
    a.parent_asset_id,
    a.asset_type,
    a.category,
  ]);

  const selectedParent = useMemo(
    () => parentCandidates.find((c) => c.id === parentAssetId),
    [parentAssetId, parentCandidates]
  );

  useEffect(() => {
    if (!isSubAsset) {
      setLockedFromParent(false);
      return;
    }
    if (!parentAssetId || !selectedParent) {
      setLockedFromParent(false);
      return;
    }
    setLockedFromParent(true);
    setCompanyId(selectedParent.company_id);
    setPropertyId(selectedParent.property_id ?? "");
    setBuildingId(selectedParent.building_id ?? "");
    setUnitId(selectedParent.unit_id ?? "");
  }, [isSubAsset, parentAssetId, selectedParent]);

  const typeDropdownOptions = useMemo(() => {
    const current = (a.asset_type ?? a.category ?? "").trim();
    if (current && !ASSET_TYPE_OPTIONS.includes(current as (typeof ASSET_TYPE_OPTIONS)[number])) {
      return [current, ...ASSET_TYPE_OPTIONS];
    }
    return [...ASSET_TYPE_OPTIONS];
  }, [a.asset_type, a.category]);

  const propertiesFiltered = useMemo(
    () => (companyId ? properties.filter((p) => p.company_id === companyId) : []),
    [companyId, properties]
  );
  const buildingsFiltered = useMemo(
    () => (propertyId ? buildings.filter((b) => b.property_id === propertyId) : []),
    [propertyId, buildings]
  );
  const unitsFiltered = useMemo(
    () => (buildingId ? units.filter((u) => u.building_id === buildingId) : []),
    [buildingId, units]
  );
  const selectedCompanyName = useMemo(
    () => companies.find((company) => company.id === companyId)?.name ?? null,
    [companies, companyId]
  );
  const selectedPropertyName = useMemo(
    () => properties.find((property) => property.id === propertyId)?.name ?? null,
    [properties, propertyId]
  );
  const selectedBuildingName = useMemo(
    () => buildings.find((building) => building.id === buildingId)?.name ?? null,
    [buildings, buildingId]
  );
  const selectedUnitName = useMemo(
    () => units.find((unit) => unit.id === unitId)?.name ?? null,
    [units, unitId]
  );
  const parentNameById = useMemo(
    () =>
      new Map(parentCandidates.map((candidate) => [candidate.id, candidate.name])),
    [parentCandidates]
  );
  const excludedParentIds = useMemo(() => {
    if (!isEdit || !a.id) return new Set<string>();
    const childrenByParent = new Map<string, string[]>();
    for (const candidate of parentCandidates) {
      if (!candidate.parent_asset_id) continue;
      const list = childrenByParent.get(candidate.parent_asset_id) ?? [];
      list.push(candidate.id);
      childrenByParent.set(candidate.parent_asset_id, list);
    }

    const excluded = new Set<string>([a.id]);
    const stack = [a.id];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      const children = childrenByParent.get(current) ?? [];
      for (const childId of children) {
        if (excluded.has(childId)) continue;
        excluded.add(childId);
        stack.push(childId);
      }
    }
    return excluded;
  }, [isEdit, a.id, parentCandidates]);
  const parentCandidatesFiltered = useMemo(() => {
    const query = parentSearch.trim().toLowerCase();
    return parentCandidates
      .filter((candidate) => !excludedParentIds.has(candidate.id))
      .filter((candidate) => {
        if (!query) return true;
        return candidate.name.toLowerCase().includes(query);
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [excludedParentIds, parentCandidates, parentSearch]);
  const selectedParentName = useMemo(
    () => (parentAssetId ? parentNameById.get(parentAssetId) ?? null : null),
    [parentAssetId, parentNameById]
  );

  useEffect(() => {
    if (companyId && propertyId && !propertiesFiltered.some((p) => p.id === propertyId))
      setPropertyId("");
    if (propertyId && buildingId && !buildingsFiltered.some((b) => b.id === buildingId))
      setBuildingId("");
  }, [companyId, propertyId, buildingId, propertiesFiltered, buildingsFiltered]);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  if (!open) return null;

  const displayName = a.asset_name ?? a.name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] shadow-xl">
        <div className="sticky top-0 border-b border-[var(--card-border)] bg-[var(--card)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {isEdit ? "Edit Asset" : "New Asset"}
          </h2>
        </div>
        <form action={formAction} className="space-y-4 p-6">
          {isEdit && <input type="hidden" name="id" value={a.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <div>
            <label htmlFor="asset_name" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Asset name *
            </label>
            <input
              id="asset_name"
              name="asset_name"
              type="text"
              required
              defaultValue={displayName}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_sub_asset"
              checked={isSubAsset}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsSubAsset(checked);
                if (!checked) {
                  setParentAssetId("");
                  setParentSearch("");
                  setLockedFromParent(false);
                }
              }}
              className="h-4 w-4 rounded border-[var(--card-border)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <label htmlFor="is_sub_asset" className="text-sm font-medium text-[var(--foreground)]">
              This is a sub-asset
            </label>
          </div>
          {!isSubAsset && <input type="hidden" name="parent_asset_id" value="" />}
          {isSubAsset && (
            <div>
              <label htmlFor="parent_asset_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Parent asset *
              </label>
              <input
                type="search"
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                placeholder="Search parent assets..."
                className={`${inputClass} mb-2`}
                aria-label="Search parent assets"
              />
              <select
                id="parent_asset_id"
                name="parent_asset_id"
                value={parentAssetId}
                onChange={(e) => setParentAssetId(e.target.value)}
                className={inputClass}
                required={isSubAsset}
              >
                <option value="">Select parent asset</option>
                {parentCandidatesFiltered.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
              {selectedParentName ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  This asset will be linked under {selectedParentName}. Company and location are set from the parent.
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Select a parent asset to inherit company and location.
                </p>
              )}
            </div>
          )}
          {lockedFromParent && (
            <p className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-glow)]/20 px-3 py-2 text-xs text-[var(--muted-strong)]">
              Company and location are inherited from the parent asset. Change the parent to update them.
            </p>
          )}
          <div>
            <label htmlFor="company_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Company *
            </label>
            {lockedFromParent && (
              <>
                <input type="hidden" name="company_id" value={companyId} />
                <input type="hidden" name="property_id" value={propertyId} />
                <input type="hidden" name="building_id" value={buildingId} />
                <input type="hidden" name="unit_id" value={unitId} />
              </>
            )}
            <select
              id="company_id"
              name={lockedFromParent ? undefined : "company_id"}
              required
              value={companyId}
              disabled={lockedFromParent}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPropertyId("");
                setBuildingId("");
                setUnitId("");
                if (!lockedFromParent) setParentAssetId("");
              }}
              className={inputClass}
              aria-readonly={lockedFromParent}
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="property_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Property
            </label>
            <select
              id="property_id"
              name={lockedFromParent ? undefined : "property_id"}
              value={propertyId}
              disabled={lockedFromParent}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setBuildingId("");
                setUnitId("");
              }}
              className={inputClass}
              aria-readonly={lockedFromParent}
            >
              <option value="">None</option>
              {propertiesFiltered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="building_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Building
            </label>
            <select
              id="building_id"
              name={lockedFromParent ? undefined : "building_id"}
              value={buildingId}
              disabled={lockedFromParent}
              onChange={(e) => {
                setBuildingId(e.target.value);
                setUnitId("");
              }}
              className={inputClass}
              aria-readonly={lockedFromParent}
            >
              <option value="">None</option>
              {buildingsFiltered.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="unit_id" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Unit
            </label>
            <select
              id="unit_id"
              name={lockedFromParent ? undefined : "unit_id"}
              value={unitId}
              disabled={lockedFromParent}
              onChange={(e) => setUnitId(e.target.value)}
              className={inputClass}
              aria-readonly={lockedFromParent}
            >
              <option value="">None</option>
              {unitsFiltered.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <LocationBreadcrumb
            className="-mt-1"
            company={selectedCompanyName}
            property={selectedPropertyName}
            building={selectedBuildingName}
            unit={selectedUnitName}
          />
          <div>
            <label htmlFor="asset_tag" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Asset tag
            </label>
            <input
              id="asset_tag"
              name="asset_tag"
              type="text"
              defaultValue={a.asset_tag ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div>
            <label htmlFor="asset_type" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Type
            </label>
            <select
              id="asset_type"
              name="asset_type"
              value={assetTypeSelect}
              onChange={(e) => setAssetTypeSelect(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {typeDropdownOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {assetTypeSelect === "Other" && (
              <input
                type="text"
                name="asset_type_custom"
                placeholder="Custom type (optional)"
                className={inputClass + " mt-2"}
                aria-label="Custom type when Other is selected"
              />
            )}
          </div>
          <div>
            <label htmlFor="category" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Category
            </label>
            <input
              id="category"
              name="category"
              type="text"
              defaultValue={a.category ?? ""}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="manufacturer" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Manufacturer
              </label>
              <input
                id="manufacturer"
                name="manufacturer"
                type="text"
                defaultValue={a.manufacturer ?? ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div>
              <label htmlFor="model" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Model
              </label>
              <input
                id="model"
                name="model"
                type="text"
                defaultValue={a.model ?? ""}
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
          </div>
          <div>
            <label htmlFor="serial_number" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Serial number
            </label>
            <input
              id="serial_number"
              name="serial_number"
              type="text"
              defaultValue={a.serial_number ?? ""}
              className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="install_date" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Install date
              </label>
              <input
                id="install_date"
                name="install_date"
                type="date"
                defaultValue={a.install_date ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="warranty_expires" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Warranty expiration
              </label>
              <input
                id="warranty_expires"
                name="warranty_expires"
                type="date"
                defaultValue={a.warranty_expires ?? ""}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="expected_life_years"
                className="mb-1 block text-sm font-medium text-[var(--foreground)]"
              >
                Expected life (years)
              </label>
              <input
                id="expected_life_years"
                name="expected_life_years"
                type="number"
                min={1}
                defaultValue={a.expected_life_years ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="replacement_cost"
                className="mb-1 block text-sm font-medium text-[var(--foreground)]"
              >
                Replacement cost
              </label>
              <input
                id="replacement_cost"
                name="replacement_cost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={a.replacement_cost ?? ""}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="condition" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Condition
              </label>
              <select
                id="condition"
                name="condition"
                defaultValue={a.condition ?? ""}
                className={inputClass}
              >
                <option value="">—</option>
                {CONDITION_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={a.status}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={a.description ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="location_notes" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Location notes
            </label>
            <textarea
              id="location_notes"
              name="location_notes"
              rows={2}
              defaultValue={a.location_notes ?? ""}
              placeholder="Where exactly the asset is located"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-[var(--foreground)]">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={a.notes ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex gap-3 pt-2">
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
