"use client";

import { useActionState } from "react";
import { submitMaintenanceRequestPortal, type PortalSubmissionState } from "../actions";
import { Button } from "@/src/components/ui/button";
import { useRequestPortalTranslations } from "./RequestPortalI18n";
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
  tenantId: string;
  companyId: string;
};

export function RequestForm({ properties, assets, tenantId, companyId }: RequestFormProps) {
  const { t, locale } = useRequestPortalTranslations();
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
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="tenant_id" value={tenantId} />
      <input type="hidden" name="company_id" value={companyId} />
      {state.error ? (
        <div className="rounded-xl bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="ui-label">{t("requestPortal.yourName")}</span>
          <input
            name="requester_name"
            type="text"
            required
            className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
            placeholder={t("requestPortal.placeholder.fullName")}
            autoComplete="name"
          />
        </label>
        <label className="block space-y-2">
          <span className="ui-label">{t("requestPortal.email")}</span>
          <input
            name="requester_email"
            type="email"
            required
            className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
            placeholder={t("requestPortal.placeholder.email")}
            autoComplete="email"
          />
        </label>
      </div>

      {hasStructuredLocation ? (
        <>
          <label className="block space-y-2">
            <span className="ui-label">{t("requestPortal.property")}</span>
            <select
              name="property_id"
              className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
            >
              <option value="">{t("requestPortal.selectPropertyOptional")}</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="ui-label">{t("requestPortal.roomOrUnit")}</span>
            <input
              name="room_or_unit"
              type="text"
              className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
              placeholder={t("requestPortal.placeholder.roomOrUnit")}
            />
          </label>
          {assets.length > 0 ? <AssetSearchSelect assets={assets} /> : null}
          <input type="hidden" name="location" value="" />
        </>
      ) : (
        <label className="block space-y-2">
          <span className="ui-label">{t("requestPortal.location")}</span>
          <input
            name="location"
            type="text"
            required
            className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
            placeholder={t("requestPortal.placeholder.location")}
          />
        </label>
      )}

      <PrioritySelect />

      <label className="block space-y-2">
        <span className="ui-label">{t("requestPortal.description")}</span>
        <textarea
          name="description"
          required
          rows={4}
          className="ui-textarea min-h-[100px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[88px] sm:py-2.5 sm:text-sm"
          placeholder={t("requestPortal.placeholder.description")}
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
            {pending ? t("requestPortal.submitting") : t("requestPortal.submitRequest")}
          </Button>
        </div>
        <p className="text-center text-xs text-[var(--muted)] sm:text-left">
          {t("requestPortal.typicalResponseTime")}
          <br />
          {t("requestPortal.emergencyInstruction")}
        </p>
      </div>
    </form>
  );
}
