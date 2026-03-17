"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";
import type { InventoryFormState } from "../actions";

export type StockLocationRecord = {
  id: string;
  company_id: string;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
  name: string;
  location_type: string;
  active: boolean;
  is_default: boolean;
  company_name?: string;
};

type CompanyOption = { id: string; name: string };
type PropertyOption = { id: string; name: string; company_id: string };
type BuildingOption = { id: string; name: string; property_id: string };
type UnitOption = { id: string; name: string; building_id: string };

type StockLocationFormModalProps = {
  open: boolean;
  onClose: () => void;
  location: StockLocationRecord | null;
  companies: CompanyOption[];
  properties: PropertyOption[];
  buildings: BuildingOption[];
  units: UnitOption[];
  saveAction: (prev: InventoryFormState, formData: FormData) => Promise<InventoryFormState>;
};

const LOCATION_TYPES = [
  "warehouse",
  "maintenance_shop",
  "property_storage",
  "building_storage",
  "unit_storage",
  "truck",
  "other",
] as const;

export function StockLocationFormModal({
  open,
  onClose,
  location,
  companies,
  properties,
  buildings,
  units,
  saveAction,
}: StockLocationFormModalProps) {
  const [state, formAction, isPending] = useActionState(saveAction, {});
  const [companyId, setCompanyId] = useState(() => location?.company_id ?? (companies.length === 1 ? companies[0]?.id ?? "" : ""));
  const [propertyId, setPropertyId] = useState(() => location?.property_id ?? "");
  const [buildingId, setBuildingId] = useState(() => location?.building_id ?? "");

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const propertiesForCompany = useMemo(
    () => properties.filter((row) => row.company_id === companyId),
    [properties, companyId]
  );
  const buildingsForProperty = useMemo(
    () => buildings.filter((row) => row.property_id === propertyId),
    [buildings, propertyId]
  );
  const unitsForBuilding = useMemo(
    () => units.filter((row) => row.building_id === buildingId),
    [units, buildingId]
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={location ? "Edit Stock Location" : "New Stock Location"}
      className="max-w-xl"
    >
      <form action={formAction} className="space-y-4">
        {location ? <input type="hidden" name="id" value={location.id} /> : null}
        {state?.error ? (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        <FormField label="Company" htmlFor="stock-location-company" required>
          <select
            id="stock-location-company"
            name="company_id"
            value={companyId}
            onChange={(event) => {
              setCompanyId(event.target.value);
              setPropertyId("");
              setBuildingId("");
            }}
            className="ui-select"
            required
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Location name" htmlFor="stock-location-name" required>
            <input id="stock-location-name" name="name" defaultValue={location?.name ?? ""} className="ui-input" required />
          </FormField>
          <FormField label="Location type" htmlFor="stock-location-type" required>
            <select
              id="stock-location-type"
              name="location_type"
              defaultValue={location?.location_type ?? "warehouse"}
              className="ui-select"
            >
              {LOCATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Property" htmlFor="stock-location-property">
            <select
              id="stock-location-property"
              name="property_id"
              value={propertyId}
              onChange={(event) => {
                setPropertyId(event.target.value);
                setBuildingId("");
              }}
              className="ui-select"
            >
              <option value="">None</option>
              {propertiesForCompany.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Building" htmlFor="stock-location-building">
            <select
              id="stock-location-building"
              name="building_id"
              value={buildingId}
              onChange={(event) => setBuildingId(event.target.value)}
              className="ui-select"
            >
              <option value="">None</option>
              {buildingsForProperty.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Unit" htmlFor="stock-location-unit">
            <select
              id="stock-location-unit"
              name="unit_id"
              defaultValue={location?.unit_id ?? ""}
              className="ui-select"
            >
              <option value="">None</option>
              {unitsForBuilding.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <div className="grid gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="active"
              value="on"
              defaultChecked={location ? location.active : true}
            />
            <span className="text-sm text-[var(--foreground)]">Active location</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_default"
              value="on"
              defaultChecked={location?.is_default ?? false}
            />
            <span className="text-sm text-[var(--foreground)]">Default stock location for company</span>
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? "Saving…" : location ? "Save" : "Create"}
          </Button>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
