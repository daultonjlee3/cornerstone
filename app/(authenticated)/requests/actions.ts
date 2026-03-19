"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { insertActivityLog } from "@/src/lib/activity-logs";
import { dispatchNotificationEvent } from "@/src/lib/notifications/dispatch";
import { sendEmailAlert, getCompanyAlertRecipients } from "@/src/lib/notifications";
import { companyInScope, resolveProcurementScope } from "@/src/lib/procurement/scope";
import { saveWorkOrder } from "@/app/(authenticated)/work-orders/actions";
import { isDemoGuestUser } from "@/src/lib/auth-context";

export type WorkRequestActionState = {
  error?: string;
  success?: boolean;
  requestId?: string;
  workOrderId?: string;
};

export type WorkRequestStatus =
  | "submitted"
  | "approved"
  | "rejected"
  | "converted_to_work_order"
  | "scheduled"
  | "completed";

const VALID_PRIORITY = new Set(["low", "medium", "high", "urgent", "emergency"]);

async function imageFileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

function buildWorkOrderTitle(description: string, location: string): string {
  const preferred = description.trim().slice(0, 80);
  if (preferred) return preferred;
  return `Work request at ${location.trim().slice(0, 60)}`;
}

export async function submitWorkRequest(
  _prev: WorkRequestActionState,
  formData: FormData
): Promise<WorkRequestActionState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };
  if (await isDemoGuestUser(scope.supabase)) {
    return { success: true };
  }

  const requesterName = ((formData.get("requester_name") as string | null) ?? "").trim();
  const requesterEmail = ((formData.get("requester_email") as string | null) ?? "").trim();
  const location = ((formData.get("location") as string | null) ?? "").trim();
  const description = ((formData.get("description") as string | null) ?? "").trim();
  const assetId = ((formData.get("asset_id") as string | null) ?? "").trim() || null;
  const selectedCompanyId = ((formData.get("company_id") as string | null) ?? "").trim() || null;
  const rawPriority = ((formData.get("priority") as string | null) ?? "").trim().toLowerCase();
  const priority = VALID_PRIORITY.has(rawPriority) ? rawPriority : "medium";

  if (!requesterName) return { error: "Requester name is required." };
  if (!requesterEmail || !requesterEmail.includes("@")) {
    return { error: "Valid requester email is required." };
  }
  if (!location) return { error: "Location is required." };
  if (!description) return { error: "Description is required." };

  let resolvedCompanyId = selectedCompanyId;
  if (resolvedCompanyId && !companyInScope(resolvedCompanyId, scope.companyIds)) {
    return { error: "Selected company is out of scope." };
  }

  let validatedAssetId: string | null = null;
  if (assetId) {
    const { data: asset } = await scope.supabase
      .from("assets")
      .select("id, company_id")
      .eq("id", assetId)
      .maybeSingle();
    if (!asset) return { error: "Selected asset was not found." };
    const assetCompanyId = (asset as { company_id?: string | null }).company_id ?? null;
    if (!assetCompanyId || !companyInScope(assetCompanyId, scope.companyIds)) {
      return { error: "Selected asset is out of scope." };
    }
    resolvedCompanyId = assetCompanyId;
    validatedAssetId = (asset as { id: string }).id;
  }

  if (!resolvedCompanyId) {
    resolvedCompanyId = scope.companyIds[0] ?? null;
  }
  if (!resolvedCompanyId) {
    return { error: "No company found to attach this request." };
  }

  const photoFile = formData.get("photo");
  let photoDataUrl: string | null = null;
  if (photoFile instanceof File && photoFile.size > 0) {
    if (!photoFile.type.startsWith("image/")) {
      return { error: "Only image uploads are supported." };
    }
    if (photoFile.size > 6_000_000) {
      return { error: "Image is too large. Please upload an image under 6MB." };
    }
    photoDataUrl = await imageFileToDataUrl(photoFile);
  }

  const payload = {
    tenant_id: scope.tenantId,
    company_id: resolvedCompanyId,
    requester_name: requesterName,
    requester_email: requesterEmail.toLowerCase(),
    location,
    asset_id: validatedAssetId,
    description,
    priority,
    photo_url: photoDataUrl,
    status: "submitted" as WorkRequestStatus,
  };

  const { data: inserted, error } = await scope.supabase
    .from("work_requests")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { error: error.message };

  const requestId = (inserted as { id?: string } | null)?.id;
  if (!requestId) return { error: "Failed to create work request." };

  await insertActivityLog(scope.supabase, {
    tenantId: scope.tenantId,
    companyId: resolvedCompanyId,
    entityType: "work_request",
    entityId: requestId,
    actionType: "request.created",
    performedBy: scope.userId,
    metadata: {
      requester_name: requesterName,
      requester_email: requesterEmail.toLowerCase(),
      asset_id: validatedAssetId,
      priority,
      status: "submitted",
    },
  });

  try {
    const msg = `New maintenance request submitted: ${requesterName} (${location}).`;
    await dispatchNotificationEvent(scope.supabase, {
      tenantId: scope.tenantId,
      companyId: resolvedCompanyId,
      eventType: "work_request.submitted",
      entityType: "work_request",
      entityId: requestId,
      title: msg,
      message: msg,
      includeAllTenantMembers: true,
    });

    const recipients = await getCompanyAlertRecipients(scope.supabase, [resolvedCompanyId]);
    await sendEmailAlert({
      subject: "Maintenance request created",
      message: `${requesterName} submitted a maintenance request at ${location}: ${description}`,
      recipients,
    });
  } catch {
    // Notification delivery is best-effort and must not block request submission.
  }

  revalidatePath("/requests/submit");
  revalidatePath("/requests");
  return { success: true, requestId };
}

async function getScopedRequestOrError(
  requestId: string
): Promise<
  | { error: string }
  | {
      scope: Awaited<ReturnType<typeof resolveProcurementScope>>;
      row: Record<string, unknown>;
    }
> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: row } = await scope.supabase
    .from("work_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!row) return { error: "Work request not found." };

  const tenantId = (row as { tenant_id?: string | null }).tenant_id ?? null;
  if (tenantId !== scope.tenantId) return { error: "Unauthorized." };

  const companyId = (row as { company_id?: string | null }).company_id ?? null;
  if (companyId && !companyInScope(companyId, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  return { scope, row: row as Record<string, unknown> };
}

export async function approveWorkRequest(requestId: string): Promise<WorkRequestActionState> {
  const scoped = await getScopedRequestOrError(requestId);
  if ("error" in scoped) return { error: scoped.error };
  if (await isDemoGuestUser(scoped.scope.supabase)) return { success: true, requestId };

  const currentStatus = String(scoped.row.status ?? "");
  if (currentStatus === "rejected") {
    return { error: "Rejected requests cannot be approved." };
  }
  if (currentStatus === "completed") {
    return { error: "Completed requests cannot be approved." };
  }

  const { error } = await scoped.scope.supabase
    .from("work_requests")
    .update({ status: "approved" as WorkRequestStatus })
    .eq("id", requestId);
  if (error) return { error: error.message };

  await insertActivityLog(scoped.scope.supabase, {
    tenantId: scoped.scope.tenantId,
    companyId: (scoped.row.company_id as string | null | undefined) ?? undefined,
    entityType: "work_request",
    entityId: requestId,
    actionType: "request.approved",
    performedBy: scoped.scope.userId,
    beforeState: { status: currentStatus },
    afterState: { status: "approved" },
  });

  revalidatePath("/requests");
  return { success: true, requestId };
}

export async function rejectWorkRequest(requestId: string): Promise<WorkRequestActionState> {
  const scoped = await getScopedRequestOrError(requestId);
  if ("error" in scoped) return { error: scoped.error };
  if (await isDemoGuestUser(scoped.scope.supabase)) return { success: true, requestId };

  const currentStatus = String(scoped.row.status ?? "");
  if (currentStatus === "completed") {
    return { error: "Completed requests cannot be rejected." };
  }

  const { error } = await scoped.scope.supabase
    .from("work_requests")
    .update({ status: "rejected" as WorkRequestStatus })
    .eq("id", requestId);
  if (error) return { error: error.message };

  await insertActivityLog(scoped.scope.supabase, {
    tenantId: scoped.scope.tenantId,
    companyId: (scoped.row.company_id as string | null | undefined) ?? undefined,
    entityType: "work_request",
    entityId: requestId,
    actionType: "request.rejected",
    performedBy: scoped.scope.userId,
    beforeState: { status: currentStatus },
    afterState: { status: "rejected" },
  });

  revalidatePath("/requests");
  return { success: true, requestId };
}

export async function convertWorkRequestToWorkOrder(
  requestId: string
): Promise<WorkRequestActionState> {
  const scoped = await getScopedRequestOrError(requestId);
  if ("error" in scoped) return { error: scoped.error };
  if (await isDemoGuestUser(scoped.scope.supabase)) {
    return { success: true, requestId };
  }

  const request = scoped.row;
  const currentStatus = String(request.status ?? "");
  if (currentStatus === "rejected") {
    return { error: "Rejected requests cannot be converted." };
  }
  if (currentStatus === "completed") {
    return { error: "Completed requests cannot be converted." };
  }

  const companyId =
    ((request.company_id as string | null | undefined) ?? scoped.scope.companyIds[0]) ?? null;
  if (!companyId || !companyInScope(companyId, scoped.scope.companyIds)) {
    return { error: "No scoped company available for conversion." };
  }

  const { data: existingWorkOrder } = await scoped.scope.supabase
    .from("work_orders")
    .select("id, status, work_order_number")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let workOrderId: string | null = null;
  if (existingWorkOrder) {
    workOrderId = (existingWorkOrder as { id: string }).id;
  } else {
    const requestDescription = String(request.description ?? "").trim();
    const requestLocation = String(request.location ?? "").trim();
    const requesterName = String(request.requester_name ?? "").trim();
    const requesterEmail = String(request.requester_email ?? "").trim();
    const detailBody = [
      requestDescription,
      requestLocation ? `Requested location: ${requestLocation}` : null,
      requesterName || requesterEmail
        ? `Requester: ${[requesterName, requesterEmail].filter(Boolean).join(" · ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const workOrderForm = new FormData();
    workOrderForm.set("company_id", companyId);
    workOrderForm.set(
      "title",
      buildWorkOrderTitle(requestDescription, requestLocation || "unspecified location")
    );
    workOrderForm.set("description", detailBody);
    workOrderForm.set(
      "priority",
      VALID_PRIORITY.has(String(request.priority ?? "").toLowerCase())
        ? String(request.priority ?? "").toLowerCase()
        : "medium"
    );
    workOrderForm.set("status", "new");
    if (request.asset_id) {
      workOrderForm.set("asset_id", String(request.asset_id));
    }
    if (requestLocation) {
      workOrderForm.set("location", requestLocation);
    }
    if (requesterName) {
      workOrderForm.set("requested_by_name", requesterName);
    }
    if (requesterEmail) {
      workOrderForm.set("requested_by_email", requesterEmail);
    }
    workOrderForm.set("request_id", requestId);

    const result = await saveWorkOrder({}, workOrderForm);
    if (result.error) return { error: result.error };

    const { data: createdWorkOrder } = await scoped.scope.supabase
      .from("work_orders")
      .select("id")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    workOrderId = (createdWorkOrder as { id?: string } | null)?.id ?? null;
  }

  if (!workOrderId) {
    return { error: "Work order conversion succeeded but could not find linked work order." };
  }

  const { error: updateError } = await scoped.scope.supabase
    .from("work_requests")
    .update({ status: "converted_to_work_order" as WorkRequestStatus })
    .eq("id", requestId);
  if (updateError) return { error: updateError.message };

  await insertActivityLog(scoped.scope.supabase, {
    tenantId: scoped.scope.tenantId,
    companyId,
    entityType: "work_request",
    entityId: requestId,
    actionType: "request.converted_to_work_order",
    performedBy: scoped.scope.userId,
    beforeState: { status: currentStatus },
    afterState: { status: "converted_to_work_order" },
    metadata: { work_order_id: workOrderId },
  });

  revalidatePath("/requests");
  revalidatePath("/requests/submit");
  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath("/dispatch");
  return { success: true, requestId, workOrderId };
}
