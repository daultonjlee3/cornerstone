"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getCurrentUser } from "@/src/lib/auth-context";
import { setNotificationPreference } from "@/src/lib/notifications/service";
import type { NotificationChannel } from "@/src/lib/notifications/types";

export async function setPreference(
  channel: NotificationChannel,
  category: string,
  enabled: boolean
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  const supabase = await createClient();
  await setNotificationPreference(supabase, user.id, channel, category, enabled);
  return {};
}
