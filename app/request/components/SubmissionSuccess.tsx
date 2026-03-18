"use client";

import { useRequestPortalTranslations } from "./RequestPortalI18n";

type SubmissionSuccessProps = {
  workOrderNumber?: string | null;
};

export function SubmissionSuccess({ workOrderNumber }: SubmissionSuccessProps) {
  const { t } = useRequestPortalTranslations();

  return (
    <div className="rounded-3xl border border-[var(--card-border)] bg-[var(--card)]/95 p-8 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-sm sm:p-10">
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
        <p className="mt-4 text-sm text-[var(--muted)]">{t("requestPortal.successFollowUp")}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--background)]/80 px-3 py-1 text-xs text-[var(--muted)] ring-1 ring-[var(--card-border)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          <span>{t("requestPortal.successStatusNew")}</span>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--accent-foreground)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            {t("requestPortal.successSubmitAnother")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                const { pathname } = window.location;
                window.location.href = `${pathname}#past-requests`;
              }
            }}
            className="inline-flex items-center justify-center rounded-full border border-[var(--card-border)] bg-transparent px-6 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
          >
            {t("requestPortal.successViewRecent")}
          </button>
        </div>
      </div>
    </div>
  );
}
