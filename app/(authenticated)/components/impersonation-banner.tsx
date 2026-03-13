"use client";

import { endImpersonation } from "@/app/platform/impersonate/actions";

type ImpersonationBannerProps = {
  actingAsName: string;
  companyName: string;
};

export function ImpersonationBanner({ actingAsName, companyName }: ImpersonationBannerProps) {
  async function handleReturn() {
    await endImpersonation("/dashboard");
  }

  return (
    <div
      role="banner"
      className="flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-sm"
    >
      <span>
        Impersonating: <strong>{actingAsName}</strong>
        {companyName ? ` (${companyName})` : ""}
      </span>
      <button
        type="button"
        onClick={() => void handleReturn()}
        className="shrink-0 rounded bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-900"
      >
        Return to My Profile
      </button>
    </div>
  );
}
