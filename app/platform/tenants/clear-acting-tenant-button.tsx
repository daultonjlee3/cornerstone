"use client";

import { useTransition } from "react";
import { clearActingTenant } from "../switch-tenant/actions";
import { Button } from "@/src/components/ui/button";

export function ClearActingTenantButton() {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      clearActingTenant();
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)]"
    >
      {pending ? "Clearing…" : "Clear tenant switch"}
    </Button>
  );
}
