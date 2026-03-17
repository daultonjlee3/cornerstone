"use server";

import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

function isLocalSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  if (!email?.trim() || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      if (error.message === "Invalid login credentials") {
        const runtimeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
        const envHint = isLocalSupabaseUrl(runtimeUrl)
          ? ""
          : ` Frontend auth is currently using ${
              runtimeUrl || "an unset Supabase URL"
            }. Verify NEXT_PUBLIC_SUPABASE_URL points to local Supabase and restart the Next.js dev server after env changes.`;
        return { error: `Invalid email or password.${envHint}` };
      }
      return { error: error.message };
    }
    if (!data.session) {
      return { error: "Login succeeded but no session was created. Please try again." };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "fetch failed" || message.includes("fetch")) {
      return {
        error:
          "Could not reach the authentication server. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the Next.js dev server.",
      };
    }
    if (message.includes("Missing Supabase env")) {
      return {
        error:
          "Server is missing Supabase configuration. Add env vars to .env.local and restart the Next.js dev server.",
      };
    }
    return { error: message };
  }

  const next = formData.get("next") as string | null;
  redirect(next && next.startsWith("/") ? next : "/operations");
}
