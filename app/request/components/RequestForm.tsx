"use client";

import { useActionState } from "react";
import { submitMaintenanceRequestPortal, type PortalSubmissionState } from "../actions";
import { Button } from "@/src/components/ui/button";
import { PrioritySelect } from "./PrioritySelect";
import { PhotoUploader } from "./PhotoUploader";
import { SubmissionSuccess } from "./SubmissionSuccess";
import { AssetSearchSelect } from "./AssetSearchSelect";

const INITIAL_STATE: PortalSubmissionState = {};

type PropertyOption = { id: string; name: string };
type AssetOption = { id: string; name: string };

type RequestFormProps = {
  properties: PropertyOption[];
  assets: AssetOption[];
};

export function RequestForm({ properties, assets }: RequestFormProps) {
  const [state, formAction, pending] = useActionState(
    submitMaintenanceRequestPortal,
    INITIAL_STATE
  );

  if (state.success) {
    return <SubmissionSuccess workOrderNumber={state.workOrderNumber} />;
  }

  const hasStructuredLocation = properties.length > 0;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="ui-label">Your name</span>
          <input
            name="requester_name"
            type="text"
            required
            className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
            placeholder="Full name"
            autoComplete="name"
          />
        </label>
        <label className="block space-y-2">
          <span className="ui-label">Email</span>
          <input
            name="requester_email"
            type="email"
            required
            className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
      </div>

      {hasStructuredLocation ? (
        <>
          <label className="block space-y-2">
            <span className="ui-label">Property</span>
            <select
              name="property_id"
              className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
            >
              <option value="">Select a property (optional)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="ui-label">Room / Unit (optional)</span>
            <input
              name="room_or_unit"
              type="text"
              className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
              placeholder="Room number, unit, or suite"
            />
          </label>
          {assets.length > 0 ? <AssetSearchSelect assets={assets} /> : null}
          <input type="hidden" name="location" value="" />
        </>
      ) : (
        <label className="block space-y-2">
          <span className="ui-label">Location</span>
          <input
            name="location"
            type="text"
            required
            className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
            placeholder="Building, room, asset, or address"
          />
        </label>
      )}

      <PrioritySelect />

      <label className="block space-y-2">
        <span className="ui-label">Description</span>
        <textarea
          name="description"
          required
          rows={4}
          className="ui-textarea min-h-[100px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[88px] sm:py-2.5 sm:text-sm"
          placeholder="Describe the issue and where it is."
        />
      </label>

      <PhotoUploader />

      <div className="flex flex-col gap-4 pt-2">
        <div
          className="sticky bottom-4 z-10 sm:relative sm:bottom-0 sm:flex sm:justify-end"
        >
          <Button
            type="submit"
            disabled={pending}
            size="md"
            className="min-h-[48px] w-full rounded-xl px-6 text-base font-medium sm:min-h-[44px] sm:w-auto sm:text-sm"
          >
            {pending ? "Submitting…" : "Submit request"}
          </Button>
        </div>
        <p className="text-center text-xs text-[var(--muted)] sm:text-left">
          Typical response time: 4–24 hours.
          <br />
          For emergencies please contact your maintenance team directly.
        </p>
      </div>
    </form>
  );
}
