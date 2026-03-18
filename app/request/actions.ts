"use server";

import { Buffer } from "node:buffer";
import { createClient } from "@/src/lib/supabase/server";
import { saveWorkOrder } from "@/app/(authenticated)/work-orders/actions";
import { t, type RequestPortalLocaleCode } from "@/src/lib/i18n/request-portal";

export type PortalSubmissionState = {
  error?: string;
  success?: boolean;
  workOrderNumber?: string;
};

export type PortalPastRequestSummary = {
  id: string;
  requester_name: string | null;
  requester_email: string;
  description: string;
  status: string;
  created_at: string;
};

const VALID_PRIORITY = new Set(["low", "medium", "high", "urgent", "emergency"]);

const SUPPORTED: RequestPortalLocaleCode[] = ["en", "es", "fr"];

function getLocale(formData: FormData): RequestPortalLocaleCode {
  const raw = ((formData.get("locale") as string | null) ?? "").trim().toLowerCase();
  return SUPPORTED.includes(raw as RequestPortalLocaleCode) ? (raw as RequestPortalLocaleCode) : "en";
}

async function imageFileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mime = file.type || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

function buildTitle(description: string, location: string): string {
  const trimmed = description.trim().slice(0, 80);
  if (trimmed) return trimmed;
  return `Maintenance request at ${location.trim().slice(0, 60)}`;
}

export async function submitMaintenanceRequestPortal(
  _prev: PortalSubmissionState,
  formData: FormData
): Promise<PortalSubmissionState> {
  const locale = getLocale(formData);
  const tenantId = ((formData.get("tenant_id") as string | null) ?? "").trim();
  const companyId = ((formData.get("company_id") as string | null) ?? "").trim();
  if (!tenantId || !companyId) {
    return { error: t(locale, "validation.portalNotConfigured") };
  }

  const requesterName = ((formData.get("requester_name") as string | null) ?? "").trim();
  const requesterEmail = ((formData.get("requester_email") as string | null) ?? "").trim();
  const locationFallback = ((formData.get("location") as string | null) ?? "").trim();
  const propertyId = ((formData.get("property_id") as string | null) ?? "").trim() || null;
  const roomOrUnit = ((formData.get("room_or_unit") as string | null) ?? "").trim() || null;
  const description = ((formData.get("description") as string | null) ?? "").trim();
  const assetId = ((formData.get("asset_id") as string | null) ?? "").trim() || null;
  const rawPriority = ((formData.get("priority") as string | null) ?? "").trim().toLowerCase();
  const priority = VALID_PRIORITY.has(rawPriority) ? rawPriority : "medium";

  if (!requesterName) return { error: t(locale, "validation.requesterNameRequired") };
  if (!requesterEmail || !requesterEmail.includes("@")) {
    return { error: t(locale, "validation.emailRequired") };
  }
  if (!description) return { error: t(locale, "validation.descriptionRequired") };

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, tenant_id, auto_create_work_orders_from_requests")
    .eq("id", companyId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!company) return { error: t(locale, "validation.portalNotConfigured") };

  const locationParts: string[] = [];
  if (propertyId) {
    const { data: prop } = await supabase
      .from("properties")
      .select("name")
      .eq("id", propertyId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (prop) locationParts.push((prop as { name: string }).name);
  }
  if (roomOrUnit) locationParts.push(roomOrUnit);

  let validatedAssetId: string | null = null;
  let assetName: string | null = null;
  if (assetId) {
    const { data: asset } = await supabase
      .from("assets")
      .select("id, company_id, asset_name, name")
      .eq("id", assetId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!asset) return { error: t(locale, "validation.assetNotFound") };
    const a = asset as { id: string; asset_name?: string | null; name?: string | null };
    validatedAssetId = a.id;
    assetName = a.asset_name ?? a.name ?? null;
  }
  if (assetName) locationParts.push(assetName);

  const location = locationParts.length > 0 ? locationParts.join(", ") : locationFallback;
  if (!location) return { error: t(locale, "validation.locationRequired") };

  const detailBody = [
    description,
    location ? `Location: ${location}` : null,
    `Requester: ${requesterName} · ${requesterEmail}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Always create a work request record from the portal submission.
  const workRequestPayload = {
    tenant_id: company.tenant_id as string,
    company_id: companyId,
    requester_name: requesterName,
    requester_email: requesterEmail.toLowerCase(),
    location,
    asset_id: validatedAssetId,
    description,
    priority,
    status: "submitted" as "submitted",
  };

  const { data: insertedRequest, error: requestError } = await supabase
    .from("work_requests")
    .insert(workRequestPayload)
    .select("id")
    .single();

  if (requestError) {
    return { error: requestError.message };
  }

  const workRequestId = (insertedRequest as { id?: string } | null)?.id ?? null;

  const autoCreate =
    (company as { auto_create_work_orders_from_requests?: boolean | null })
      .auto_create_work_orders_from_requests ?? true;

  if (!autoCreate || !workRequestId) {
    // Request-only mode: do not create a work order, but still show a success state.
    return { success: true, workOrderNumber: undefined };
  }

  const workOrderForm = new FormData();
  workOrderForm.set("company_id", companyId);
  workOrderForm.set("title", buildTitle(description, location));
  workOrderForm.set("description", detailBody);
  workOrderForm.set("priority", priority);
  workOrderForm.set("status", "new");
  workOrderForm.set("requested_by_name", requesterName);
  workOrderForm.set("requested_by_email", requesterEmail);
  workOrderForm.set("request_id", workRequestId);
  if (validatedAssetId) workOrderForm.set("asset_id", validatedAssetId);

  const result = await saveWorkOrder(
    {},
    workOrderForm,
    { portalContext: { tenantId, companyId } }
  );
  if (result.error) {
    const raw = String(result.error);
    if (
      raw.includes("uq_work_orders_work_order_number") ||
      raw.toLowerCase().includes("duplicate key value violates unique constraint")
    ) {
      return { error: t(locale, "validation.portalDuplicateWorkOrderNumber") };
    }
    return { error: raw };
  }

  const workOrderId = result.workOrderId ?? null;
  const workOrderNumber = result.workOrderNumber ?? undefined;

  if (workOrderId) {
    // Keep work request status in sync when auto-created.
    await supabase
      .from("work_requests")
      .update({ status: "converted_to_work_order" })
      .eq("id", workRequestId);
  }

  const photoFile = formData.get("photo");
  if (
    workOrderId &&
    photoFile instanceof File &&
    photoFile.size > 0 &&
    photoFile.type.startsWith("image/")
  ) {
    if (photoFile.size <= 6_000_000) {
      try {
        const dataUrl = await imageFileToDataUrl(photoFile);
        const name = (photoFile.name || "photo").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
        await supabase.from("work_order_attachments").insert({
          work_order_id: workOrderId,
          file_name: name || "photo",
          file_url: dataUrl,
          file_type: photoFile.type,
          uploaded_by_user_id: null,
          uploaded_by: null,
          uploaded_at: new Date().toISOString(),
        });
      } catch {
        // Best-effort: work order already created
      }
    }
  }

  return { success: true, workOrderNumber };
}

export async function fetchPortalPastRequests(
  tenantId: string,
  companyId: string,
  email: string
): Promise<{ requests: PortalPastRequestSummary[] }> {
  const trimmedEmail = email.trim().toLowerCase();
  if (!tenantId || !companyId || !trimmedEmail || !trimmedEmail.includes("@")) {
    return { requests: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_requests")
    .select("id, requester_name, requester_email, description, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("requester_email", trimmedEmail)
    .order("created_at", { ascending: false })
    .limit(15);

  if (error || !data) {
    return { requests: [] };
  }

  const rows = data as {
    id: string;
    requester_name?: string | null;
    requester_email?: string | null;
    description?: string | null;
    status?: string | null;
    created_at?: string | null;
  }[];

  const requests: PortalPastRequestSummary[] = rows.map((row) => ({
    id: row.id,
    requester_name: row.requester_name ?? null,
    requester_email: (row.requester_email ?? "").toLowerCase(),
    description: row.description ?? "",
    status: row.status ?? "submitted",
    created_at: row.created_at ?? new Date().toISOString(),
  }));

  return { requests };
}
