"use server";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { insertActivityLog } from "@/src/lib/activity-logs";
import { revalidatePath } from "next/cache";
import { getTenantIdForUser, companyBelongsToTenant } from "@/src/lib/auth-context";

export type TechnicianFormState = { error?: string; success?: boolean };

type ActorContext = {
  userId: string;
  tenantId: string;
};

async function getActorContext(): Promise<ActorContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return null;
  return {
    userId: user.id,
    tenantId,
  };
}

const FULL_APP_ROLES = ["owner", "admin", "member", "viewer"] as const;

function isFullAppRole(role: string | null | undefined): boolean {
  return FULL_APP_ROLES.includes(role as (typeof FULL_APP_ROLES)[number]);
}

/** Returns true if this user already has a full-app role in this tenant (do not downgrade to portal-only). */
async function existingUserHasFullAppRoleInTenant(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  tenantId: string
): Promise<boolean> {
  const { data: row } = await admin
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  const role = (row as { role?: string } | null)?.role;
  return isFullAppRole(role);
}

async function resolveOrCreatePortalUser({
  email,
  technicianName,
  tenantId,
  companyId,
}: {
  email: string;
  technicianName: string;
  tenantId: string;
  companyId: string;
}): Promise<{ userId: string; inviteSent: boolean }> {
  const admin = createAdminClient();
  let userId: string | null = null;
  let inviteSent = false;
  let isExistingUser = false;

  const inviteResult = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: technicianName,
      role: "technician",
      is_portal_only: true,
    },
  });
  if (!inviteResult.error) {
    userId = inviteResult.data.user?.id ?? null;
    inviteSent = true;
  }

  if (!userId) {
    const usersResult = await admin.auth.admin.listUsers({ page: 1, perPage: 5000 });
    if (usersResult.error) throw new Error(usersResult.error.message);
    const existing = usersResult.data.users.find(
      (candidate) => (candidate.email ?? "").toLowerCase() === email.toLowerCase()
    );
    if (existing?.id) {
      userId = existing.id;
      isExistingUser = true;
    }
  }

  if (!userId) {
    const createResult = await admin.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: false,
      user_metadata: {
        full_name: technicianName,
        role: "technician",
        is_portal_only: true,
      },
    });
    if (createResult.error) throw new Error(createResult.error.message);
    userId = createResult.data.user?.id ?? null;
  }

  if (!userId) {
    throw new Error("Failed to create or resolve technician login user.");
  }

  const preserveFullAppAccess =
    isExistingUser &&
    (await existingUserHasFullAppRoleInTenant(admin, userId, tenantId));

  const supabase = await createClient();
  if (preserveFullAppAccess) {
    // Link technician to existing full-app user: do NOT set is_portal_only or overwrite tenant role.
    await supabase.from("users").upsert(
      { id: userId, full_name: technicianName },
      { onConflict: "id" }
    );
    // Do not upsert tenant_memberships — keep their existing owner/admin/member/viewer role.
    await supabase.from("company_memberships").upsert(
      {
        company_id: companyId,
        user_id: userId,
        role: "technician",
      },
      { onConflict: "company_id,user_id" }
    );
    return { userId, inviteSent: false };
  }

  await supabase.from("users").upsert(
    {
      id: userId,
      full_name: technicianName,
      is_portal_only: true,
    },
    { onConflict: "id" }
  );
  await supabase.from("tenant_memberships").upsert(
    {
      tenant_id: tenantId,
      user_id: userId,
      role: "technician",
    },
    { onConflict: "tenant_id,user_id" }
  );
  await supabase.from("company_memberships").upsert(
    {
      company_id: companyId,
      user_id: userId,
      role: "technician",
    },
    { onConflict: "company_id,user_id" }
  );

  return { userId, inviteSent };
}

export async function saveTechnician(
  _prev: TechnicianFormState,
  formData: FormData
): Promise<TechnicianFormState> {
  const actor = await getActorContext();
  if (!actor) return { error: "Unauthorized." };

  const id = (formData.get("id") as string)?.trim() || null;
  const companyId = (formData.get("company_id") as string)?.trim();
  const technicianName = (formData.get("technician_name") as string)?.trim();
  const createLogin = formData.get("create_login") !== null;
  const portalLoginTogglePresent = formData.get("portal_login_enabled_present") !== null;
  const portalLoginEnabled = formData.get("portal_login_enabled") !== null;

  if (!technicianName) return { error: "Technician name is required." };
  if (!companyId) return { error: "Company is required." };

  const allowed = await companyBelongsToTenant(companyId, actor.tenantId);
  if (!allowed) return { error: "Invalid company." };

  const status = (formData.get("status") as string)?.trim();
  const validStatus = status === "inactive" ? "inactive" : "active";
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
  if (createLogin && !email) {
    return { error: "Email is required to create a technician login." };
  }

  const payload: Record<string, unknown> = {
    name: technicianName,
    technician_name: technicianName,
    tenant_id: actor.tenantId,
    company_id: companyId,
    email,
    phone: (formData.get("phone") as string)?.trim() || null,
    trade: (formData.get("trade") as string)?.trim() || null,
    status: validStatus,
    hourly_cost: (formData.get("hourly_cost") as string)?.trim()
      ? parseFloat((formData.get("hourly_cost") as string).trim())
      : null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };

  const supabase = await createClient();
  const supabaseClient = supabase as unknown as SupabaseClient;
  if (id) {
    const { data: row } = await supabase
      .from("technicians")
      .select("id, company_id, user_id, status")
      .eq("id", id)
      .maybeSingle();
    if (!row) return { error: "Technician not found." };
    const allowedUpdate = await companyBelongsToTenant(row.company_id, actor.tenantId);
    if (!allowedUpdate) return { error: "Unauthorized." };

    const existingUserId = (row as { user_id?: string | null }).user_id ?? null;
    let linkedUserId = existingUserId;
    let inviteSent = false;
    if (createLogin && !existingUserId) {
      try {
        const created = await resolveOrCreatePortalUser({
          email: email ?? "",
          technicianName,
          tenantId: actor.tenantId,
          companyId,
        });
        linkedUserId = created.userId;
        inviteSent = created.inviteSent;
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Failed to create technician login.",
        };
      }
    }
    if (linkedUserId) {
      await supabase.from("tenant_memberships").upsert(
        {
          tenant_id: actor.tenantId,
          user_id: linkedUserId,
          role: "technician",
        },
        { onConflict: "tenant_id,user_id" }
      );
      await supabase.from("company_memberships").upsert(
        {
          company_id: companyId,
          user_id: linkedUserId,
          role: "technician",
        },
        { onConflict: "company_id,user_id" }
      );
      payload.user_id = linkedUserId;
    }

    const { error } = await supabase.from("technicians").update(payload).eq("id", id);
    if (error) return { error: error.message };

    if (linkedUserId && !existingUserId) {
      await insertActivityLog(supabaseClient, {
        tenantId: actor.tenantId,
        companyId,
        entityType: "technician",
        entityId: id,
        actionType: "technician_linked_to_user",
        performedBy: actor.userId,
        metadata: {
          user_id: linkedUserId,
          invite_sent: inviteSent,
          source: "saveTechnician",
        },
      });
      await insertActivityLog(supabaseClient, {
        tenantId: actor.tenantId,
        companyId,
        entityType: "technician",
        entityId: id,
        actionType: "technician_login_created",
        performedBy: actor.userId,
        metadata: {
          user_id: linkedUserId,
          email,
          invite_sent: inviteSent,
        },
      });
    }

    if (linkedUserId && portalLoginTogglePresent) {
      const { data: userRow } = await supabase
        .from("users")
        .select("is_portal_only")
        .eq("id", linkedUserId)
        .limit(1)
        .maybeSingle();
      const previousPortalOnly = Boolean(
        (userRow as { is_portal_only?: boolean | null } | null)?.is_portal_only
      );
      if (!portalLoginEnabled) {
        await supabase
          .from("technicians")
          .update({ user_id: null })
          .eq("id", id)
          .eq("user_id", linkedUserId);
        await supabase
          .from("company_memberships")
          .delete()
          .eq("company_id", companyId)
          .eq("user_id", linkedUserId)
          .eq("role", "technician");
        await supabase
          .from("tenant_memberships")
          .delete()
          .eq("tenant_id", actor.tenantId)
          .eq("user_id", linkedUserId)
          .eq("role", "technician");
      }
      const admin = createAdminClient();
      const hasFullAppRole = await existingUserHasFullAppRoleInTenant(
        admin,
        linkedUserId,
        actor.tenantId
      );
      const effectiveNext = portalLoginEnabled && !hasFullAppRole;
      if (previousPortalOnly !== effectiveNext) {
        await supabase
          .from("users")
          .update({ is_portal_only: effectiveNext })
          .eq("id", linkedUserId);
        await insertActivityLog(supabaseClient, {
          tenantId: actor.tenantId,
          companyId,
          entityType: "technician",
          entityId: id,
          actionType: effectiveNext
            ? "technician_login_enabled"
            : "technician_login_disabled",
          performedBy: actor.userId,
          metadata: {
            user_id: linkedUserId,
            previous: previousPortalOnly,
            next: effectiveNext,
          },
        });
      }
    }
  } else {
    let linkedUserId: string | null = null;
    let inviteSent = false;
    if (createLogin) {
      try {
        const created = await resolveOrCreatePortalUser({
          email: email ?? "",
          technicianName,
          tenantId: actor.tenantId,
          companyId,
        });
        linkedUserId = created.userId;
        inviteSent = created.inviteSent;
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Failed to create technician login.",
        };
      }
      payload.user_id = linkedUserId;
    }

    const insertResult = await supabase
      .from("technicians")
      .insert(payload)
      .select("id")
      .single();
    const { data, error } = insertResult;
    if (error) return { error: error.message };
    const technicianId = (data as { id: string }).id;

    await insertActivityLog(supabaseClient, {
      tenantId: actor.tenantId,
      companyId,
      entityType: "technician",
      entityId: technicianId,
      actionType: "technician_created",
      performedBy: actor.userId,
      metadata: { email, status: validStatus },
    });

    if (linkedUserId) {
      await insertActivityLog(supabaseClient, {
        tenantId: actor.tenantId,
        companyId,
        entityType: "technician",
        entityId: technicianId,
        actionType: "technician_linked_to_user",
        performedBy: actor.userId,
        metadata: { user_id: linkedUserId, invite_sent: inviteSent },
      });
      await insertActivityLog(supabaseClient, {
        tenantId: actor.tenantId,
        companyId,
        entityType: "technician",
        entityId: technicianId,
        actionType: "technician_login_created",
        performedBy: actor.userId,
        metadata: {
          user_id: linkedUserId,
          email,
          invite_sent: inviteSent,
        },
      });
    }
  }
  revalidatePath("/technicians");
  revalidatePath("/technicians/work-queue");
  revalidatePath("/portal/profile");
  revalidatePath("/portal/work-orders");
  return { success: true };
}

/**
 * Check if an email belongs to an existing user who already has full app access in this tenant.
 * Used to show a warning when creating/linking a technician login so the admin knows they will keep main app access.
 */
export async function checkEmailForTechnicianLink(
  email: string | null
): Promise<{ existingFullAppUser: boolean; message?: string }> {
  const actor = await getActorContext();
  if (!actor || !email?.trim()) return { existingFullAppUser: false };

  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const usersResult = await admin.auth.admin.listUsers({ page: 1, perPage: 5000 });
  if (usersResult.error) return { existingFullAppUser: false };
  const authUser = usersResult.data?.users?.find(
    (u) => (u.email ?? "").toLowerCase() === normalized
  );
  if (!authUser?.id) return { existingFullAppUser: false };

  const hasFullApp = await existingUserHasFullAppRoleInTenant(
    admin,
    authUser.id,
    actor.tenantId
  );
  if (hasFullApp) {
    return {
      existingFullAppUser: true,
      message:
        "This email is already a user in your organization. They will be linked as a technician and will keep their current main app access.",
    };
  }
  return { existingFullAppUser: false };
}

export async function deleteTechnician(id: string): Promise<TechnicianFormState> {
  const actor = await getActorContext();
  if (!actor) return { error: "Unauthorized." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("technicians")
    .select("company_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Technician not found." };
  const allowed = await companyBelongsToTenant(row.company_id, actor.tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase.from("technicians").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/technicians");
  return { success: true };
}
