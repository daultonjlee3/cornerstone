"use client";

const STEPS = ["Company", "Systems", "Goals", "Estimate"] as const;

type EstimatorProgressProps = {
  currentStep: number;
};

export function EstimatorProgress({ currentStep }: EstimatorProgressProps) {
  return (
    <nav aria-label="Estimator progress" className="mx-auto mb-8 max-w-3xl">
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map((label, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          return (
            <li key={label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${done || active ? "bg-teal-400/60" : "bg-[var(--card-border)]"}`}
                    aria-hidden
                  />
                ) : (
                  <div className="flex-1" aria-hidden />
                )}
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    active
                      ? "bg-teal-400 text-slate-950 ring-4 ring-teal-400/20"
                      : done
                        ? "bg-teal-400/20 text-teal-400"
                        : "bg-[var(--card-solid)] text-[var(--muted)] ring-1 ring-[var(--card-border)]"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? "✓" : index + 1}
                </span>
                {index < STEPS.length - 1 ? (
                  <div
                    className={`h-0.5 flex-1 transition-colors ${done ? "bg-teal-400/60" : "bg-[var(--card-border)]"}`}
                    aria-hidden
                  />
                ) : (
                  <div className="flex-1" aria-hidden />
                )}
              </div>
              <span
                className={`hidden text-center text-[11px] font-medium uppercase tracking-wide sm:block ${
                  active ? "text-teal-400" : "text-[var(--muted)]"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
