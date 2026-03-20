type PriorityTone = "low" | "medium" | "high" | "emergency";

function getPriorityTone(priority: string | null | undefined): PriorityTone {
  const key = String(priority ?? "medium").toLowerCase();
  if (key === "low") return "low";
  if (key === "high") return "high";
  if (key === "urgent" || key === "emergency") return "emergency";
  return "medium";
}

function getStripeClass(tone: PriorityTone): string {
  switch (tone) {
    case "emergency":
      return "bg-red-500";
    case "high":
      return "bg-amber-500";
    case "medium":
      return "bg-blue-500";
    case "low":
    default:
      return "bg-slate-400";
  }
}

type PriorityStripeProps = {
  priority: string | null | undefined;
  className?: string;
};

export function PriorityStripe({ priority, className = "" }: PriorityStripeProps) {
  const tone = getPriorityTone(priority);
  return <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${getStripeClass(tone)} ${className}`} />;
}
