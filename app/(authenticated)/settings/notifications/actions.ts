"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext, companyBelongsToTenant } from "@/src/lib/auth-context";
import { requirePermission } from "@/src/lib/permissions";
import type { NotificationChannel } from "@/src/lib/notifications/types";

export type ChannelTriState = "inherit" | "on" | "off";

function triToBool(t: ChannelTriState): boolean | null {
  if (t === "inherit") return null;
  return t === "on";
}

function boolToTri(v: boolean | null | undefined): ChannelTriState {
  if (v === true) return "on";
  if (v === false) return "off";
  return "inherit";
}

export async function upsertCompanyNotificationRule(
  companyId: string,
  eventType: string,
  patch: {
    enabled: ChannelTriState;
    in_app: ChannelTriState;
    email: ChannelTriState;
    sms: ChannelTriState;
    push: ChannelTriState;
  }
): Promise<{ error?: string }> {
  try {
    await requirePermission("settings.manage");
    const supabase = await createClient();
    const ctx = await getAuthContext(supabase);
    if (!(await companyBelongsToTenant(companyId, ctx.tenantId, supabase))) {
      return { error: "Company not in tenant." };
    }
    const enabled = triToBool(patch.enabled);
    const in_app = triToBool(patch.in_app);
    const email = triToBool(patch.email);
    const sms = triToBool(patch.sms);
    const push = triToBool(patch.push);
    const allNull =
      enabled === null &&
      in_app === null &&
      email === null &&
      sms === null &&
      push === null;
    if (allNull) {
      await supabase
        .from("notification_company_rules")
        .delete()
        .eq("company_id", companyId)
        .eq("event_type", eventType);
    } else {
      const { error } = await supabase.from("notification_company_rules").upsert(
        {
          tenant_id: ctx.tenantId,
          company_id: companyId,
          event_type: eventType,
          enabled,
          in_app,
          email,
          sms,
          push,
        },
        { onConflict: "company_id,event_type" }
      );
      if (error) return { error: error.message };
    }
    revalidatePath("/settings/notifications");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save." };
  }
}

export async function upsertRoleNotificationRule(
  role: string,
  eventType: string,
  scopeCompanyId: string | null,
  patch: {
    enabled: ChannelTriState;
    in_app: ChannelTriState;
    email: ChannelTriState;
    sms: ChannelTriState;
    push: ChannelTriState;
  }
): Promise<{ error?: string }> {
  try {
    await requirePermission("settings.manage");
    const supabase = await createClient();
    const ctx = await getAuthContext(supabase);
    if (scopeCompanyId) {
      if (!(await companyBelongsToTenant(scopeCompanyId, ctx.tenantId, supabase))) {
        return { error: "Company not in tenant." };
      }
    }
    const enabled = triToBool(patch.enabled);
    const in_app = triToBool(patch.in_app);
    const email = triToBool(patch.email);
    const sms = triToBool(patch.sms);
    const push = triToBool(patch.push);
    const allNull =
      enabled === null &&
      in_app === null &&
      email === null &&
      sms === null &&
      push === null;

    let del = supabase
      .from("notification_rules")
      .delete()
      .eq("tenant_id", ctx.tenantId)
      .eq("role", role)
      .eq("event_type", eventType);
    del = scopeCompanyId
      ? del.eq("company_id", scopeCompanyId)
      : del.is("company_id", null);
    await del;

    if (!allNull) {
      const { error } = await supabase.from("notification_rules").insert({
        tenant_id: ctx.tenantId,
        role,
        event_type: eventType,
        company_id: scopeCompanyId,
        enabled,
        in_app,
        email,
        sms,
        push,
      });
      if (error) return { error: error.message };
    }
    revalidatePath("/settings/notifications");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save." };
  }
}

export async function setUserEventNotificationChannel(
  eventType: string,
  channel: NotificationChannel,
  tri: ChannelTriState
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const ctx = await getAuthContext(supabase);
    const uid = ctx.effectiveUserId;
    const value = triToBool(tri);

    const { data: existing } = await supabase
      .from("notification_user_event_preferences")
      .select("in_app, email, sms, push")
      .eq("user_id", uid)
      .eq("event_type", eventType)
      .maybeSingle();
    const row = existing as {
      in_app?: boolean | null;
      email?: boolean | null;
      sms?: boolean | null;
      push?: boolean | null;
    } | null;

    const next = {
      user_id: uid,
      event_type: eventType,
      in_app: row?.in_app ?? null,
      email: row?.email ?? null,
      sms: row?.sms ?? null,
      push: row?.push ?? null,
    };
    next[channel] = value;

    const empty =
      next.in_app == null &&
      next.email == null &&
      next.sms == null &&
      next.push == null;
    if (empty) {
      await supabase
        .from("notification_user_event_preferences")
        .delete()
        .eq("user_id", uid)
        .eq("event_type", eventType);
    } else {
      const { error } = await supabase.from("notification_user_event_preferences").upsert(next, {
        onConflict: "user_id,event_type",
      });
      if (error) return { error: error.message };
    }
    revalidatePath("/settings/notifications");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save." };
  }
}
