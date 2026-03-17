import type { AssetTimelineEventType } from "@/src/lib/assets/intelligence-types";
import {
  Wrench,
  FilePlus,
  CalendarCheck,
  Calendar,
  Edit3,
  Link2,
  Move,
  Unlink,
  Package,
  StickyNote,
  Box,
  CalendarDays,
  Activity,
} from "lucide-react";

const ICON_CLASS = "size-4 shrink-0";

const iconMap: Record<AssetTimelineEventType, React.ReactNode> = {
  WORK_ORDER_COMPLETED: <Wrench className={ICON_CLASS} />,
  WORK_ORDER_CREATED: <FilePlus className={ICON_CLASS} />,
  PM_COMPLETED: <CalendarCheck className={ICON_CLASS} />,
  PM_CREATED: <Calendar className={ICON_CLASS} />,
  ASSET_UPDATED: <Edit3 className={ICON_CLASS} />,
  SUB_ASSET_ADDED: <Link2 className={ICON_CLASS} />,
  SUB_ASSET_MOVED: <Move className={ICON_CLASS} />,
  SUB_ASSET_REMOVED: <Unlink className={ICON_CLASS} />,
  PART_USED: <Package className={ICON_CLASS} />,
  NOTE_ADDED: <StickyNote className={ICON_CLASS} />,
  ASSET_CREATED: <Box className={ICON_CLASS} />,
  ASSET_INSTALLATION: <CalendarDays className={ICON_CLASS} />,
  ASSET_EVENT: <Activity className={ICON_CLASS} />,
};

type TimelineEventIconProps = {
  canonicalType?: AssetTimelineEventType | null;
  eventType?: string;
};

export function TimelineEventIcon({ canonicalType, eventType }: TimelineEventIconProps) {
  const key = canonicalType ?? inferCanonicalType(eventType ?? "");
  const icon = iconMap[key] ?? iconMap.ASSET_EVENT;
  return <span className="flex items-center justify-center text-[var(--muted)]">{icon}</span>;
}

function inferCanonicalType(eventType: string): AssetTimelineEventType {
  const lower = eventType.toLowerCase();
  if (lower.includes("work_order") && lower.includes("completed"))
    return "WORK_ORDER_COMPLETED";
  if (lower.includes("work_order")) return "WORK_ORDER_CREATED";
  if (lower.includes("pm_run") && lower.includes("completed")) return "PM_COMPLETED";
  if (lower.includes("pm")) return "PM_CREATED";
  if (lower.includes("part")) return "PART_USED";
  if (lower.includes("note")) return "NOTE_ADDED";
  if (lower.includes("sub_asset_linked")) return "SUB_ASSET_ADDED";
  if (lower.includes("sub_asset_moved")) return "SUB_ASSET_MOVED";
  if (lower.includes("sub_asset_unlinked")) return "SUB_ASSET_REMOVED";
  if (lower.includes("asset_edited")) return "ASSET_UPDATED";
  if (lower.includes("asset_created")) return "ASSET_CREATED";
  if (lower.includes("installation")) return "ASSET_INSTALLATION";
  return "ASSET_EVENT";
}
