import type { SupabaseClient } from "@supabase/supabase-js";
import { dateOnlyUTC } from "@/src/lib/date-utils";

export type NotificationType =
  | "maintenance_request_created"
  | "work_order_assigned"
  | "work_order_overdue"
  | "pm_due_soon";

export type NotificationPayload = {
  userIds: string[];
  /** Logical notification type; stored as event_type in the DB. */
  type: NotificationType;
  entityType: string;
  entityId: string;
  /** Short title for the notification (used as title/body in the DB). */
  message: string;
  metadata?: Record<string, unknown> | null;
};

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  entity_type: string;
  entity_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

function addDays(baseDate: string, days: number): string {
  const base = new Date(`${baseDate}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return dateOnlyUTC(base);
}

/**
 * Create in-app notifications for the given users. Idempotent per (event_type, entity_type, entity_id, user_id):
 * we skip users who already have an unread notification for the same event/entity, so duplicate triggers do not create duplicate notifications.
 */
export async function createNotifications(
  supabase: SupabaseClient,
  payload: NotificationPayload
): Promise<number> {
  const dedupedUserIds = Array.from(new Set(payload.userIds.filter(Boolean)));
  if (dedupedUserIds.length === 0) return 0;

  const { data: existingRows } = await supabase
    .from("notifications")
    .select("user_id")
    .in("user_id", dedupedUserIds)
    .eq("event_type", payload.type)
    .eq("entity_type", payload.entityType)
    .eq("entity_id", payload.entityId)
    .is("read_at", null);
  const existingUserIds = new Set(
    ((existingRows ?? []) as Array<{ user_id?: string | null }>)
      .map((row) => row.user_id)
      .filter(Boolean) as string[]
  );

  const rowsToInsert = dedupedUserIds
    .filter((userId) => !existingUserIds.has(userId))
    .map((userId) => ({
      company_id: null,
      user_id: userId,
      event_type: payload.type,
      title: payload.message,
      message: payload.message,
      body: null,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      metadata: payload.metadata ?? {},
    }));
  if (rowsToInsert.length === 0) return 0;

  const { error } = await supabase.from("notifications").insert(rowsToInsert);
  if (error) throw new Error(error.message);
  return rowsToInsert.length;
}

export async function createTenantNotification(
  supabase: SupabaseClient,
  {
    tenantId,
    excludeUserId,
    ...notification
  }: {
    tenantId: string;
    excludeUserId?: string | null;
  } & Omit<NotificationPayload, "userIds">
): Promise<number> {
  const { data: membershipRows } = await supabase
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", tenantId);
  const userIds = ((membershipRows ?? []) as Array<{ user_id?: string | null }>)
    .map((row) => row.user_id)
    .filter((value): value is string => Boolean(value))
    .filter((value) => value !== excludeUserId);

  return createNotifications(supabase, {
    userIds,
    ...notification,
  });
}

export async function listNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 15
): Promise<{ unreadCount: number; items: NotificationListItem[] }> {
  const [rowsResult, unreadResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, event_type, title, entity_type, entity_id, message, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);

  return {
    unreadCount: unreadResult.count ?? 0,
    items: ((rowsResult.data ?? []) as Array<{
      id: string;
      event_type: string;
      title: string | null;
      entity_type: string;
      entity_id: string;
      message: string | null;
      created_at: string;
      read_at: string | null;
    }>).map((row) => ({
      id: row.id,
      type: row.event_type,
      title: row.title ?? row.message ?? "",
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      message: row.message ?? "",
      created_at: row.created_at,
      read_at: row.read_at,
    })),
  };
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  {
    userId,
    notificationId,
    markAll,
  }: {
    userId: string;
    notificationId?: string | null;
    markAll?: boolean;
  }
): Promise<void> {
  if (markAll) {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return;
  }

  if (!notificationId) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

/**
 * Create overdue and PM-due-soon notifications for the user (called on-demand when fetching notifications, e.g. GET /api/notifications).
 * Idempotent: createNotifications skips users who already have an unread notification for the same work order or PM plan.
 */
export async function syncDueNotificationsForUser(
  supabase: SupabaseClient,
  {
    userId,
    companyIds,
  }: {
    userId: string;
    companyIds: string[];
  }
): Promise<{ overdueCreated: number; pmDueSoonCreated: number }> {
  if (companyIds.length === 0) {
    return { overdueCreated: 0, pmDueSoonCreated: 0 };
  }

  const today = dateOnlyUTC(new Date());
  const pmDueSoonUntil = addDays(today, 3);

  const [overdueResult, pmDueSoonResult] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id, work_order_number, title, due_date")
      .in("company_id", companyIds)
      .lt("due_date", today)
      .not("status", "in", "(completed,cancelled)")
      .order("due_date", { ascending: true })
      .limit(10),
    supabase
      .from("preventive_maintenance_plans")
      .select("id, name, next_run_date")
      .in("company_id", companyIds)
      .eq("status", "active")
      .gte("next_run_date", today)
      .lte("next_run_date", pmDueSoonUntil)
      .order("next_run_date", { ascending: true })
      .limit(10),
  ]);

  let overdueCreated = 0;
  for (const row of (overdueResult.data ?? []) as Array<{
    id: string;
    work_order_number?: string | null;
    title?: string | null;
    due_date?: string | null;
  }>) {
    overdueCreated += await createNotifications(supabase, {
      userIds: [userId],
      type: "work_order_overdue",
      entityType: "work_order",
      entityId: row.id,
      message: `${row.work_order_number ?? row.title ?? "Work order"} is overdue.`,
      metadata: { due_date: row.due_date ?? null },
    });
  }

  let pmDueSoonCreated = 0;
  for (const row of (pmDueSoonResult.data ?? []) as Array<{
    id: string;
    name?: string | null;
    next_run_date?: string | null;
  }>) {
    pmDueSoonCreated += await createNotifications(supabase, {
      userIds: [userId],
      type: "pm_due_soon",
      entityType: "preventive_maintenance_plan",
      entityId: row.id,
      message: `${row.name ?? "PM plan"} is due soon (${row.next_run_date ?? "scheduled"}).`,
      metadata: { next_run_date: row.next_run_date ?? null },
    });
  }

  return { overdueCreated, pmDueSoonCreated };
}

export async function getCompanyAlertRecipients(
  supabase: SupabaseClient,
  companyIds: string[]
): Promise<string[]> {
  if (companyIds.length === 0) return [];
  const { data: rows } = await supabase
    .from("companies")
    .select("email, primary_contact_email")
    .in("id", companyIds);
  const recipients = new Set<string>();
  for (const row of (rows ?? []) as Array<{
    email?: string | null;
    primary_contact_email?: string | null;
  }>) {
    if (row.email && row.email.includes("@")) recipients.add(row.email);
    if (row.primary_contact_email && row.primary_contact_email.includes("@")) {
      recipients.add(row.primary_contact_email);
    }
  }
  return Array.from(recipients);
}

/**
 * Send an email alert via Resend. Best-effort; callers should not block on this.
 * Logs when config is missing or send fails so failures are visible in server logs.
 */
export async function sendEmailAlert(
  {
    subject,
    message,
    recipients,
  }: {
    subject: string;
    message: string;
    recipients: string[];
  }
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL?.trim();
  const validRecipients = recipients.filter((email) => email.includes("@"));
  if (!apiKey || !fromEmail || validRecipients.length === 0) {
    if (process.env.NODE_ENV !== "test" && validRecipients.length > 0) {
      console.warn(
        "[notifications] sendEmailAlert skipped: missing RESEND_API_KEY or NOTIFICATION_FROM_EMAIL, or no valid recipients."
      );
    }
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: validRecipients,
        subject,
        text: message,
      }),
    });
    if (!response.ok && process.env.NODE_ENV !== "test") {
      const body = await response.text();
      console.warn(
        `[notifications] sendEmailAlert failed: ${response.status} ${response.statusText}`,
        body.slice(0, 200)
      );
    }
    return response.ok;
  } catch (err) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[notifications] sendEmailAlert error:", err instanceof Error ? err.message : err);
    }
    return false;
  }
}
