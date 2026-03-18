"use client";

import { useState } from "react";
import { TenantAiAllowanceModal } from "../TenantAiAllowanceModal";

type Props = {
  tenantId: string;
};

export function TenantAiAllowanceModalWrapper({ tenantId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-[var(--radius-control)] border border-[var(--card-border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
      >
        Manage AI allowance
      </button>
      {open ? (
        <TenantAiAllowanceModal tenantId={tenantId} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

