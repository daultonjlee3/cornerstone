"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useIsLg } from "@/src/lib/use-media-query";
import {
  DetailDrawer,
  DetailDrawerBody,
  DetailHeader,
  DetailTabs,
  DetailActionBar,
} from "@/src/components/command-center";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { getAssetPaneData } from "../actions";
import type { AssetRow } from "./assets-list";
import { formatDate } from "@/src/lib/date-utils";

type PaneData = Awaited<ReturnType<typeof getAssetPaneData>>["data"];

export type AssetCommandCenterPaneProps = {
  asset: AssetRow;
  onClose: () => void;
};

function locationDisplay(asset: { property_name?: string | null; building_name?: string | null; unit_name?: string | null }): string {
  const parts = [asset.property_name, asset.building_name, asset.unit_name].filter(Boolean);
  return parts.length ? parts.join(" / ") : "—";
}

export function AssetCommandCenterPane({ asset, onClose }: AssetCommandCenterPaneProps) {
  const isLg = useIsLg();
  const showBack = !isLg;
  const [paneData, setPaneData] = useState<PaneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
    getAssetPaneData(asset.id).then((res) => {
      setLoading(false);
      if (res.error) setError(res.error);
      else setPaneData(res.data ?? null);
    });
  }, [asset.id]);

  const displayName = asset.asset_name ?? asset.name ?? "Asset";
  const labelClass = "text-xs font-normal text-[var(--muted)]";
  const valueClass = "text-sm font-medium text-[var(--foreground)] mt-0.5";

  const overviewTab = (
    <div className="p-5">
      {loading ? (
        <div className="animate-pulse space-y-3 text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : paneData ? (
        <div className="space-y-4">
          <div>
            <dt className={labelClass}>Status</dt>
            <dd className={valueClass}>
              <StatusBadge status={paneData.asset.status ?? "active"} />
            </dd>
          </div>
          <div>
            <dt className={labelClass}>Condition</dt>
            <dd className={valueClass}>{paneData.asset.condition ?? "—"}</dd>
          </div>
          <div>
            <dt className={labelClass}>Type</dt>
            <dd className={valueClass}>{paneData.asset.asset_type ?? "—"}</dd>
          </div>
          <div>
            <dt className={labelClass}>Location</dt>
            <dd className={valueClass}>{locationDisplay(paneData.asset)}</dd>
          </div>
          <div>
            <dt className={labelClass}>Company</dt>
            <dd className={valueClass}>{paneData.asset.company_name ?? "—"}</dd>
          </div>
          {(paneData.asset.manufacturer ?? paneData.asset.model) && (
            <div>
              <dt className={labelClass}>Manufacturer / Model</dt>
              <dd className={valueClass}>
                {[paneData.asset.manufacturer, paneData.asset.model].filter(Boolean).join(" / ") || "—"}
              </dd>
            </div>
          )}
          {paneData.asset.health_score != null && (
            <div>
              <dt className={labelClass}>Health score</dt>
              <dd className={valueClass}>{Number(paneData.asset.health_score).toFixed(0)}</dd>
            </div>
          )}
          <div className="pt-4 border-t border-[var(--card-border)]">
            <Link
              href={`/assets/${asset.id}`}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              View full asset page →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );

  const workOrdersTab = (
    <div className="p-5">
      {loading ? (
        <div className="animate-pulse text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : paneData?.workOrders.length ? (
        <ul className="space-y-2">
          {paneData.workOrders.map((wo) => (
            <li key={wo.id} className="flex items-center justify-between rounded-lg border border-[var(--card-border)]/80 px-3 py-2">
              <div>
                <Link href={`/work-orders/${wo.id}`} className="text-sm font-medium text-[var(--accent)] hover:underline">
                  {wo.work_order_number ?? wo.id.slice(0, 8)}
                </Link>
                <p className="text-xs text-[var(--muted)]">{wo.title ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={wo.status ?? "new"} />
                <span className="text-xs text-[var(--muted)]">{wo.created_at ? formatDate(wo.created_at) : ""}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">No work orders linked to this asset.</p>
      )}
      <div className="mt-4">
        <Link
          href={`/work-orders?new=1&asset_id=${encodeURIComponent(asset.id)}`}
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Create work order for this asset →
        </Link>
      </div>
    </div>
  );

  const pmTab = (
    <div className="p-5">
      {loading ? (
        <div className="animate-pulse text-sm text-[var(--muted)]">Loading…</div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : paneData?.pmPlans.length ? (
        <ul className="space-y-2">
          {paneData.pmPlans.map((plan) => (
            <li key={plan.id} className="flex items-center justify-between rounded-lg border border-[var(--card-border)]/80 px-3 py-2">
              <div>
                <Link href={`/preventive-maintenance/${plan.id}`} className="text-sm font-medium text-[var(--accent)] hover:underline">
                  {plan.name ?? plan.id.slice(0, 8)}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={plan.status ?? "active"} />
                <span className="text-xs text-[var(--muted)]">
                  {plan.next_run_date ? formatDate(plan.next_run_date) : "—"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">No PM schedules for this asset.</p>
      )}
      <div className="mt-4">
        <Link
          href={`/preventive-maintenance?new=1&asset_id=${encodeURIComponent(asset.id)}&company_id=${encodeURIComponent(asset.company_id)}`}
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Schedule PM for this asset →
        </Link>
      </div>
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", content: overviewTab },
    { id: "work_orders", label: "Work Orders", content: workOrdersTab },
    { id: "pm", label: "PM", content: pmTab },
  ];

  return (
    <DetailDrawer className="flex flex-col">
      <DetailHeader
        title={displayName}
        subtitle={locationDisplay(asset)}
        onClose={onClose}
        showBack={showBack}
        viewFullHref={`/assets/${asset.id}`}
      />
      <DetailDrawerBody className="flex flex-col">
        <DetailTabs tabs={tabs} defaultTabId="overview" className="flex-1 min-h-0" />
      </DetailDrawerBody>
      <DetailActionBar stickyBottom={showBack}>
        <Link
          href={`/assets/${asset.id}`}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
        >
          View full asset
        </Link>
      </DetailActionBar>
    </DetailDrawer>
  );
}
