/**
 * Notification service: create, list, mark read, and preferences.
 * Use from server actions. Email delivery is abstracted for future channels.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  eventTypeToCategory,
  type NotificationEventType,
} from "@/src/lib/notifications/types";

export type CreateNotificationInput = {
  companyId?: string | null;
  userId: string;
  eventType: string;
  title: string;
  message?: string | null;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createNotification(
  supabase: SupabaseClient,
  input: CreateNotificationInput
): Promise<string | null> {
  const { error, data } = await supabase
    .from("notifications")
    .insert({
      company_id: input.companyId ?? null,
      user_id: input.userId,
      event_type: input.eventType,
      title: input.title,
      message: input.message ?? null,
      body: input.body ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();
  if (error) return null;
  return (data as { id: string })?.id ?? null;
}

export async function listNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<
  Array<{
    id: string;
    event_type: string;
    title: string;
    message: string | null;
    entity_type: string | null;
    entity_id: string | null;
    read_at: string | null;
    created_at: string;
    company_id: string | null;
  }>
> {
  let q = supabase
    .from("notifications")
    .select("id, event_type, title, message, entity_type, entity_id, read_at, created_at, company_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);
  if (options.unreadOnly) q = q.is("read_at", null);
  const { data } = await q;
  return (data ?? []) as Array<{
    id: string;
    event_type: string;
    title: string;
    message: string | null;
    entity_type: string | null;
    entity_id: string | null;
    read_at: string | null;
    created_at: string;
    company_id: string | null;
  }>;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);
  return !error;
}

export async function markAllNotificationsReadForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

export async function getUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

/** Get user preferences for a channel and category; default true if no row. */
export async function isNotificationEnabled(
  supabase: SupabaseClient,
  userId: string,
  channel: "in_app" | "email",
  category: string
): Promise<boolean> {
  const { data } = await supabase
    .from("notification_preferences")
    .select("enabled")
    .eq("user_id", userId)
    .eq("channel", channel)
    .eq("category", category)
    .maybeSingle();
  if (!data) return true;
  return (data as { enabled: boolean }).enabled;
}

/** Set preference for user, channel, category. */
export async function setNotificationPreference(
  supabase: SupabaseClient,
  userId: string,
  channel: "in_app" | "email",
  category: string,
  enabled: boolean
): Promise<void> {
  await supabase.from("notification_preferences").upsert(
    { user_id: userId, channel, category, enabled },
    { onConflict: "user_id,channel,category" }
  );
}

/** Ensure default preference rows exist for a user (all categories, in_app + email, enabled). */
export async function ensureDefaultPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const categories = [
    "work_orders",
    "assignments",
    "overdue",
    "completions",
    "pm",
    "purchase_orders",
    "inventory",
    "portal_requests",
  ];
  for (const channel of ["in_app", "email"] as const) {
    for (const category of categories) {
      await supabase.from("notification_preferences").upsert(
        { user_id: userId, channel, category, enabled: true },
        { onConflict: "user_id,channel,category" }
      );
    }
  }
}
