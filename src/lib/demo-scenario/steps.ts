import type { DemoScenarioContext } from "@/app/(authenticated)/demo-scenario/actions";

export type DemoScenarioStepKey =
  | "intro"
  | "request"
  | "workOrder"
  | "dispatch"
  | "technician"
  | "completion"
  | "reporting"
  | "final";

export type DemoScenarioTarget = {
  selectors: string[];
};

export type DemoScenarioStep = {
  key: DemoScenarioStepKey;
  title: string;
  content: string;
  /** If provided, renders a single primary action button. */
  primaryAction?: {
    label: string;
  };
  /** If provided, step will render a target highlight. */
  target?: (ctx: DemoScenarioContext) => DemoScenarioTarget | null;
  /** If provided, step will navigate to this route when entering it. */
  route?: (ctx: DemoScenarioContext) => string | null;
};

function dispatchPath(ctx: DemoScenarioContext): string {
  const date = ctx.workOrder.dispatchDate;
  const technicianId = ctx.technician.id;
  const params = new URLSearchParams();
  params.set("date", date);
  params.set("view", "day");
  params.set("technician_id", technicianId);
  return `/dispatch?${params.toString()}`;
}

export const DEMO_STEPS: DemoScenarioStep[] = [
  {
    key: "intro",
    title: "Live maintenance demo",
    content:
      "Let’s walk through how a maintenance request is handled in under 60 seconds.",
    primaryAction: { label: "Start Demo" },
    target: () => null,
    route: () => null,
  },
  {
    key: "request",
    title: "Request",
    content: "A request comes in — no calls, no emails, no chaos.",
    primaryAction: { label: "Next" },
    route: () => "/requests",
    target: (ctx) => ({
      selectors: [`tr[data-demo-scenario-target="request-row"][data-work-request-id="${ctx.request.id}"]`],
    }),
  },
  {
    key: "workOrder",
    title: "Work Order",
    content:
      "It’s automatically turned into a structured work order with priority, asset, and history.",
    primaryAction: { label: "Next" },
    route: (ctx) => `/work-orders/${ctx.workOrder.id}`,
    target: (ctx) => ({
      selectors: [
        `[data-demo-scenario-target="work-order-header"][data-work-order-id="${ctx.workOrder.id}"]`,
        `div[data-demo-scenario-target="work-order-asset-card"][data-work-order-id="${ctx.workOrder.id}"]`,
      ],
    }),
  },
  {
    key: "dispatch",
    title: "Dispatch",
    content: "Assign the right technician based on availability and workload.",
    primaryAction: { label: "Next" },
    route: (ctx) => dispatchPath(ctx),
    target: (ctx) => ({
      selectors: [`[data-dispatch-work-order-id="${ctx.workOrder.id}"]`],
    }),
  },
  {
    key: "technician",
    title: "Technician",
    content: "Technicians see exactly what to do, update status, and add notes from the field.",
    primaryAction: { label: "Next" },
    route: (ctx) => `/technicians/work-queue?technician_id=${encodeURIComponent(ctx.technician.id)}&me=1&crew=0`,
    target: (ctx) => ({
      selectors: [`tr[data-demo-scenario-target="technician-task-row"][data-work-order-id="${ctx.workOrder.id}"]`],
    }),
  },
  {
    key: "completion",
    title: "Completion",
    content: "Once completed, everything is logged — full history, no lost information.",
    primaryAction: { label: "Next" },
    route: (ctx) => `/work-orders/${ctx.completedWorkOrder.id}`,
    target: (ctx) => ({
      selectors: [
        `div[data-demo-scenario-target="completion-history"][data-work-order-id="${ctx.completedWorkOrder.id}"]`,
      ],
    }),
  },
  {
    key: "reporting",
    title: "Reporting",
    content: "Now you can see what’s getting done and what’s falling behind in real time.",
    primaryAction: { label: "Next" },
    route: () => "/reports/operations",
    target: () => ({
      selectors: [`[data-demo-scenario-target="reporting-metrics"]`],
    }),
  },
  {
    key: "final",
    title: "That’s Cornerstone",
    content: "Ready to run your own operation?",
    // Final CTA buttons handled by the overlay.
    route: () => null,
    target: () => null,
  },
];

