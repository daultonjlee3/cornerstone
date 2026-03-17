"use client";

import { useTransition } from "react";
import { switchToTenant } from "../switch-tenant/actions";
import { Button } from "@/src/components/ui/button";

type Props = { tenantId: string; label?: string };

export function WorkInTenantButton({ tenantId, label = "Work in this tenant" }: Props) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      switchToTenant(tenantId);
    });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="shrink-0"
    >
      {pending ? "Switching…" : label}
    </Button>
  );
}
