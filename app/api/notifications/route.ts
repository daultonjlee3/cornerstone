/**
 * Notifications API: GET lists notifications and runs on-demand sync (overdue + PM due soon); POST marks read.
 * Sync is idempotent: createNotifications dedupes by (event_type, entity_id, user_id, unread).
 *
 * Performance: sync is rate-limited to at most once every SYNC_INTERVAL_MS per user to avoid
 * running 20+ sequential DB round trips on every 60-second poll from the top bar.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import {
  getCompanyAlertRecipients,
  listNotificationsForUser,
  markNotificationRead,
  sendEmailAlert,
  syncDueNotificationsForUser,
} from "@/src/lib/notifications";

function parseLimit(raw: string | null): number {
  const value = Number(raw ?? 15);
  if (!Number.isFinite(value)) return 15;
  return Math.max(1, Math.min(50, Math.trunc(value)));
}

// ── Sync rate limiter ─────────────────────────────────────────────────────────
// Keeps a per-user last-synced timestamp in memory (process-level).
// Prevents the heavy notification sync (up to 22 DB round trips + external
// HTTP calls) from running on every single 60-second poll.
//
// Trade-off: new overdue/PM alerts may appear up to SYNC_INTERVAL_MS late
// (e.g., 2 minutes). This is acceptable for a notification system.
const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const lastSyncedAt = new Map<string, number>();

function shouldSync(userId: string): boolean {
  const last = lastSyncedAt.get(userId);
  if (last === undefined) return true;
  return Date.now() - last >= SYNC_INTERVAL_MS;
}

function recordSync(userId: string): void {
  lastSyncedAt.set(userId, Date.now());
  // Prevent unbounded memory growth: evict entries older than 1 hour.
  if (lastSyncedAt.size > 10_000) {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [uid, ts] of lastSyncedAt) {
      if (ts < cutoff) lastSyncedAt.delete(uid);
    }
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only run the expensive sync at most once per SYNC_INTERVAL_MS per user.
  if (shouldSync(user.id)) {
    recordSync(user.id);

    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const tenantId = membership?.tenant_id ?? null;
    let companyIds: string[] = [];
    if (tenantId) {
      const { data: companies } = await supabase
        .from("companies")
        .select("id")
        .eq("tenant_id", tenantId);
      companyIds = (companies ?? []).map((row) => row.id);
    }

    const syncResult = await syncDueNotificationsForUser(supabase, {
      userId: user.id,
      companyIds,
    });
    if (syncResult.overdueCreated > 0 || syncResult.pmDueSoonCreated > 0) {
      const recipients = await getCompanyAlertRecipients(supabase, companyIds);
      if (syncResult.overdueCreated > 0) {
        await sendEmailAlert({
          subject: "Overdue work orders detected",
          message: `${syncResult.overdueCreated} overdue work order alert(s) were generated in Cornerstone OS.`,
          recipients,
        });
      }
      if (syncResult.pmDueSoonCreated > 0) {
        await sendEmailAlert({
          subject: "Preventive maintenance due soon",
          message: `${syncResult.pmDueSoonCreated} PM due-soon alert(s) were generated in Cornerstone OS.`,
          recipients,
        });
      }
    }
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const data = await listNotificationsForUser(supabase, user.id, limit);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    notificationId?: string;
    markAll?: boolean;
  };
  await markNotificationRead(supabase, {
    userId: user.id,
    notificationId: body.notificationId ?? null,
    markAll: Boolean(body.markAll),
  });
  const data = await listNotificationsForUser(supabase, user.id, 15);
  return NextResponse.json(data);
}
