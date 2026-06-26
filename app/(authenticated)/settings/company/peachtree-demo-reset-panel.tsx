"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/src/components/ui/button";

type RefreshResponse = {
  ok?: boolean;
  error?: string;
  demoBoardDate?: string;
  truckCount?: number;
  unassignedOnDemoDay?: number;
  recommendationCount?: number;
  validationPassed?: boolean;
  failedChecks?: string[];
};

type PeachtreeDemoResetPanelProps = {
  truckTarget: number;
  unassignedTarget: number;
};

export function PeachtreeDemoResetPanel({
  truckTarget,
  unassignedTarget,
}: PeachtreeDemoResetPanelProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<RefreshResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/fleet/demo/refresh", { method: "POST" });
      const body = (await response.json()) as RefreshResponse;
      if (!response.ok) {
        setError(body.error ?? "Demo reset failed.");
        setConfirmed(false);
        return;
      }
      setResult(body);
      setConfirmed(false);
      router.refresh();
    } catch {
      setError("Network error while resetting demo data.");
      setConfirmed(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="space-y-4 rounded-xl border border-[color-mix(in_srgb,var(--brand-operational)_28%,var(--card-border))] bg-[color-mix(in_srgb,var(--brand-operational)_6%,var(--card))] p-4"
      data-testid="peachtree-demo-reset-panel"
    >
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--brand-operational)]">
          Demo environment
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Reset Peachtree Industrial with fresh operational data for sales walkthroughs. Clears and
          reseeds trucks, jobs, telematics, utilization history, and dispatch recommendations.
        </p>
        <ul className="mt-2 list-inside list-disc text-xs text-[var(--muted)]">
          <li>
            {truckTarget} trucks with home coordinates and live telematics positions on the map
          </li>
          <li>{unassignedTarget}+ unassigned jobs on tomorrow&apos;s dispatch board</li>
          <li>Staged PM conflicts, GPS exceptions, and AI recommendations</li>
        </ul>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-300/40 bg-red-950/20 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {result?.ok ? (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-200">
          <p className="font-medium">Demo reset complete.</p>
          <p className="mt-1 text-xs text-emerald-100/90">
            {result.truckCount} trucks · {result.unassignedOnDemoDay} unassigned jobs on{" "}
            {result.demoBoardDate} · {result.recommendationCount} recommendations
            {result.validationPassed ? "" : " · some validation checks did not pass"}
          </p>
          {result.failedChecks && result.failedChecks.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-xs text-amber-200/90">
              {result.failedChecks.slice(0, 4).map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2 text-xs text-emerald-100/80">
            Open{" "}
            <a
              href={`/dispatch?date=${result.demoBoardDate}`}
              className="underline underline-offset-2"
            >
              Dispatch for {result.demoBoardDate}
            </a>{" "}
            to review the refreshed board.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={confirmed ? "danger" : "secondary"}
          disabled={pending}
          onClick={handleReset}
          className="gap-2"
        >
          <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
          {pending
            ? "Resetting demo data…"
            : confirmed
              ? "Confirm reset — this cannot be undone"
              : "Reset demo with fresh data"}
        </Button>
        {confirmed && !pending ? (
          <button
            type="button"
            className="text-sm text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
            onClick={() => setConfirmed(false)}
          >
            Cancel
          </button>
        ) : null}
      </div>

      <p className="text-xs text-[var(--muted)]">
        This may take 1–2 minutes. Only available on the Peachtree Industrial demo tenant.
      </p>
    </section>
  );
}
