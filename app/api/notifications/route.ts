/**
 * Notifications API: GET lists notifications and runs on-demand sync (overdue + PM due soon); POST marks read.
 * Sync is idempotent: createNotifications dedupes by (event_type, entity_id, user_id, unread).
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

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
