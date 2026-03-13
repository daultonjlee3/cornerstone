"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getCurrentUser } from "@/src/lib/auth-context";
import {
  listNotificationsForUser,
  markNotificationRead,
  markAllNotificationsReadForUser,
  getUnreadCount,
} from "@/src/lib/notifications/service";

export type NotificationItem = {
  id: string;
  event_type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  company_id: string | null;
};

export async function getNotifications(
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<{ notifications: NotificationItem[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { notifications: [], error: "Unauthorized" };
  const supabase = await createClient();
  const list = await listNotificationsForUser(supabase, user.id, options);
  return {
    notifications: list.map((n) => ({
      id: n.id,
      event_type: n.event_type,
      title: n.title,
      message: n.message,
      entity_type: n.entity_type,
      entity_id: n.entity_id,
      read_at: n.read_at,
      created_at: n.created_at,
      company_id: n.company_id,
    })),
  };
}

export async function getNotificationsUnreadCount(): Promise<{ count: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { count: 0, error: "Unauthorized" };
  const supabase = await createClient();
  const count = await getUnreadCount(supabase, user.id);
  return { count };
}

export async function markAsRead(notificationId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  const supabase = await createClient();
  const ok = await markNotificationRead(supabase, notificationId, user.id);
  return ok ? {} : { error: "Failed to mark as read" };
}

export async function markAllAsRead(): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  const supabase = await createClient();
  await markAllNotificationsReadForUser(supabase, user.id);
  return {};
}
