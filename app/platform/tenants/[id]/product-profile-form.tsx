"use client";

import { useTransition, useState } from "react";
import { updateTenantProductProfile } from "../actions";
import type { ProductProfile } from "@/src/types/fleet";
import { Button } from "@/src/components/ui/button";
import { FormField } from "@/src/components/ui/form-field";

const PROFILE_OPTIONS: { value: ProductProfile; label: string }[] = [
  { value: "cmms", label: "CMMS" },
  { value: "fleet_intelligence", label: "Fleet Intelligence" },
  { value: "hybrid", label: "Hybrid (CMMS + Fleet)" },
];

type ProductProfileFormProps = {
  tenantId: string;
  initialProfile: ProductProfile;
};

export function ProductProfileForm({ tenantId, initialProfile }: ProductProfileFormProps) {
  const [profile, setProfile] = useState<ProductProfile>(initialProfile);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateTenantProductProfile(tenantId, profile);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Product profile updated." });
      }
    });
  };

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-[var(--accent)]/10 text-[var(--accent)]"
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}
      <FormField label="Product profile" htmlFor="product_profile">
        <select
          id="product_profile"
          value={profile}
          onChange={(e) => setProfile(e.target.value as ProductProfile)}
          className="ui-select max-w-sm"
          disabled={isPending}
        >
          {PROFILE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>
      <p className="text-xs text-[var(--muted)]">
        Controls fleet vs CMMS navigation and features for this tenant.
      </p>
      <Button type="button" onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save product profile"}
      </Button>
    </div>
  );
}
