"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import type { ProductProfile } from "@/src/types/fleet";

export type ProductProfileFormState = { error?: string; success?: boolean };

export async function updateTenantProductProfile(
  tenantId: string,
  productProfile: ProductProfile
): Promise<ProductProfileFormState> {
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);

  if (!auth.isPlatformSuperAdmin) {
    return { error: "Forbidden" };
  }

  if (!["cmms", "fleet_intelligence", "hybrid"].includes(productProfile)) {
    return { error: "Invalid product profile." };
  }

  const { error } = await supabase
    .from("tenants")
    .update({ product_profile: productProfile })
    .eq("id", tenantId);

  if (error) return { error: error.message };

  revalidatePath(`/platform/tenants/${tenantId}`);
  revalidatePath("/platform/tenants");
  return { success: true };
}
