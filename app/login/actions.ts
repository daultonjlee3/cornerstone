"use server";

import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  if (!email?.trim() || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      return { error: error.message };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "fetch failed" || message.includes("fetch")) {
      return {
        error:
          "Could not reach the authentication server. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
      };
    }
    if (message.includes("Missing Supabase env")) {
      return { error: "Server is missing Supabase configuration. Add env vars to .env.local." };
    }
    return { error: message };
  }

  const next = formData.get("next") as string | null;
  redirect(next && next.startsWith("/") ? next : "/dashboard");
}
