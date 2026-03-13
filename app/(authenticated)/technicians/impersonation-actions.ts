"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { insertActivityLog } from "@/src/lib/activity-logs";
import {
  IMPERSONATION_COOKIE,
  getImpersonationSession,
  isAdminRole,
} from "@/src/lib/portal/access";

export type ImpersonationState = {
  error?: string;
  success?: boolean;
};

const IMPERSONATION_MAX_AGE_SECONDS = 60 * 60 * 6; // 6 hours

export async function startTechnicianImpersonationAction(
  _prev: ImpersonationState,
  formData: FormData
): Promise<ImpersonationState> {
  const technicianId = ((formData.get("technician_id") as string | null) ?? "").trim();
  if (!technicianId) return { error: "Technician is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized." };

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.tenant_id || !isAdminRole(membership.role)) {
    return { error: "Only owner/admin users can impersonate technicians." };
  }

  const { data: technician } = await supabase
    .from("technicians")
    .select("id, user_id, company_id, technician_name, name, status")
    .eq("id", technicianId)
    .eq("tenant_id", membership.tenant_id)
    .limit(1)
    .maybeSingle();
  if (!technician) return { error: "Technician not found." };
  if ((technician as { status?: string | null }).status !== "active") {
    return { error: "Technician must be active for impersonation." };
  }
  const technicianUserId =
    (technician as { user_id?: string | null }).user_id ?? null;
  if (!technicianUserId) {
    return { error: "Technician is not linked to a portal login user." };
  }

  const store = await cookies();
  const nowIso = new Date().toISOString();
  const payload = {
    admin_user_id: user.id,
    technician_user_id: technicianUserId,
    technician_id: (technician as { id: string }).id,
    company_id: (technician as { company_id: string }).company_id,
    technician_name:
      (technician as { technician_name?: string | null; name?: string | null })
        .technician_name ??
      (technician as { technician_name?: string | null; name?: string | null }).name ??
      "Technician",
    started_at: nowIso,
  };

  store.set(IMPERSONATION_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: IMPERSONATION_MAX_AGE_SECONDS,
    path: "/",
  });

  await insertActivityLog(supabase, {
    tenantId: membership.tenant_id,
    companyId: payload.company_id,
    entityType: "technician",
    entityId: payload.technician_id,
    actionType: "impersonation_started",
    performedBy: user.id,
    metadata: {
      admin_id: user.id,
      technician_id: payload.technician_id,
      technician_user_id: payload.technician_user_id,
      timestamp: nowIso,
      company_id: payload.company_id,
    },
  });

  redirect("/portal");
}

export async function endTechnicianImpersonationAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const session = await getImpersonationSession();
  const store = await cookies();
  store.delete(IMPERSONATION_COOKIE);

  if (session && session.admin_user_id === user.id && membership?.tenant_id) {
    await insertActivityLog(supabase, {
      tenantId: membership.tenant_id,
      companyId: session.company_id,
      entityType: "technician",
      entityId: session.technician_id,
      actionType: "impersonation_ended",
      performedBy: user.id,
      metadata: {
        admin_id: user.id,
        technician_id: session.technician_id,
        technician_user_id: session.technician_user_id,
        timestamp: new Date().toISOString(),
        company_id: session.company_id,
      },
    });
  }

  redirect("/technicians");
}
