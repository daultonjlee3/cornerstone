/**
 * Add a user as platform super admin by email.
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL in .env.local
 *
 * Run: npx tsx scripts/make-super-admin.ts your-email@example.com
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Usage: npx tsx scripts/make-super-admin.ts <email>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  const user = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user?.id) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const { error: insertError } = await supabase.from("platform_super_admins").upsert(
    { user_id: user.id },
    { onConflict: "user_id" }
  );

  if (insertError) {
    console.error("Failed to add super admin:", insertError.message);
    process.exit(1);
  }

  console.log(`Done. ${email} is now a platform super admin. Sign out and back in, then go to /platform.`);
}

main();
