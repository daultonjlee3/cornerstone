"use server";

import { Buffer } from "node:buffer";
import { createClient } from "@/src/lib/supabase/server";
import { saveWorkOrder } from "@/app/(authenticated)/work-orders/actions";

export type PortalSubmissionState = {
  error?: string;
  success?: boolean;
  workOrderNumber?: string;
};

const VALID_PRIORITY = new Set(["low", "medium", "high", "urgent", "emergency"]);

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
  const tenantId = process.env.PORTAL_TENANT_ID?.trim();
  const companyId = process.env.PORTAL_COMPANY_ID?.trim();
  if (!tenantId || !companyId) {
    return { error: "Maintenance request portal is not configured." };
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

  if (!requesterName) return { error: "Requester name is required." };
  if (!requesterEmail || !requesterEmail.includes("@")) {
    return { error: "Valid requester email is required." };
  }
  if (!description) return { error: "Description is required." };

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, tenant_id")
    .eq("id", companyId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!company) return { error: "Maintenance request portal is not configured." };

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
    if (!asset) return { error: "Selected asset was not found." };
    const a = asset as { id: string; asset_name?: string | null; name?: string | null };
    validatedAssetId = a.id;
    assetName = a.asset_name ?? a.name ?? null;
  }
  if (assetName) locationParts.push(assetName);

  const location = locationParts.length > 0 ? locationParts.join(", ") : locationFallback;
  if (!location) return { error: "Please specify a location (property, room, or address)." };

  const detailBody = [
    description,
    location ? `Location: ${location}` : null,
    `Requester: ${requesterName} · ${requesterEmail}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const workOrderForm = new FormData();
  workOrderForm.set("company_id", companyId);
  workOrderForm.set("title", buildTitle(description, location));
  workOrderForm.set("description", detailBody);
  workOrderForm.set("priority", priority);
  workOrderForm.set("status", "new");
  workOrderForm.set("requested_by_name", requesterName);
  workOrderForm.set("requested_by_email", requesterEmail);
  if (validatedAssetId) workOrderForm.set("asset_id", validatedAssetId);

  const result = await saveWorkOrder(
    {},
    workOrderForm,
    { portalContext: { tenantId, companyId } }
  );
  if (result.error) return { error: result.error };

  const workOrderId = result.workOrderId ?? null;
  const workOrderNumber = result.workOrderNumber ?? undefined;

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
