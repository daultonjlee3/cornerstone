"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { tourConfigs } from "@/src/lib/tours/config";
import { resetTour } from "@/app/(authenticated)/tours/actions";
import { useTour } from "@/src/components/ui/tour";
import { Button } from "@/src/components/ui/button";

export default function SettingsToursPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { refreshCompleted, startTour } = useTour();

  const handleRestart = (tourId: string) => {
    startTransition(async () => {
      await resetTour(tourId);
      await refreshCompleted();
      router.refresh();
    });
  };

  const handleStartTour = (tourId: string) => {
    startTour(tourId);
    router.push(tourConfigs.find((t) => t.id === tourId)?.path ?? "/dashboard");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
          Onboarding tours
        </h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Restart a guided tour to see it again. After restarting, go to that module to run the tour.
        </p>
        <ul className="space-y-3">
          {tourConfigs.map((tour) => (
            <li
              key={tour.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-4 py-3"
            >
              <div>
                <p className="font-medium text-[var(--foreground)]">{tour.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {tour.steps.length} steps · {tour.path}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStartTour(tour.id)}
                  disabled={isPending}
                >
                  Start tour
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRestart(tour.id)}
                  disabled={isPending}
                >
                  Clear completion
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
