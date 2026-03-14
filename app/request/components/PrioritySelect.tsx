"use client";

import type { RequestPortalTranslationKey } from "@/src/lib/i18n/request-portal";
import { useRequestPortalTranslations } from "./RequestPortalI18n";

const PRIORITY_VALUES = ["low", "medium", "high", "urgent", "emergency"] as const;

const PRIORITY_KEYS: Record<(typeof PRIORITY_VALUES)[number], RequestPortalTranslationKey> = {
  low: "requestPortal.priority.low",
  medium: "requestPortal.priority.medium",
  high: "requestPortal.priority.high",
  urgent: "requestPortal.priority.urgent",
  emergency: "requestPortal.priority.emergency",
};

export function PrioritySelect() {
  const { t } = useRequestPortalTranslations();

  return (
    <label className="block space-y-2">
      <span className="ui-label">{t("requestPortal.priority")}</span>
      <select
        name="priority"
        className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
        defaultValue="medium"
        aria-describedby="priority-description"
      >
        {PRIORITY_VALUES.map((value) => (
          <option key={value} value={value}>
            {t(PRIORITY_KEYS[value])}
          </option>
        ))}
      </select>
      <span id="priority-description" className="sr-only">
        {t("requestPortal.priorityDescription")}
      </span>
    </label>
  );
}
