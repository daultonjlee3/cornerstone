/**
 * Central notification dispatch: resolve recipients, apply role/user precedence,
 * and deliver via in-app, email, and SMS with delivery logging.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/src/lib/notifications/service";
import { sendEmailAlert } from "@/src/lib/notifications";
import { CHANNELS as ALL_CHANNELS, type NotificationChannel } from "@/src/lib/notifications/types";
import { isChannelEnabledForUserResolved } from "@/src/lib/notifications/policy";

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
  default_push: boolean;
};

type RoleRule = {
  in_app: boolean | null;
  email: boolean | null;
  sms: boolean | null;
  push: boolean | null;
  enabled: boolean | null;
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
    .select("default_in_app, default_email, default_sms, default_push")
    .eq("code", eventType)
    .maybeSingle();
  return data as EventTypeDefaults | null;
}

/** Tenant-wide role rule (company_id IS NULL). */
export async function getRoleRule(
  supabase: SupabaseClient,
  tenantId: string,
  role: string,
  eventType: string
): Promise<RoleRule | null> {
  const { data } = await supabase
    .from("notification_rules")
    .select("in_app, email, sms, push, enabled")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("event_type", eventType)
    .is("company_id", null)
    .maybeSingle();
  return data as RoleRule | null;
}

/**
 * Whether a channel is enabled for a user for this event.
 * Delegates to centralized policy (company + role + user event prefs + system defaults).
 */
export async function isChannelEnabledForUser(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  eventType: string,
  channel: NotificationChannel,
  companyId?: string | null
): Promise<boolean> {
  const role = await getRoleForUserInTenant(supabase, tenantId, userId);
  return isChannelEnabledForUserResolved(
    supabase,
    userId,
    tenantId,
    companyId ?? null,
    eventType,
    channel,
    role
  );
}

/**
 * Recipients for work-order assignment / schedule alerts: assigned tech users, crew tech users,
 * plus dispatch-style roles (owner, admin, member). Does not notify tenant-wide.
 */
export async function expandWorkOrderAssignmentRecipientUserIds(
  supabase: SupabaseClient,
  technicianId: string | null,
  crewId: string | null
): Promise<{ recipientUserIds: string[]; recipientRoles: string[] }> {
  const recipientUserIds: string[] = [];
  if (technicianId) {
    const { data } = await supabase
      .from("technicians")
      .select("user_id")
      .eq("id", technicianId)
      .maybeSingle();
    const uid = (data as { user_id?: string | null } | null)?.user_id;
    if (uid) recipientUserIds.push(uid);
  }
  if (crewId) {
    const { data: members } = await supabase
      .from("crew_members")
      .select("technician_id")
      .eq("crew_id", crewId);
    const techIds = [
      ...new Set(
        ((members ?? []) as Array<{ technician_id?: string | null }>)
          .map((m) => m.technician_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    for (const tid of techIds) {
      const { data } = await supabase
        .from("technicians")
        .select("user_id")
        .eq("id", tid)
        .maybeSingle();
      const uid = (data as { user_id?: string | null } | null)?.user_id;
      if (uid) recipientUserIds.push(uid);
    }
  }
  const recipientRoles = ["owner", "admin", "member"];
  return { recipientUserIds: [...new Set(recipientUserIds)], recipientRoles };
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

  const roleCache = new Map<string, string | null>();

  for (const userId of userIds) {
    let membershipRole = roleCache.get(userId);
    if (membershipRole === undefined) {
      membershipRole = await getRoleForUserInTenant(supabase, tenantId, userId);
      roleCache.set(userId, membershipRole);
    }
    for (const channel of ALL_CHANNELS) {
      if (channel === "push") {
        // Reserved for mobile push; policy already resolves the flag.
        continue;
      }
      const enabled = await isChannelEnabledForUserResolved(
        supabase,
        userId,
        tenantId,
        companyId ?? null,
        eventType,
        channel,
        membershipRole
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
