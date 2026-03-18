"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import {
  submitMaintenanceRequestPortal,
  type PortalSubmissionState,
  fetchPortalPastRequests,
  type PortalPastRequestSummary,
} from "../actions";
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

function getDisplayStatus(status: string): "Submitted" | "In Progress" | "Completed" | "Overdue" {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "Completed";
  if (
    normalized === "approved" ||
    normalized === "scheduled" ||
    normalized === "converted_to_work_order"
  ) {
    return "In Progress";
  }
  if (normalized === "overdue") return "Overdue";
  return "Submitted";
}

function getStatusBadgeClasses(label: "Submitted" | "In Progress" | "Completed" | "Overdue"): string {
  switch (label) {
    case "Completed":
      return "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/40";
    case "In Progress":
      return "inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/40";
    case "Overdue":
      return "inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/40";
    case "Submitted":
    default:
      return "inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-200 dark:ring-slate-500/40";
  }
}

export function RequestForm({ properties, assets, tenantId, companyId }: RequestFormProps) {
  const { t, locale } = useRequestPortalTranslations();
  const [state, formAction, pending] = useActionState(
    submitMaintenanceRequestPortal,
    INITIAL_STATE
  );

  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [pastRequests, setPastRequests] = useState<PortalPastRequestSummary[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [loadingPast, setLoadingPast] = useState(false);
  const [isPendingPast, startTransition] = useTransition();

  const hasStructuredLocation = properties.length > 0;

  useEffect(() => {
    if (!requesterEmail || !requesterEmail.includes("@") || !tenantId || !companyId) {
      setPastRequests([]);
      setSelectedRequestId(null);
      return;
    }

    const handle = setTimeout(() => {
      const emailSnapshot = requesterEmail;
      startTransition(() => {
        setLoadingPast(true);
        fetchPortalPastRequests(tenantId, companyId, emailSnapshot)
          .then((result) => {
            if (emailSnapshot !== requesterEmail) {
              return;
            }
            const list = result.requests ?? [];
            setPastRequests(list);
            if (list.length > 0 && !requesterName) {
              const firstName = list[0].requester_name?.trim();
              if (firstName) {
                setRequesterName(firstName);
              }
            }
          })
          .finally(() => {
            if (emailSnapshot === requesterEmail) {
              setLoadingPast(false);
            }
          });
      });
    }, 400);

    return () => {
      clearTimeout(handle);
    };
  }, [requesterEmail, tenantId, companyId, requesterName]);

  const selectedRequest = useMemo(
    () => pastRequests.find((r) => r.id === selectedRequestId) ?? null,
    [pastRequests, selectedRequestId]
  );

  if (state.success) {
    return <SubmissionSuccess workOrderNumber={state.workOrderNumber} />;
  }

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
            value={requesterName}
            onChange={(e) => setRequesterName(e.target.value)}
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
            value={requesterEmail}
            onChange={(e) => setRequesterEmail(e.target.value)}
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

      {(loadingPast || isPendingPast) && (
        <div className="rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--muted)]/5 px-4 py-3 text-xs text-[var(--muted)]">
          Looking up your past requests…
        </div>
      )}

      {pastRequests.length > 0 && !loadingPast && !isPendingPast && (
        <section
          id="past-requests"
          className="mt-2 space-y-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3"
          data-portal-past-requests
        >
          <header className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Your past requests
            </h3>
            <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              Last {Math.min(pastRequests.length, 15)}
            </span>
          </header>
          <div className="space-y-2">
            {pastRequests.map((request) => {
              const label = getDisplayStatus(request.status);
              const badgeClasses = getStatusBadgeClasses(label);
              const created = request.created_at ? new Date(request.created_at) : new Date();
              const isSelected = selectedRequestId === request.id;
              const snippet =
                request.description.length > 120
                  ? `${request.description.slice(0, 117)}…`
                  : request.description;
              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() =>
                    setSelectedRequestId(isSelected ? null : request.id)
                  }
                  className="w-full rounded-lg border border-transparent px-2 py-2 text-left text-xs transition hover:border-[var(--card-border)] hover:bg-[var(--muted)]/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-2 text-[0.8rem] font-medium text-[var(--foreground)]">
                      {snippet || "Maintenance request"}
                    </p>
                    <span className={badgeClasses}>{label}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[0.7rem] text-[var(--muted)]">
                    <span>{created.toLocaleDateString()}</span>
                    {isSelected ? <span>Hide details</span> : <span>View details</span>}
                  </div>
                  {isSelected && (
                    <div className="mt-2 rounded-md bg-[var(--background)]/60 p-2 text-[0.75rem] text-[var(--foreground)]">
                      <p className="whitespace-pre-wrap">
                        {request.description || "No description provided."}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem] text-[var(--muted)]">
                        <span>
                          Status: <span className={badgeClasses}>{label}</span>
                        </span>
                        <span>Created: {created.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

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
