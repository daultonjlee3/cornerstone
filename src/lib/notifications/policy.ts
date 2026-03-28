/**
 * Central precedence for notification channel delivery and settings UI.
 *
 * Merge order (later steps override earlier ones for each channel):
 * 1. Event type defaults (notification_event_types)
 * 2. Company rule (notification_company_rules) — nullable fields inherit
 * 3. Role rule (notification_rules) — company-specific row, else tenant-wide; nullable fields inherit
 * 4. User per-event preference (notification_user_event_preferences) — non-null per channel wins
 *
 * Legacy notification_preferences (category-wide) is no longer read here so company/role defaults apply.
 * Users who relied on the old screen should re-save under My Preferences (per event).
 *
 * Master `enabled` flags:
 * - Company rule enabled === false → event off for everyone in that company (channels all false).
 * - Role rule enabled === false → event off for that role (channels all false), unless company already disabled.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationChannel } from "@/src/lib/notifications/types";

export type ResolvedNotificationChannels = {
  in_app: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
};

type EventTypeRow = {
  default_in_app: boolean;
  default_email: boolean;
  default_sms: boolean;
  default_push: boolean;
  category: string;
  audience_scopes: string[] | null;
};

/** Nullable DB columns: NULL means inherit from the layer below. */
export type NotificationNullableChannels = {
  enabled: boolean | null;
  in_app: boolean | null;
  email: boolean | null;
  sms: boolean | null;
  push: boolean | null;
};

type NullableChannels = NotificationNullableChannels;

function mergeChannel(base: boolean, ...layers: Array<boolean | null | undefined>): boolean {
  let v = base;
  for (const o of layers) {
    if (o === true || o === false) v = o;
  }
  return v;
}

const ALL_OFF: ResolvedNotificationChannels = {
  in_app: false,
  email: false,
  sms: false,
  push: false,
};

/** Event-type defaults only (no company / role / user layers). */
export function resolvedChannelsFromEventTypeRow(
  et: Pick<
    EventTypeRow,
    "default_in_app" | "default_email" | "default_sms" | "default_push"
  > | null
): ResolvedNotificationChannels {
  if (!et) return { in_app: true, email: false, sms: false, push: false };
  return {
    in_app: et.default_in_app,
    email: et.default_email,
    sms: et.default_sms,
    push: et.default_push,
  };
}

/** After applying a company rule on top of event defaults (for company settings UI and batch merge). */
export function computeAfterCompany(
  eventDefaults: ResolvedNotificationChannels,
  companyRule: NotificationNullableChannels | null
): ResolvedNotificationChannels {
  if (companyRule?.enabled === false) return { ...ALL_OFF };
  return {
    in_app: mergeChannel(eventDefaults.in_app, companyRule?.in_app),
    email: mergeChannel(eventDefaults.email, companyRule?.email),
    sms: mergeChannel(eventDefaults.sms, companyRule?.sms),
    push: mergeChannel(eventDefaults.push, companyRule?.push),
  };
}

/** After applying a role rule on top of `afterCompany` (role settings UI + batch merge). */
export function computeAfterRole(
  afterCompany: ResolvedNotificationChannels,
  roleRule: NotificationNullableChannels | null
): ResolvedNotificationChannels {
  if (roleRule?.enabled === false) return { ...ALL_OFF };
  return {
    in_app: mergeChannel(afterCompany.in_app, roleRule?.in_app),
    email: mergeChannel(afterCompany.email, roleRule?.email),
    sms: mergeChannel(afterCompany.sms, roleRule?.sms),
    push: mergeChannel(afterCompany.push, roleRule?.push),
  };
}

export type UserEventPreferencePartial = {
  in_app: boolean | null;
  email: boolean | null;
  sms: boolean | null;
  push: boolean | null;
};

/**
 * Same precedence as resolveNotificationChannelLayers, without DB I/O (for batched settings UI).
 */
export function computeNotificationLayersFromState(args: {
  eventDefaults: ResolvedNotificationChannels;
  companyRule: NotificationNullableChannels | null;
  roleRule: NotificationNullableChannels | null;
  userRow: UserEventPreferencePartial | null;
}): ResolvedNotificationLayers {
  const { eventDefaults, companyRule, roleRule, userRow } = args;

  if (companyRule?.enabled === false) {
    return { effective: { ...ALL_OFF }, inherited: { ...ALL_OFF } };
  }

  const afterCompany = computeAfterCompany(eventDefaults, companyRule);

  if (roleRule?.enabled === false) {
    return { effective: { ...ALL_OFF }, inherited: { ...ALL_OFF } };
  }

  const afterRole = computeAfterRole(afterCompany, roleRule);

  const effective: ResolvedNotificationChannels = {
    in_app:
      userRow?.in_app !== null && userRow?.in_app !== undefined
        ? userRow.in_app
        : afterRole.in_app,
    email:
      userRow?.email !== null && userRow?.email !== undefined
        ? userRow.email
        : afterRole.email,
    sms:
      userRow?.sms !== null && userRow?.sms !== undefined ? userRow.sms : afterRole.sms,
    push:
      userRow?.push !== null && userRow?.push !== undefined ? userRow.push : afterRole.push,
  };

  return { effective, inherited: afterRole };
}

export async function getNotificationEventTypeRow(
  supabase: SupabaseClient,
  eventType: string
): Promise<EventTypeRow | null> {
  const { data } = await supabase
    .from("notification_event_types")
    .select("default_in_app, default_email, default_sms, default_push, category, audience_scopes")
    .eq("code", eventType)
    .maybeSingle();
  return data as EventTypeRow | null;
}

export async function getNotificationCompanyRule(
  supabase: SupabaseClient,
  companyId: string,
  eventType: string
): Promise<NullableChannels | null> {
  const { data } = await supabase
    .from("notification_company_rules")
    .select("enabled, in_app, email, sms, push")
    .eq("company_id", companyId)
    .eq("event_type", eventType)
    .maybeSingle();
  return data as NullableChannels | null;
}

/** Role rule: prefer company-specific, then tenant-wide (company_id IS NULL). */
export async function getNotificationRoleRule(
  supabase: SupabaseClient,
  tenantId: string,
  role: string,
  eventType: string,
  companyId: string | null
): Promise<NullableChannels | null> {
  if (companyId) {
    const { data: scoped } = await supabase
      .from("notification_rules")
      .select("enabled, in_app, email, sms, push")
      .eq("tenant_id", tenantId)
      .eq("role", role)
      .eq("event_type", eventType)
      .eq("company_id", companyId)
      .maybeSingle();
    if (scoped) return scoped as NullableChannels;
  }
  const { data } = await supabase
    .from("notification_rules")
    .select("enabled, in_app, email, sms, push")
    .eq("tenant_id", tenantId)
    .eq("role", role)
    .eq("event_type", eventType)
    .is("company_id", null)
    .maybeSingle();
  return data as NullableChannels | null;
}

export async function getUserEventPreferenceRow(
  supabase: SupabaseClient,
  userId: string,
  eventType: string
): Promise<NullableChannels | null> {
  const { data } = await supabase
    .from("notification_user_event_preferences")
    .select("in_app, email, sms, push")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .maybeSingle();
  return data as NullableChannels | null;
}

export type ResolvedNotificationLayers = {
  effective: ResolvedNotificationChannels;
  /** After company + role + system defaults; before user per-event overrides. */
  inherited: ResolvedNotificationChannels;
};

/**
 * Resolve channel booleans with inheritance split for the settings UI.
 * @param membershipRole - raw tenant_memberships.role (e.g. technician, member, admin)
 */
export async function resolveNotificationChannelLayers(
  supabase: SupabaseClient,
  args: {
    userId: string;
    tenantId: string;
    companyId: string | null;
    eventType: string;
    membershipRole: string | null;
  }
): Promise<ResolvedNotificationLayers> {
  const { userId, tenantId, companyId, eventType, membershipRole } = args;

  const et = await getNotificationEventTypeRow(supabase, eventType);
  const base = resolvedChannelsFromEventTypeRow(et);

  const companyRule = companyId ? await getNotificationCompanyRule(supabase, companyId, eventType) : null;

  const roleRule =
    membershipRole && membershipRole.length > 0
      ? await getNotificationRoleRule(supabase, tenantId, membershipRole, eventType, companyId)
      : null;

  const userRow = await getUserEventPreferenceRow(supabase, userId, eventType);

  return computeNotificationLayersFromState({
    eventDefaults: base,
    companyRule,
    roleRule,
    userRow: userRow as UserEventPreferencePartial | null,
  });
}

export async function resolveNotificationChannels(
  supabase: SupabaseClient,
  args: Parameters<typeof resolveNotificationChannelLayers>[1]
): Promise<ResolvedNotificationChannels> {
  const { effective } = await resolveNotificationChannelLayers(supabase, args);
  return effective;
}

export async function isChannelEnabledForUserResolved(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  companyId: string | null,
  eventType: string,
  channel: NotificationChannel,
  membershipRole: string | null
): Promise<boolean> {
  const r = await resolveNotificationChannels(supabase, {
    userId,
    tenantId,
    companyId,
    eventType,
    membershipRole,
  });
  if (channel === "in_app") return r.in_app;
  if (channel === "email") return r.email;
  if (channel === "sms") return r.sms;
  return r.push;
}
