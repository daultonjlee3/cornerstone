/**
 * Central notification dispatch: resolve recipients, apply role/user precedence,
 * and deliver via in-app, email, and SMS with delivery logging.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/src/lib/notifications/service";
import { sendEmailAlert } from "@/src/lib/notifications";
import { eventTypeToCategory } from "@/src/lib/notifications/types";
import type { NotificationChannel } from "@/src/lib/notifications/types";

const CHANNELS: NotificationChannel[] = ["in_app", "email", "sms"];

export type DispatchParams = {
  tenantId: string;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  message: string;
  body?: string | null;
  companyId?: string | null;
  /** Explicit user IDs to notify (e.g. assigned technician). */
  recipientUserIds?: string[];
  /** Roles to expand to user IDs (e.g. all admins). */
  recipientRoles?: string[];
  /** When true, notify all tenant members (in addition to any recipientUserIds/recipientRoles). */
  includeAllTenantMembers?: boolean;
  /** Optional: exclude these user IDs (e.g. actor). */
  excludeUserIds?: string[];
  /** Optional: resolve email/phone for user IDs when sending email/SMS. */
  getContactForUser?: (userId: string) => Promise<{ email?: string | null; phone?: string | null }>;
};

type EventTypeDefaults = {
  default_in_app: boolean;
  default_email: boolean;
  default_sms: boolean;
};

type RoleRule = {
  in_app: boolean;
  email: boolean;
  sms: boolean;
  enabled: boolean;
};

/** Get the tenant role for a user (from tenant_memberships). */
export async function getRoleForUserInTenant(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { role?: string } | null)?.role ?? null;
}

/** Get all user IDs in a tenant that have the given role. */
export async function getUsersWithRoleInTenant(
  supabase: SupabaseClient,
  tenantId: string,
  role: string
): Promise<string[]> {
  const { data } = await supabase
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("role", role);
  return ((data ?? []) as Array<{ user_id?: string | null }>)
    .map((r) => r.user_id)
    .filter((id): id is string => Boolean(id));
}

/** Fetch event type defaults from notification_event_types. */
export async function getEventTypeDefaults(
  supabase: SupabaseClient,
  eventType: string
): Promise<EventTypeDefaults | null> {
  const { data } = await supabase
    .from("notification_event_types")
    .select("default_in_app, default_email, default_sms")
    .eq("code", eventType)
    .maybeSingle();
  return data as EventTypeDefaults | null;
}

/** Fetch role-level rule for tenant + role + event_type. */
export async function getRoleRule(
  supabase: SupabaseClient,
  tenantId: string,
  role: string,
  eventType: string
): Promise<RoleRule | null> {
  const { data } = await supabase
    .from("notification_rules")
    .select("in_app, email, sms, enabled")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("event_type", eventType)
    .maybeSingle();
  return data as RoleRule | null;
}

/**
 * Whether a channel is enabled for a user for this event.
 * Precedence: user preference (if row exists) → role rule (if exists) → event type default.
 */
export async function isChannelEnabledForUser(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  eventType: string,
  channel: NotificationChannel
): Promise<boolean> {
  const category = eventTypeToCategory(eventType);

  // 1) User preference (notification_preferences)
  const { data: pref } = await supabase
    .from("notification_preferences")
    .select("enabled")
    .eq("user_id", userId)
    .eq("channel", channel)
    .eq("category", category)
    .maybeSingle();
  if (pref != null) return (pref as { enabled: boolean }).enabled;

  // 2) Role rule
  const role = await getRoleForUserInTenant(supabase, tenantId, userId);
  if (role) {
    const rule = await getRoleRule(supabase, tenantId, role, eventType);
    if (rule && rule.enabled) {
      if (channel === "in_app") return rule.in_app;
      if (channel === "email") return rule.email;
      if (channel === "sms") return rule.sms;
    }
  }

  // 3) Event type default
  const defaults = await getEventTypeDefaults(supabase, eventType);
  if (defaults) {
    if (channel === "in_app") return defaults.default_in_app;
    if (channel === "email") return defaults.default_email;
    if (channel === "sms") return defaults.default_sms;
  }

  return channel === "in_app";
}

/**
 * Get all user IDs that are members of the tenant.
 */
export async function getAllUserIdsInTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", tenantId);
  return ((data ?? []) as Array<{ user_id?: string | null }>)
    .map((r) => r.user_id)
    .filter((id): id is string => Boolean(id));
}

/**
 * Resolve recipient user IDs from explicit IDs, role expansion, or all tenant members.
 * Deduplicates and optionally excludes users.
 */
export async function resolveRecipients(
  supabase: SupabaseClient,
  tenantId: string,
  options: {
    recipientUserIds?: string[];
    recipientRoles?: string[];
    /** When true, include every tenant member (in addition to any explicit IDs/roles). */
    includeAllTenantMembers?: boolean;
    excludeUserIds?: string[];
  }
): Promise<string[]> {
  const {
    recipientUserIds = [],
    recipientRoles = [],
    includeAllTenantMembers = false,
    excludeUserIds = [],
  } = options;
  const exclude = new Set(excludeUserIds.filter(Boolean));
  const userIds = new Set<string>();

  for (const id of recipientUserIds) {
    if (id && !exclude.has(id)) userIds.add(id);
  }
  for (const role of recipientRoles) {
    const byRole = await getUsersWithRoleInTenant(supabase, tenantId, role);
    for (const id of byRole) {
      if (!exclude.has(id)) userIds.add(id);
    }
  }
  if (includeAllTenantMembers) {
    const all = await getAllUserIdsInTenant(supabase, tenantId);
    for (const id of all) {
      if (!exclude.has(id)) userIds.add(id);
    }
  }

  return Array.from(userIds);
}

/**
 * Dispatch a notification event: resolve recipients, apply channel precedence,
 * create in-app notifications, and queue email/SMS with delivery records.
 */
export async function dispatchNotificationEvent(
  supabase: SupabaseClient,
  params: DispatchParams
): Promise<{ inAppCreated: number; emailQueued: number; smsQueued: number }> {
  const {
    tenantId,
    companyId,
    eventType,
    entityType,
    entityId,
    title,
    message,
    body,
    recipientUserIds = [],
    recipientRoles = [],
    includeAllTenantMembers = false,
    excludeUserIds = [],
    getContactForUser,
  } = params;

  const userIds = await resolveRecipients(supabase, tenantId, {
    recipientUserIds,
    recipientRoles,
    includeAllTenantMembers,
    excludeUserIds,
  });
  if (userIds.length === 0) {
    return { inAppCreated: 0, emailQueued: 0, smsQueued: 0 };
  }

  let inAppCreated = 0;
  let emailQueued = 0;
  let smsQueued = 0;

  for (const userId of userIds) {
    for (const channel of CHANNELS) {
      const enabled = await isChannelEnabledForUser(
        supabase,
        userId,
        tenantId,
        eventType,
        channel
      );
      if (!enabled) continue;

      if (channel === "in_app") {
        const id = await createNotification(supabase, {
          companyId: companyId ?? null,
          userId,
          eventType,
          title,
          message,
          body: body ?? null,
          entityType: entityType ?? null,
          entityId: entityId ?? null,
          metadata: {},
        });
        if (id) inAppCreated++;
        continue;
      }

      if (channel === "email" || channel === "sms") {
        const deliveryId = await insertDeliveryRecord(supabase, {
          userId,
          channel,
          eventType,
          entityType: entityType ?? null,
          entityId: entityId ?? null,
          title,
          message,
        });
        if (!deliveryId) continue;

        if (channel === "email") {
          emailQueued++;
          const email = getContactForUser
            ? (await getContactForUser(userId)).email
            : null;
          if (email && email.includes("@")) {
            const ok = await sendEmailAlert({
              subject: title,
              message,
              recipients: [email],
            });
            await updateDeliveryStatus(supabase, deliveryId, ok ? "sent" : "failed");
          } else {
            await updateDeliveryStatus(
              supabase,
              deliveryId,
              "failed",
              "No email for user"
            );
          }
        }

        if (channel === "sms") {
          smsQueued++;
          const phone = getContactForUser
            ? (await getContactForUser(userId)).phone
            : null;
          if (phone) {
            // Placeholder: wire SMS provider here; for now mark as failed with reason
            await updateDeliveryStatus(
              supabase,
              deliveryId,
              "failed",
              "SMS provider not configured"
            );
          } else {
            await updateDeliveryStatus(
              supabase,
              deliveryId,
              "failed",
              "No phone for user"
            );
          }
        }
      }
    }
  }

  return { inAppCreated, emailQueued, smsQueued };
}

async function insertDeliveryRecord(
  supabase: SupabaseClient,
  row: {
    userId: string;
    channel: "email" | "sms";
    eventType: string;
    entityType: string | null;
    entityId: string | null;
    title: string;
    message: string;
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from("notification_deliveries")
    .insert({
      user_id: row.userId,
      channel: row.channel,
      event_type: row.eventType,
      entity_type: row.entityType,
      entity_id: row.entityId,
      title: row.title,
      message: row.message,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) return null;
  return (data as { id: string })?.id ?? null;
}

async function updateDeliveryStatus(
  supabase: SupabaseClient,
  deliveryId: string,
  status: "sent" | "failed",
  errorMessage?: string
): Promise<void> {
  await supabase
    .from("notification_deliveries")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      error_message: errorMessage ?? null,
    })
    .eq("id", deliveryId);
}
