"use client";

import { useActionState } from "react";
import { FormSection, PageLayout, PageSection, Panel, SectionHeader } from "@/src/components/design-system";
import { FormField } from "@/src/components/ui/form-field";
import { saveImplementationSettings } from "./actions";

type Props = {
  companyId: string;
  defaults: {
    businessType: string;
    timezone: string;
    units: string;
    currency: string;
    workWeek: string;
    baselineWindowDays: number;
    importBehavior: string;
    notificationPreferences: string;
  };
  canManage: boolean;
};

const BUSINESS_TYPES = [
  "hydrovac",
  "vacuum_truck",
  "industrial_services",
  "utility_contractor",
  "environmental",
  "septic",
  "waste",
  "custom",
];

export function ImplementationSettingsForm({ companyId, defaults, canManage }: Props) {
  const [state, formAction, pending] = useActionState(saveImplementationSettings, {});

  return (
    <PageLayout>
      <PageSection>
        <SectionHeader
          title="Implementation settings"
          description="Business profile and onboarding behavior preferences for enterprise rollout."
        />
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="company_id" value={companyId} />
          {state?.error ? (
            <Panel
              padding="sm"
              className="border-[color-mix(in_srgb,var(--status-danger)_25%,transparent)] bg-[var(--status-danger-subtle)]"
            >
              <p className="cs-text-caption text-[var(--status-danger)]">{state.error}</p>
            </Panel>
          ) : null}
          {state?.success ? (
            <Panel
              padding="sm"
              className="border-[color-mix(in_srgb,var(--status-success)_25%,transparent)] bg-[var(--status-success-subtle)]"
            >
              <p className="cs-text-caption text-[var(--status-success)]">Settings saved successfully.</p>
            </Panel>
          ) : null}

          <FormSection
            title="Business profile"
            description="Set onboarding defaults for business type, timezone, units, currency, and work week."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField label="Business Type" htmlFor="business-type">
                <select
                  id="business-type"
                  name="business_type"
                  className="ui-select"
                  defaultValue={defaults.businessType}
                  disabled={!canManage || pending}
                >
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Timezone" htmlFor="timezone">
                <input
                  id="timezone"
                  name="timezone"
                  className="ui-input"
                  defaultValue={defaults.timezone}
                  disabled={!canManage || pending}
                />
              </FormField>
              <FormField label="Units" htmlFor="units">
                <select id="units" name="units" className="ui-select" defaultValue={defaults.units} disabled={!canManage || pending}>
                  <option value="imperial">Imperial</option>
                  <option value="metric">Metric</option>
                </select>
              </FormField>
              <FormField label="Currency" htmlFor="currency">
                <input
                  id="currency"
                  name="currency"
                  className="ui-input"
                  defaultValue={defaults.currency}
                  disabled={!canManage || pending}
                />
              </FormField>
              <FormField label="Work Week" htmlFor="work-week">
                <select
                  id="work-week"
                  name="work_week"
                  className="ui-select"
                  defaultValue={defaults.workWeek}
                  disabled={!canManage || pending}
                >
                  <option value="monday-friday">Monday–Friday</option>
                  <option value="monday-saturday">Monday–Saturday</option>
                  <option value="custom">Custom</option>
                </select>
              </FormField>
              <FormField label="Baseline Window" htmlFor="baseline-window">
                <select
                  id="baseline-window"
                  name="baseline_window_days"
                  className="ui-select"
                  defaultValue={String(defaults.baselineWindowDays)}
                  disabled={!canManage || pending}
                >
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                  <option value="180">180 Days</option>
                  <option value="365">365 Days</option>
                </select>
              </FormField>
            </div>
          </FormSection>

          <FormSection
            title="Import + notification behavior"
            description="Control import merge behavior and onboarding notification preferences."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField label="Import Behavior" htmlFor="import-behavior">
                <select
                  id="import-behavior"
                  name="import_behavior"
                  className="ui-select"
                  defaultValue={defaults.importBehavior}
                  disabled={!canManage || pending}
                >
                  <option value="upsert">Upsert records</option>
                  <option value="insert-only">Insert only</option>
                  <option value="review-before-execute">Require review before execute</option>
                </select>
              </FormField>
              <FormField label="Notification Preferences" htmlFor="notification-preferences">
                <select
                  id="notification-preferences"
                  name="notification_preferences"
                  className="ui-select"
                  defaultValue={defaults.notificationPreferences}
                  disabled={!canManage || pending}
                >
                  <option value="critical">Critical only</option>
                  <option value="important">Important + critical</option>
                  <option value="all">All onboarding updates</option>
                </select>
              </FormField>
            </div>
          </FormSection>

          {canManage ? (
            <button
              type="submit"
              disabled={pending}
              className="rounded-[var(--radius-md)] bg-[var(--brand-action)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save Implementation Settings"}
            </button>
          ) : (
            <Panel padding="sm">
              <p className="cs-text-caption cs-text-muted">
                You currently have read-only access. Owner or admin role is required to change implementation settings.
              </p>
            </Panel>
          )}
        </form>
      </PageSection>
    </PageLayout>
  );
}
