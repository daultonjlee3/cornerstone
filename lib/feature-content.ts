import type { FeatureSlug } from "./marketing-site";

export type FeatureContent = {
  intro: string;
  problem: string;
  problemBullets?: string[];
  workflow: string;
  workflowSteps?: string[];
  benefits: string[];
};

export const FEATURE_CONTENT: Record<FeatureSlug, FeatureContent> = {
  "work-order-management": {
    intro:
      "Work order software that keeps maintenance operations visible from request to completion. Create, assign, track, and close work orders in one CMMS—no spreadsheets or lost tickets.",
    problem:
      "Disconnected systems, paper tickets, and scattered spreadsheets make it hard to see what’s open, who’s doing what, and how long jobs take. Delays and duplicate work become the norm.",
    problemBullets: [
      "Work requests get lost in email or paper",
      "No single view of open vs. completed work",
      "Technicians lack clear instructions and history",
      "Reporting is manual and outdated",
    ],
    workflow:
      "Requests become work orders in one click. Dispatchers assign to technicians; technicians receive tasks, update status, add notes and photos, and complete work. Every step is logged for asset history and reporting.",
    workflowSteps: [
      "Request or manual work order creation",
      "Assignment to technician or crew",
      "Execution with status updates and attachments",
      "Completion and asset history update",
      "Reporting and analytics",
    ],
    benefits: [
      "Single source of truth for all maintenance work",
      "Faster assignment and fewer missed jobs",
      "Full audit trail for compliance and accountability",
      "Better reporting for labor and backlog",
    ],
  },
  "preventive-maintenance": {
    intro:
      "Preventive maintenance software that keeps schedules, templates, and compliance in one place. Schedule PMs by time or meter, track completion, and reduce unplanned downtime.",
    problem:
      "PMs are easy to miss when they live in spreadsheets or legacy systems. Overdue tasks pile up, assets fail unexpectedly, and proving compliance is a manual chore.",
    problemBullets: [
      "PM schedules scattered or outdated",
      "No visibility into overdue or upcoming work",
      "Compliance and audit prep are manual",
      "Recurring tasks don’t link to assets or history",
    ],
    workflow:
      "Define PM templates by asset type or location, set recurrence (time- or meter-based), and let the system generate due work. Technicians see PMs in their queue; completion updates asset history and keeps compliance records in one place.",
    workflowSteps: [
      "PM templates and recurrence rules",
      "Automatic generation of due work",
      "Assignment and execution",
      "Completion and asset history",
      "Compliance and audit reporting",
    ],
    benefits: [
      "Fewer missed PMs and less unplanned downtime",
      "Clear view of overdue and upcoming maintenance",
      "Compliance and audit readiness without spreadsheets",
      "Asset history that includes all PM activity",
    ],
  },
  "asset-management": {
    intro:
      "CMMS asset management that tracks equipment from install to retirement. One place for locations, maintenance history, documents, and asset intelligence so you can prioritize work and extend asset life.",
    problem:
      "Without a central asset register, teams don’t know what’s where, what’s been done, or what’s due. Critical equipment gets overlooked; repairs are reactive; replacement decisions lack data.",
    problemBullets: [
      "No single register of assets and locations",
      "Maintenance history spread across systems or paper",
      "Hard to see which assets need attention",
      "Replacement and budgeting lack data",
    ],
    workflow:
      "Build your asset hierarchy (sites, buildings, equipment). Attach work orders and PMs to assets so every repair and PM is recorded. Use dashboards and reports to see cost, uptime, and next due work—and feed that into capital planning.",
    workflowSteps: [
      "Asset and location hierarchy",
      "Work orders and PMs linked to assets",
      "History, documents, and notes in one place",
      "Dashboards and asset-level reporting",
      "Insights for repair vs. replace decisions",
    ],
    benefits: [
      "Full visibility into what you have and where it is",
      "Complete maintenance history per asset",
      "Better prioritization and fewer surprises",
      "Data to support lifecycle and budget decisions",
    ],
  },
  "dispatch-scheduling": {
    intro:
      "Maintenance dispatch and scheduling software that gets the right work to the right technician. Assign by skill, location, or load—and keep the board updated in real time.",
    problem:
      "Manual dispatch and outdated boards mean unbalanced workloads, missed SLAs, and technicians driving back and forth. Dispatchers spend more time chasing than planning.",
    problemBullets: [
      "Assignments done by phone, paper, or spreadsheets",
      "No real-time view of who’s doing what",
      "Inefficient routes and duplicate trips",
      "Hard to balance workload and skills",
    ],
    workflow:
      "View open work on a dispatch board; filter by priority, location, or skill. Assign to technicians or crews; they see updated queues on mobile. Reschedule and reassign as priorities change—everyone stays in sync.",
    workflowSteps: [
      "Dispatch board with open work and technicians",
      "Assignment by priority, location, or skill",
      "Technician queues and schedule updates",
      "Reschedule and reassign as needed",
      "Real-time status for managers and customers",
    ],
    benefits: [
      "Faster, clearer assignment of work",
      "Balanced workload and better use of skills",
      "Fewer missed jobs and improved response times",
      "One place for dispatchers and technicians to stay aligned",
    ],
  },
  "technician-mobile": {
    intro:
      "A technician experience built for the field: view work orders, update status, add photos and notes, and capture time and parts—all from a single mobile CMMS app.",
    problem:
      "When technicians rely on paper or personal phones, updates are delayed, details are lost, and the office has no real-time view. Communication back and forth wastes time and creates errors.",
    problemBullets: [
      "Paper checklists or no standard process",
      "Updates and photos arrive late or get lost",
      "No real-time visibility for supervisors",
      "Time and parts tracked elsewhere",
    ],
    workflow:
      "Technicians open their queue, see assigned work, and get directions and instructions. They update status, add photos and notes, log time and parts, and complete work—all from one app. The office sees progress in real time.",
    workflowSteps: [
      "View assigned work and details",
      "Update status and add notes or photos",
      "Log labor and parts",
      "Complete and close work",
      "Sync and visibility for office and reporting",
    ],
    benefits: [
      "One place for technicians to see and do work",
      "Real-time updates for supervisors and customers",
      "Consistent data for reporting and billing",
      "Less back-and-forth and fewer errors",
    ],
  },
  "reporting-dashboards": {
    intro:
      "Maintenance reporting and dashboards that turn operations data into decisions. Track backlog, labor, compliance, and asset performance without exporting to spreadsheets.",
    problem:
      "When data is stuck in multiple systems or spreadsheets, reporting is slow and inconsistent. Leadership and ops can’t see backlog, costs, or compliance at a glance.",
    problemBullets: [
      "Data scattered across systems and files",
      "Manual reports and no single source of truth",
      "Hard to see trends and bottlenecks",
      "Compliance and audit prep are manual",
    ],
    workflow:
      "Prebuilt dashboards and reports cover work order volume, backlog, labor, PM completion, and asset metrics. Filter by site, time, or asset. Export or share so leadership and ops use the same numbers.",
    workflowSteps: [
      "Dashboards for backlog, labor, and PM",
      "Asset and location-level reporting",
      "Filters and date ranges",
      "Export and share",
      "Trends and accountability",
    ],
    benefits: [
      "Single source of truth for operations metrics",
      "Faster decisions with up-to-date data",
      "Clear visibility for leadership and ops",
      "Easier compliance and audit reporting",
    ],
  },
  "request-portal": {
    intro:
      "A maintenance request portal that lets tenants, staff, or residents submit requests easily. Requests become work orders in your CMMS so nothing falls through the cracks.",
    problem:
      "Requests arrive by phone, email, or paper and get lost or delayed. There’s no standard form, no tracking, and no link into the work order system—so backlogs and unhappy requesters grow.",
    problemBullets: [
      "Requests scattered across email and phone",
      "No tracking or status for requesters",
      "Manual entry into work order system",
      "No visibility into request volume or SLAs",
    ],
    workflow:
      "Requesters submit via a simple portal (or form); you get a ticket that becomes a work order with one click. They can see status; you assign, execute, and close in the same CMMS. All requests are tracked for reporting.",
    workflowSteps: [
      "Submit request via portal or form",
      "Request becomes work order in CMMS",
      "Assignment and execution",
      "Status visible to requester",
      "Reporting on volume and response times",
    ],
    benefits: [
      "One place for all maintenance requests",
      "Faster intake and no lost requests",
      "Requesters can see status without calling",
      "Data for SLAs and capacity planning",
    ],
  },
  "ai-automation": {
    intro:
      "Use automation and AI to reduce manual work and surface insights. Automate work order creation, scheduling hints, and reporting so your team focuses on execution, not data entry.",
    problem:
      "Teams spend too much time on repetitive tasks: creating work orders from requests, rekeying data, and building reports. Patterns that could prevent failures or optimize schedules go unnoticed.",
    problemBullets: [
      "Repetitive data entry and manual work order creation",
      "Scheduling and assignment done by guesswork",
      "Insights buried in data; reactive decisions",
      "Reporting and alerts require manual setup",
    ],
    workflow:
      "Automation rules create work orders from requests or triggers; suggest assignments or due dates. Dashboards and alerts highlight exceptions and trends. Over time, the system helps prioritize work and reduce manual steps.",
    workflowSteps: [
      "Rules to create work from requests or triggers",
      "Suggestions for assignment and scheduling",
      "Alerts and exception reporting",
      "Trends and patterns for planning",
      "Less manual work, more focus on execution",
    ],
    benefits: [
      "Fewer manual steps and less rekeying",
      "Faster routing and smarter scheduling",
      "Earlier visibility into issues and trends",
      "More time for technicians and planners to do the work",
    ],
  },
};
