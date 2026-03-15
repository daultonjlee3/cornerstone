import type { IndustrySlug } from "./marketing-site";

export type IndustryContent = {
  intro: string;
  challenges: string[];
  workflowNeeds: string[];
  howCornerstoneHelps: string;
  howBullets?: string[];
  benefitsLeadership: string[];
  benefitsTechnicians: string[];
};

export const INDUSTRY_CONTENT: Record<IndustrySlug, IndustryContent> = {
  "facility-maintenance": {
    intro:
      "Facility maintenance companies run work across multiple properties, vendors, and tenants. Cornerstone OS gives you one CMMS for work orders, preventive maintenance, assets, and reporting—so operations stay visible and under control.",
    challenges: [
      "Managing work across many sites and buildings",
      "Coordinating with tenants and request portals",
      "Tracking vendors, contracts, and compliance",
      "Proving completion and response times to stakeholders",
    ],
    workflowNeeds: [
      "Request intake and work order creation from one place",
      "Dispatch and scheduling across sites and crews",
      "Asset and location hierarchy (properties, buildings, systems)",
      "PM schedules and compliance documentation",
      "Reporting for labor, backlog, and SLA",
    ],
    howCornerstoneHelps:
      "Cornerstone OS unifies request-to-completion in one platform. Tenants and staff submit requests; you turn them into work orders, assign to technicians or vendors, and track status in real time. PMs and assets are linked so every property and system has a clear history. Reporting gives leadership visibility into backlog, costs, and compliance.",
    howBullets: [
      "Request portal that feeds into work orders",
      "Multi-site dispatch and technician queues",
      "Asset and location hierarchy for every property",
      "PM and compliance in one system",
      "Dashboards and reports for operations and leadership",
    ],
    benefitsLeadership: [
      "Single view of work across all properties",
      "Clear accountability and audit trail",
      "Data for budgeting and vendor decisions",
      "Compliance and proof of service when needed",
    ],
    benefitsTechnicians: [
      "One place to see assigned work and priorities",
      "Mobile updates so the office stays in sync",
      "Asset and history context at the job",
      "Less paperwork and fewer callbacks",
    ],
  },
  "industrial-manufacturing": {
    intro:
      "Industrial and manufacturing maintenance demands reliability, uptime, and strict PM. Cornerstone OS brings work orders, preventive maintenance, asset tracking, and reporting into one CMMS so plants run with less unplanned downtime and better visibility.",
    challenges: [
      "Keeping critical equipment on schedule and documented",
      "Reducing unplanned downtime and reactive repairs",
      "Managing work across shifts and trades",
      "Meeting safety and compliance requirements",
    ],
    workflowNeeds: [
      "PM templates and schedules (time- or meter-based)",
      "Work orders tied to assets and locations",
      "Dispatch and assignment by skill and priority",
      "Technician mobile access for updates and history",
      "Reporting for PM completion, backlog, and MTBF",
    ],
    howCornerstoneHelps:
      "Cornerstone OS connects assets, PMs, and work orders in one system. Define PM templates and recurrence; the platform generates due work and tracks completion. Technicians see assignments and update status from the field; every job updates asset history. Dashboards and reports give maintenance and operations a clear picture of PM compliance, backlog, and equipment performance.",
    howBullets: [
      "PM scheduling and completion tracking",
      "Asset hierarchy and maintenance history",
      "Dispatch and technician queues by priority and skill",
      "Mobile updates and real-time visibility",
      "Reporting for compliance and continuous improvement",
    ],
    benefitsLeadership: [
      "Visibility into PM compliance and overdue work",
      "Asset-level data for repair vs. replace decisions",
      "Consistent processes across sites and shifts",
      "Audit-ready records for safety and compliance",
    ],
    benefitsTechnicians: [
      "Clear PM and work order queue with priorities",
      "Asset and history context at the point of work",
      "Mobile completion and parts logging",
      "Less manual paperwork and duplicate data entry",
    ],
  },
  "school-districts": {
    intro:
      "School district maintenance teams keep buildings, grounds, and systems safe and compliant on tight budgets. Cornerstone OS gives you one CMMS for work orders, PM, assets, and reporting—so facilities and operations stay on top of work and compliance.",
    challenges: [
      "Managing work across many buildings and limited staff",
      "Meeting health, safety, and regulatory requirements",
      "Prioritizing urgent vs. preventive work",
      "Reporting to leadership and auditors with limited time",
    ],
    workflowNeeds: [
      "Request intake from staff and administrators",
      "Work orders and PM by building and system",
      "Dispatch and assignment for in-house and contracted work",
      "Asset and location hierarchy (campuses, buildings, equipment)",
      "Reporting for backlog, compliance, and budget",
    ],
    howCornerstoneHelps:
      "Cornerstone OS brings requests, work orders, PM, and assets into one platform. Staff submit requests; you create and assign work, track completion, and maintain PM schedules by building and asset. Technicians get a clear queue and update from the field. Leadership and facilities get dashboards and reports for backlog, compliance, and resource planning—without spreadsheets.",
    howBullets: [
      "Request portal for staff and admins",
      "Work orders and PM by building and asset",
      "Dispatch and technician mobile experience",
      "Asset and location hierarchy for every site",
      "Reporting for operations and district leadership",
    ],
    benefitsLeadership: [
      "Visibility into backlog and PM across the district",
      "Documentation for audits and compliance",
      "Data to support budget and staffing decisions",
      "Proof of response times and completion",
    ],
    benefitsTechnicians: [
      "One queue of work with priorities and locations",
      "Mobile updates and less paperwork",
      "Building and asset context at each job",
      "Clear expectations and fewer callbacks",
    ],
  },
  healthcare: {
    intro:
      "Healthcare facility maintenance must support uptime, safety, and strict compliance. Cornerstone OS is a CMMS built for hospital and clinic operations: work orders, preventive maintenance, asset tracking, and reporting in one platform so clinical environments stay safe and compliant.",
    challenges: [
      "Maintaining critical systems and equipment for patient care",
      "Meeting Joint Commission, CMS, and facility-specific requirements",
      "Coordinating across clinical engineering and facilities",
      "Documenting work for audits and risk management",
    ],
    workflowNeeds: [
      "PM schedules and compliance documentation by asset",
      "Work orders linked to equipment and locations",
      "Dispatch and assignment by priority and skill",
      "Technician mobile updates and completion documentation",
      "Reporting for PM completion, response times, and compliance",
    ],
    howCornerstoneHelps:
      "Cornerstone OS gives healthcare maintenance teams one system for work orders, PM, assets, and reporting. Define PM by asset type and location; track completion and document work for audits. Technicians receive assignments and update status from the field; every job is logged to asset history. Dashboards and reports give facilities and clinical engineering visibility into PM compliance, backlog, and equipment status.",
    howBullets: [
      "PM and compliance tracking by asset and location",
      "Work orders with full audit trail",
      "Dispatch and technician queues by priority",
      "Mobile completion and documentation",
      "Reporting for Joint Commission and internal audits",
    ],
    benefitsLeadership: [
      "Clear PM compliance and overdue work visibility",
      "Audit-ready documentation and asset history",
      "Data for capital planning and risk management",
      "Accountability across facilities and clinical engineering",
    ],
    benefitsTechnicians: [
      "Prioritized work queue with asset and compliance context",
      "Mobile updates so documentation is real time",
      "Less duplicate entry and paper-based processes",
      "Clear instructions and history at the point of work",
    ],
  },
};
