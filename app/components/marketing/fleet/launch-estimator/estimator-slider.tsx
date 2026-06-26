"use client";

type EstimatorSliderProps = {
  id: string;
  label: string;
  hint?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
};

export function EstimatorSlider({
  id,
  label,
  hint,
  min,
  max,
  step = 1,
  value,
  displayValue,
  onChange,
}: EstimatorSliderProps) {
  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-4">
        <label htmlFor={id} className="text-sm font-semibold text-[var(--foreground)]">
          {label}
        </label>
        <span
          className="rounded-lg bg-teal-400/10 px-3 py-1 text-sm font-bold tabular-nums text-teal-400 ring-1 ring-teal-400/20"
          aria-live="polite"
        >
          {displayValue}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="le-slider w-full"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
      />
      {hint ? <p className="mt-1.5 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

function formatSliderValue(value: number, max: number, suffix = ""): string {
  if (value >= max) return `${max}+${suffix}`;
  return `${value}${suffix}`;
}

export function formatTruckCount(value: number): string {
  return formatSliderValue(value, 250, "");
}

export function formatDailyJobs(value: number): string {
  return formatSliderValue(value, 300, "");
}

export function formatDispatchers(value: number): string {
  return formatSliderValue(value, 20, "");
}
