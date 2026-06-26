import { PEACHTREE_TENANT } from "./constants";

const ALLOWED_SLUGS = new Set([PEACHTREE_TENANT.slug]);

export function assertDemoSeedAllowed(): void {
  if (process.env.DEMO_SEED_ENABLED !== "true") {
    console.error(
      "Refusing to run: set DEMO_SEED_ENABLED=true in .env.local to seed demo tenants."
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const force = process.env.FORCE_DEMO_SEED === "true";
  const looksProduction =
    /supabase\.co/i.test(url) &&
    !/localhost|127\.0\.0\.1/i.test(url) &&
    !process.env.SUPABASE_DEMO_PROJECT?.trim();

  if (looksProduction && !force) {
    console.error(
      "Refusing to run against a remote Supabase project without FORCE_DEMO_SEED=true."
    );
    process.exit(1);
  }
}

export function assertTenantSlugAllowed(slug: string): void {
  if (!ALLOWED_SLUGS.has(slug)) {
    console.error(`Refusing to reset/seed tenant slug "${slug}". Allowed: ${[...ALLOWED_SLUGS].join(", ")}`);
    process.exit(1);
  }
}
