"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  generatePreventiveMaintenanceNow,
  updatePreventiveMaintenancePlanStatus,
} from "../actions";

type Props = {
  planId: string;
  status: "active" | "paused" | "archived";
};

export function PreventiveMaintenanceDetailActions({ planId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );

  const handleStatus = (nextStatus: "active" | "paused" | "archived") => {
    startTransition(async () => {
      const result = await updatePreventiveMaintenancePlanStatus(planId, nextStatus);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({
          type: "success",
          text: `Plan set to ${nextStatus}.`,
        });
        router.refresh();
      }
    });
  };

  const handleGenerateNow = () => {
    startTransition(async () => {
      const result = await generatePreventiveMaintenanceNow(planId);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Manual PM generation completed." });
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2">
      {message && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "error"
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-[var(--accent)]/10 text-[var(--accent)]"
          }`}
        >
          {message.text}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerateNow}
          disabled={isPending || status === "archived"}
          className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
        >
          Generate Work Order Now
        </button>
        {status === "active" ? (
          <button
            type="button"
            onClick={() => handleStatus("paused")}
            disabled={isPending}
            className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
          >
            Pause Plan
          </button>
        ) : status === "paused" ? (
          <button
            type="button"
            onClick={() => handleStatus("active")}
            disabled={isPending}
            className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
          >
            Resume Plan
          </button>
        ) : null}
        {status !== "archived" && (
          <button
            type="button"
            onClick={() => handleStatus("archived")}
            disabled={isPending}
            className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--background)] disabled:opacity-50"
          >
            Archive Plan
          </button>
        )}
      </div>
    </div>
  );
}
