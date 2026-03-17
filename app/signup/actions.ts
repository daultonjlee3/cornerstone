"use server";

import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";

export type SignupState = { error?: string };

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  const fullName = (formData.get("full_name") as string | null)?.trim() || undefined;
  if (!email?.trim() || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      return { error: error.message };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "fetch failed" || message.includes("fetch")) {
      return {
        error:
          "Could not reach the authentication server. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, and that the Supabase project is running.",
      };
    }
    if (message.includes("Missing Supabase env")) {
      return { error: "Server is missing Supabase configuration. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local." };
    }
    return { error: message };
  }

  redirect("/operations");
}
