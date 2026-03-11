"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";
import { AddressAutocomplete, type AddressSuggestion } from "@/src/components/address-autocomplete";

export type Building = {
  id: string;
  building_name: string | null;
  name?: string;
  property_id: string;
  building_code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  year_built: number | null;
  floors: number | null;
  square_feet: number | null;
  notes: string | null;
  property?: { name: string; company_id?: string } | { property_name: string; company_id?: string } | null;
};

type PropertyOption = { id: string; name: string };

type BuildingFormModalProps = {
  open: boolean;
  onClose: () => void;
  building: Building | null;
  properties: PropertyOption[];
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
};

const emptyBuilding: Building = {
  id: "",
  building_name: "",
  property_id: "",
  building_code: null,
  address: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  latitude: null,
  longitude: null,
  status: "active",
  year_built: null,
  floors: null,
  square_feet: null,
  notes: null,
};

export function BuildingFormModal({
  open,
  onClose,
  building,
  properties,
  saveAction,
}: BuildingFormModalProps) {
  const isEdit = !!building?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  const b = building ?? emptyBuilding;
  const displayName = b.building_name ?? b.name ?? "";

  const [address, setAddress] = useState(b.address ?? "");
  const [city, setCity] = useState(b.city ?? "");
  const [stateVal, setStateVal] = useState(b.state ?? "");
  const [postalCode, setPostalCode] = useState(b.postal_code ?? "");
  const [country, setCountry] = useState(b.country ?? "");
  const [latitude, setLatitude] = useState(b.latitude != null ? String(b.latitude) : "");
  const [longitude, setLongitude] = useState(b.longitude != null ? String(b.longitude) : "");

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  useEffect(() => {
    if (!open) return;
    const src = building ?? emptyBuilding;
    setAddress(src.address ?? "");
    setCity(src.city ?? "");
    setStateVal(src.state ?? "");
    setPostalCode(src.postal_code ?? "");
    setCountry(src.country ?? "");
    setLatitude(src.latitude != null ? String(src.latitude) : "");
    setLongitude(src.longitude != null ? String(src.longitude) : "");
  }, [open, building?.id, building?.address, building?.city, building?.state, building?.postal_code, building?.country, building?.latitude, building?.longitude]);

  const handleAddressSelect = (s: AddressSuggestion) => {
    setAddress(s.address_line1 ?? "");
    setCity(s.city ?? "");
    setStateVal(s.state ?? "");
    setPostalCode(s.postal_code ?? "");
    setCountry(s.country ?? "");
    setLatitude(String(s.latitude));
    setLongitude(String(s.longitude));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Building" : "New Building"}
      className="max-w-md"
    >
      <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={b.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <FormField label="Building name" htmlFor="building_name" required>
            <input
              id="building_name"
              name="building_name"
              type="text"
              required
              defaultValue={displayName}
              className="ui-input"
            />
          </FormField>
          <FormField label="Property" htmlFor="property_id" required>
            <select
              id="property_id"
              name="property_id"
              required
              defaultValue={b.property_id}
              className="ui-select"
            >
              <option value="">Select property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Address search" htmlFor="building_address_autocomplete">
            <AddressAutocomplete
              onSelect={handleAddressSelect}
              placeholder="Type to search for building address…"
              className="ui-input"
            />
          </FormField>
          <FormField label="Address" htmlFor="building_address">
            <input
              id="building_address"
              name="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
              className="ui-input"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="City" htmlFor="building_city">
              <input
                id="building_city"
                name="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="ui-input"
              />
            </FormField>
            <FormField label="State" htmlFor="building_state">
              <input
                id="building_state"
                name="state"
                type="text"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                className="ui-input"
              />
            </FormField>
          </div>
          <FormField label="Postal code" htmlFor="postal_code">
            <input
              id="postal_code"
              name="postal_code"
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="ui-input"
            />
          </FormField>
          <FormField label="Country" htmlFor="building_country">
            <input
              id="building_country"
              name="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. USA"
              className="ui-input"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Latitude" htmlFor="building_latitude">
              <input
                id="building_latitude"
                name="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 33.7490"
                className="ui-input"
              />
            </FormField>
            <FormField label="Longitude" htmlFor="building_longitude">
              <input
                id="building_longitude"
                name="longitude"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. -84.3880"
                className="ui-input"
              />
            </FormField>
          </div>
          <FormField label="Building code" htmlFor="building_code">
            <input
              id="building_code"
              name="building_code"
              type="text"
              defaultValue={b.building_code ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={b.status}
              className="ui-select"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Year built" htmlFor="year_built">
              <input
                id="year_built"
                name="year_built"
                type="number"
                min={1800}
                max={2100}
                defaultValue={b.year_built ?? ""}
                className="ui-input"
              />
            </FormField>
            <FormField label="Floors" htmlFor="floors">
              <input
                id="floors"
                name="floors"
                type="number"
                min={0}
                defaultValue={b.floors ?? ""}
                className="ui-input"
              />
            </FormField>
          </div>
          <FormField label="Square feet" htmlFor="square_feet">
            <input
              id="square_feet"
              name="square_feet"
              type="number"
              min={0}
              step="any"
              defaultValue={b.square_feet ?? ""}
              className="ui-input"
            />
          </FormField>
          <FormField label="Notes" htmlFor="notes">
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={b.notes ?? ""}
              className="ui-textarea"
            />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Saving…" : isEdit ? "Save" : "Create"}
            </Button>
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
          </div>
      </form>
    </Modal>
  );
}
