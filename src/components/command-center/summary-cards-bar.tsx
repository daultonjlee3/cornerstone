"use client";

import type { LucideIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { MetricCard } from "@/src/components/ui/metric-card";

export type SummaryCardItem = {
  key: string;
  label: string;
  value: number;
  /** When set, clicking the card sets this URL param value (filters the list only). */
  view?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "good" | "bad";
  variant?: "default" | "danger" | "success";
  description?: string;
};

export type SummaryCardsBarProps = {
  /** Base path (e.g. "/work-orders", "/assets"). */
  path: string;
  /** URL param name for the view when a card is clicked (default "view"). */
  paramName?: string;
  cards: SummaryCardItem[];
  /** Grid columns: default "sm:grid-cols-2 lg:grid-cols-6". */
  gridClass?: string;
};

/**
 * Reusable summary card row. Counts must be computed with a stats-only query (no list filters)
 * so they stay stable when switching saved views. Clicking a card can set the view param to filter the list.
 */
export function SummaryCardsBar({
  path,
  paramName = "view",
  cards,
  gridClass = "grid gap-3 sm:grid-cols-2 lg:grid-cols-6",
}: SummaryCardsBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const applyView = useCallback(
    (view: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(paramName, view);
      router.push(`${path}?${next.toString()}`);
    },
    [router, searchParams, paramName, path]
  );

  return (
    <div className={gridClass}>
      {cards.map(({ key, label, value, view, icon, tone, variant = "default", description }) => {
        const trend = tone ? { label: view ? `View ${label}` : label, tone } : undefined;
        const cardContent = (
          <MetricCard
            title={label}
            value={value}
            description={description}
            trend={trend}
            icon={icon}
            variant={variant}
          />
        );

        if (view != null) {
          return (
            <button
              key={key}
              type="button"
              onClick={() => applyView(view)}
              className="text-left transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded-lg"
              aria-label={`Filter by ${label}: ${value} items`}
            >
              {cardContent}
            </button>
          );
        }

        return <div key={key}>{cardContent}</div>;
      })}
    </div>
  );
}
