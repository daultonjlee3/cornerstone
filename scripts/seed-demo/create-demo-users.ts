/**
 * Create one Supabase Auth user per demo account and link each to its tenant.
 * All demo users share the same password (DEMO_PASSWORD in .env.local).
 *
 * Prerequisites:
 * - Run the demo seed first so tenants exist: npm run seed:demo
 * - .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_PASSWORD
 *
 * Run from project root: npm run seed:demo:users
 * Or: npx tsx scripts/seed-demo/create-demo-users.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { createAdminClient } from "../../src/lib/supabase/admin";
import { DEMO_LOGIN_CONFIG } from "../../lib/marketing-site";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const password = process.env.DEMO_PASSWORD?.trim();

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use .env.local.");
    process.exit(1);
  }
  if (!password) {
    console.error("Missing DEMO_PASSWORD in .env.local. Add DEMO_PASSWORD=your-secure-demo-password");
    process.exit(1);
  }

  const supabase = createAdminClient();
  const entries = Object.entries(DEMO_LOGIN_CONFIG);

  console.log(`Creating ${entries.length} demo login user(s) (one per industry)...\n`);

  for (const [slug, { tenantSlug, demoEmail, label }] of entries) {
    process.stdout.write(`  ${label} (${demoEmail}) ... `);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (!tenant?.id) {
      console.log("SKIP — tenant not found. Run npm run seed:demo first.");
      continue;
    }

    const tenantId = tenant.id as string;
    let userId: string;

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message?.includes("already been registered") || createError.message?.toLowerCase().includes("already exists")) {
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = list?.users?.find((u) => u.email === demoEmail);
        if (!existing?.id) {
          console.log(`SKIP — user exists but could not look up id: ${createError.message}`);
          continue;
        }
        userId = existing.id;
      } else {
        console.log(`FAIL — ${createError.message}`);
        continue;
      }
    } else if (newUser?.user?.id) {
      userId = newUser.user.id;
    } else {
      console.log("FAIL — no user id returned.");
      continue;
    }

    const { error: memError } = await supabase.from("tenant_memberships").upsert(
      { tenant_id: tenantId, user_id: userId, role: "admin" },
      { onConflict: "tenant_id,user_id", ignoreDuplicates: false }
    );

    if (memError) {
      console.log(`FAIL — membership: ${memError.message}`);
      continue;
    }

    console.log("OK");
  }

  console.log("\nDone. Set the same DEMO_PASSWORD in your app so the login page can pre-fill it for demo visitors.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
