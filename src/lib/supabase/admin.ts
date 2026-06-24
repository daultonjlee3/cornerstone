import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export class AdminClientConfigError extends Error {
  constructor() {
    super("Supabase admin client is not configured.");
    this.name = "AdminClientConfigError";
  }
}

export function isAdminClientConfigError(error: unknown): error is AdminClientConfigError {
  return error instanceof AdminClientConfigError;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new AdminClientConfigError();
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
