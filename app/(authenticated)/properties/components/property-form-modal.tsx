"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/src/components/ui/modal";
import { FormField } from "@/src/components/ui/form-field";
import { Button } from "@/src/components/ui/button";
import { AddressAutocomplete, type AddressSuggestion } from "@/src/components/address-autocomplete";

export type Property = {
  id: string;
  property_name: string | null;
  company_id: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  company?: { name: string } | null;
};

type CompanyOption = { id: string; name: string };

type PropertyFormModalProps = {
  open: boolean;
  onClose: () => void;
  property: Property | null;
  companies: CompanyOption[];
  saveAction: (prev: { error?: string; success?: boolean }, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  mapboxToken?: string | null;
};

const emptyProperty: Property = {
  id: "",
  property_name: "",
  company_id: "",
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  zip: null,
  country: null,
  latitude: null,
  longitude: null,
  status: "active",
};

export function PropertyFormModal({
  open,
  onClose,
  property,
  companies,
  saveAction,
  mapboxToken,
}: PropertyFormModalProps) {
  const isEdit = !!property?.id;
  const [state, formAction, isPending] = useActionState(saveAction, {});

  const p = property ?? emptyProperty;
  const displayName = p.property_name ?? (p as { name?: string }).name ?? "";

  const [addressLine1, setAddressLine1] = useState(p.address_line1 ?? "");
  const [addressLine2, setAddressLine2] = useState(p.address_line2 ?? "");
  const [city, setCity] = useState(p.city ?? "");
  const [stateVal, setStateVal] = useState(p.state ?? "");
  const [zip, setZip] = useState(p.zip ?? "");
  const [country, setCountry] = useState(p.country ?? "");
  const [latitude, setLatitude] = useState(p.latitude != null ? String(p.latitude) : "");
  const [longitude, setLongitude] = useState(p.longitude != null ? String(p.longitude) : "");

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  useEffect(() => {
    if (!open) return;
    const src = property ?? emptyProperty;
    setAddressLine1(src.address_line1 ?? "");
    setAddressLine2(src.address_line2 ?? "");
    setCity(src.city ?? "");
    setStateVal(src.state ?? "");
    setZip(src.zip ?? "");
    setCountry(src.country ?? "");
    setLatitude(src.latitude != null ? String(src.latitude) : "");
    setLongitude(src.longitude != null ? String(src.longitude) : "");
  }, [open, property?.id, property?.address_line1, property?.address_line2, property?.city, property?.state, property?.zip, property?.country, property?.latitude, property?.longitude]);

  const handleAddressSelect = (s: AddressSuggestion) => {
    setAddressLine1(s.address_line1 ?? "");
    setCity(s.city ?? "");
    setStateVal(s.state ?? "");
    setZip(s.postal_code ?? "");
    setCountry(s.country ?? "");
    setLatitude(String(s.latitude));
    setLongitude(String(s.longitude));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Property" : "New Property"}
      className="max-w-md"
    >
      <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={p.id} />}
          {state?.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}
          <FormField label="Property name" htmlFor="property_name" required>
            <input
              id="property_name"
              name="property_name"
              type="text"
              required
              defaultValue={displayName}
              className="ui-input"
            />
          </FormField>
          <FormField label="Company" htmlFor="company_id" required>
            <select
              id="company_id"
              name="company_id"
              required
              defaultValue={p.company_id}
              className="ui-select"
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Address search" htmlFor="address_autocomplete">
            <AddressAutocomplete
              onSelect={handleAddressSelect}
              placeholder="Type to search for an address…"
              className="ui-input"
              mapboxToken={mapboxToken ?? undefined}
            />
          </FormField>
          <FormField label="Address line 1" htmlFor="address_line1">
            <input
              id="address_line1"
              name="address_line1"
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="ui-input"
            />
          </FormField>
          <FormField label="Address line 2" htmlFor="address_line2">
            <input
              id="address_line2"
              name="address_line2"
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              className="ui-input"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="City" htmlFor="city">
              <input
                id="city"
                name="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="ui-input"
              />
            </FormField>
            <FormField label="State" htmlFor="state">
              <input
                id="state"
                name="state"
                type="text"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                className="ui-input"
              />
            </FormField>
          </div>
          <FormField label="Zip" htmlFor="zip">
            <input
              id="zip"
              name="zip"
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="ui-input"
            />
          </FormField>
          <FormField label="Country" htmlFor="country">
            <input
              id="country"
              name="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. USA"
              className="ui-input"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Latitude" htmlFor="latitude">
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 33.7490"
                className="ui-input"
              />
            </FormField>
            <FormField label="Longitude" htmlFor="longitude">
              <input
                id="longitude"
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
          <FormField label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={p.status}
              className="ui-select"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
