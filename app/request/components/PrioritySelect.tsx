"use client";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low – Not urgent" },
  { value: "medium", label: "Medium – Needs attention soon" },
  { value: "high", label: "High – Urgent issue" },
  { value: "urgent", label: "Urgent – Time-sensitive" },
  { value: "emergency", label: "Emergency – Immediate response required" },
] as const;

export function PrioritySelect() {
  return (
    <label className="block space-y-2">
      <span className="ui-label">Priority</span>
      <select
        name="priority"
        className="ui-input min-h-[48px] rounded-xl border-[var(--card-border)] py-3 text-base sm:min-h-[44px] sm:py-2.5 sm:text-sm"
        defaultValue="medium"
        aria-describedby="priority-description"
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span id="priority-description" className="sr-only">
        Choose how urgent your request is. Medium is selected by default.
      </span>
    </label>
  );
}
