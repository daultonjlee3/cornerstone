import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function FeatureBlock({ icon: Icon, title, description }: Props) {
  return (
    <div className="fm-card rounded-xl border border-[var(--card-border)] bg-[var(--card-solid)]/50 p-5 sm:p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400/10 text-teal-400 ring-1 ring-teal-400/20">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--foreground)] sm:text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{description}</p>
    </div>
  );
}

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
};

export function FleetSectionHeader({
  eyebrow,
  title,
  description,
  centered = false,
}: SectionHeaderProps) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">{eyebrow}</p>
      )}
      <h2 className="mk-section-headline mt-2">{title}</h2>
      {description && <p className="mt-4 mk-body-lg">{description}</p>}
    </div>
  );
}
