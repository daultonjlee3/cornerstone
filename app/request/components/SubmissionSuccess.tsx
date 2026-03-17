"use client";

import { useRequestPortalTranslations } from "./RequestPortalI18n";

type SubmissionSuccessProps = {
  workOrderNumber?: string | null;
};

export function SubmissionSuccess({ workOrderNumber }: SubmissionSuccessProps) {
  const { t } = useRequestPortalTranslations();

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 shadow-[var(--shadow-card)] sm:p-10">
      <div className="flex flex-col items-center text-center">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]"
          aria-hidden
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-semibold text-[var(--foreground)]">
          {t("requestPortal.successTitle")}
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {workOrderNumber ? t("requestPortal.successReceived") : t("requestPortal.successSubmitted")}
        </p>
        {workOrderNumber ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            {t("requestPortal.successTicketId")}{" "}
            <span className="font-medium text-[var(--foreground)]">{workOrderNumber}</span>
          </p>
        ) : null}
        <p className="mt-4 text-sm text-[var(--muted)]">
          {t("requestPortal.successFollowUp")}
        </p>
      </div>
    </div>
  );
}
