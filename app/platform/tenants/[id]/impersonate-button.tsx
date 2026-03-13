"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startImpersonationPlatform } from "@/app/platform/impersonate/actions";

export function ImpersonateButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImpersonate() {
    setLoading(true);
    setError(null);
    const err = await startImpersonationPlatform(userId);
    if (err) {
      setError(err);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void handleImpersonate()}
        disabled={loading}
        className="rounded border border-[var(--accent)] bg-transparent px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-50"
      >
        {loading ? "…" : "Impersonate"}
      </button>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
