import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";

export function FleetRecommendationsPlaceholder() {
  return (
    <Card className="border-dashed border-[var(--card-border)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-[var(--muted)]" aria-hidden />
          Fleet Recommendations
        </CardTitle>
        <CardDescription>
          AI-powered truck assignment and capacity recommendations arrive in Sprint 4.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--muted)]">
          Placeholder for top recommendations (truck assignment, idle↔job match, capacity overload).
          Accept/dismiss workflow and outcome tracking will connect here.
        </p>
      </CardContent>
    </Card>
  );
}
