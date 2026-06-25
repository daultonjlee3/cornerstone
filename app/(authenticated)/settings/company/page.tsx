import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthContext, getProductProfileForTenant } from "@/src/lib/auth-context";
import { loadCompanyOperatingRules } from "@/src/lib/operational-profitability/queries";
import { OperatingRulesForm } from "./operating-rules-form";
import { saveCompanyOperatingRules } from "./actions";

export default async function SettingsCompanyPage() {
  const supabase = await createClient();
  const ctx = await getAuthContext(supabase);
  const tenantId = ctx.tenantId;
  if (!tenantId) redirect("/operations");
  const canManageOrg =
    ctx.isPlatformSuperAdmin ||
    ctx.membershipRole === "owner" ||
    ctx.membershipRole === "admin";
  if (!canManageOrg) redirect("/settings/notifications");

  const productProfile = await getProductProfileForTenant(tenantId, supabase);
  const isFleet = productProfile === "fleet_intelligence" || productProfile === "hybrid";

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("id", tenantId)
    .maybeSingle();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, status, primary_contact_name, primary_contact_email")
    .eq("tenant_id", tenantId)
    .order("name");

  const t = tenant as { id: string; name: string; slug: string | null } | null;
  const companyRows = (companies ?? []) as Array<{
    id: string;
    name: string;
    status: string | null;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
  }>;

  const operatingRules = isFleet
    ? await Promise.all(
        companyRows.map(async (c) => ({
          company: c,
          rules: await loadCompanyOperatingRules(supabase, tenantId, c.id),
        }))
      )
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Organization (tenant)
        </h2>
        {t ? (
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--muted)]">Name</dt>
              <dd className="font-medium text-[var(--foreground)]">{t.name}</dd>
            </div>
            {t.slug ? (
              <div>
                <dt className="text-xs text-[var(--muted)]">Slug</dt>
                <dd className="font-medium text-[var(--foreground)]">{t.slug}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm text-[var(--muted)]">No tenant data.</p>
        )}
      </section>

      {isFleet ? (
        <section className="space-y-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Operational profitability rules
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Configure labor overtime, fuel, and idle cost assumptions used by dispatch recommendations and
              Command Center. This is operational decision intelligence — not payroll or accounting.
            </p>
          </div>
          {operatingRules.map(({ company, rules }) => (
            <OperatingRulesForm
              key={company.id}
              companyId={company.id}
              companyName={company.name}
              initial={rules}
              saveAction={saveCompanyOperatingRules}
            />
          ))}
        </section>
      ) : null}

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Companies
        </h2>
        {companyRows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No companies in this organization.</p>
        ) : (
          <ul className="divide-y divide-[var(--card-border)]">
            {companyRows.map((c) => (
              <li key={c.id} className="py-2 first:pt-0">
                <p className="font-medium text-[var(--foreground)]">{c.name}</p>
                {c.primary_contact_name || c.primary_contact_email ? (
                  <p className="text-xs text-[var(--muted)]">
                    {[c.primary_contact_name, c.primary_contact_email].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {c.status ? (
                  <span className="mt-1 inline-block rounded border border-[var(--card-border)] px-2 py-0.5 text-xs text-[var(--muted)]">
                    {c.status}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
