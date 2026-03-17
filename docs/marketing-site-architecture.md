# Cornerstone OS — Marketing Site Architecture

## Purpose

World-class B2B SaaS marketing website that:
- Converts cold traffic and supports outbound sales
- Ranks well in search (SEO)
- Speaks to maintenance and operations professionals
- Feels like Stripe, Linear, Notion, or Vercel in polish

**Scope:** Marketing pages only. No backend application code, APIs, or product functionality changes.

---

## 1. Site Navigation Structure

### Primary (Header) Navigation

- **Product** — Dropdown or mega-menu:
  - [Product Overview](/product)
  - **Features**
    - [Work Order Management](/features/work-order-management)
    - [Preventive Maintenance](/features/preventive-maintenance)
    - [Asset Management](/features/asset-management)
    - [Dispatch & Scheduling](/features/dispatch-scheduling)
    - [Technician Mobile Experience](/features/technician-mobile)
    - [Reporting & Dashboards](/features/reporting-dashboards)
    - [Request Portal](/features/request-portal)
    - [AI & Automation](/features/ai-automation)
- **Industries** — Dropdown:
  - [Facility Maintenance Companies](/facility-maintenance-software)
  - [Industrial / Manufacturing Maintenance](/industrial-maintenance-software)
  - [School District Maintenance Teams](/school-maintenance-software)
  - [Healthcare Facility Maintenance](/healthcare-maintenance-software)
- **Pricing** — [Pricing](/pricing)
- **Founding Customer** — [Founding Customer Program](/founding-customer)
- **Resources** or **Company** (optional group):
  - [How It Works](/how-it-works)
  - [About](/about)
  - [Contact / Demo](/contact)

### Secondary (Header) CTAs

- **Start Free Trial** (primary) — links to app signup
- **Sign In** — links to `/login`

### Footer Navigation

- **Product:** Product Overview, Features (grouped), Pricing
- **Industries:** All four industry pages
- **Company:** How It Works, About, Contact
- **Program:** Founding Customer Program
- **Legal:** Privacy Policy, Terms of Service
- **Contact:** support@cornerstonecmms.com (or designated marketing contact)

---

## 2. Page Hierarchy & URL Structure

| Tier | Path pattern | Purpose |
|------|--------------|--------|
| **Home** | `/` | Homepage — hero, value prop, workflow, features, pricing preview, founding program, CTAs |
| **Product** | `/product` | Product overview — one platform, capabilities, differentiator |
| **Features** | `/features/[slug]` | 8 feature pages — problem, workflow, benefits, placeholders |
| **Industries** | `/facility-maintenance-software`, `/industrial-maintenance-software`, `/school-maintenance-software`, `/healthcare-maintenance-software` | 4 industry pages — industry-specific hero, challenges, needs, screenshots, how Cornerstone helps |
| **Pricing** | `/pricing` | Pricing, technician-only billing, comparison, founding CTA |
| **Program** | `/founding-customer` | Founding customer benefits, application CTA |
| **Resources** | `/how-it-works`, `/about`, `/contact` | How it works, company story, demo/contact |
| **Legal** | `/privacy`, `/terms` | Existing; linked from footer and login |

### Feature Slugs

- `work-order-management`
- `preventive-maintenance`
- `asset-management`
- `dispatch-scheduling`
- `technician-mobile`
- `reporting-dashboards`
- `request-portal`
- `ai-automation`

### Industry Slugs

- `facility-maintenance`
- `industrial-manufacturing`
- `school-districts`
- `healthcare`

---

## 3. Internal Linking Strategy

- **Homepage** links to: Product, all 6 core features (Work Orders, PM, Asset, Dispatch, Technician, Reporting), all 4 industries, Pricing, Founding Customer, How It Works, Contact.
- **Product** links to: each feature page, industries, Pricing, Start Free Trial.
- **Feature pages** link to: related features, Product Overview, Pricing, Start Free Trial, and (where relevant) industry pages.
- **Industry pages** link to: relevant feature pages, Product, Pricing, Founding Customer, Contact.
- **Pricing** links to: Founding Customer, Start Free Trial, feature pages (for context).
- **Founding Customer** links to: Pricing, Contact/Apply, Product.
- **Footer** repeats key links on every page; **header** is consistent across marketing pages (exclude app routes like `/login` from marketing nav).

---

## 4. SEO Keyword Focus by Page

| Page | Primary keywords | Secondary keywords |
|------|------------------|--------------------|
| **Home** | maintenance operations software, CMMS, work order software | maintenance management platform, facility maintenance software |
| **Product** | CMMS software, maintenance management software, one platform | operations platform, asset maintenance |
| **Work Order Management** | work order software, work order management, CMMS work orders | maintenance work orders, work order system |
| **Preventive Maintenance** | preventive maintenance software, PM software, CMMS preventive maintenance | scheduled maintenance, maintenance scheduling |
| **Asset Management** | asset management software, CMMS asset management, equipment tracking | asset lifecycle, maintenance assets |
| **Dispatch & Scheduling** | dispatch software, technician dispatch, maintenance scheduling | field service dispatch, work order dispatch |
| **Technician Mobile** | technician app, mobile CMMS, field technician software | mobile work orders, technician experience |
| **Reporting & Dashboards** | maintenance reporting, CMMS reporting, maintenance dashboards | operations reporting, maintenance analytics |
| **Request Portal** | maintenance request portal, work request software | request management, tenant portal |
| **AI & Automation** | AI maintenance, maintenance automation, CMMS automation | predictive maintenance, automated work orders |
| **Facility Maintenance** | facility maintenance software, facility management CMMS | commercial maintenance, property maintenance |
| **Industrial / Manufacturing** | industrial maintenance software, manufacturing CMMS | plant maintenance, manufacturing maintenance |
| **School Districts** | school maintenance software, K-12 CMMS, district maintenance | school facility maintenance, district operations |
| **Healthcare** | healthcare facility maintenance, hospital CMMS, healthcare CMMS | facility maintenance healthcare, clinical engineering |
| **Pricing** | CMMS pricing, maintenance software pricing, per technician pricing | affordable CMMS, maintenance software cost |
| **Founding Customer** | founding customer, early access CMMS | — |
| **How It Works** | how CMMS works, get started maintenance software | — |
| **About** | Cornerstone OS, maintenance operations company | — |
| **Contact** | contact Cornerstone OS, demo CMMS | — |
| **Privacy / Terms** | (legal; minimal SEO) | — |

---

## 5. Four Industry Markets (Summary)

1. **Facility Maintenance Companies** — Commercial properties, multi-site, work orders, vendors, compliance. Keywords: facility maintenance software, facility management CMMS.
2. **Industrial / Manufacturing Maintenance** — Plants, equipment, PM, downtime, safety. Keywords: industrial maintenance software, manufacturing CMMS.
3. **School District Maintenance Teams** — K-12, buildings, grounds, limited budget, compliance. Keywords: school maintenance software, school district CMMS.
4. **Healthcare Facility Maintenance** — Hospitals, clinics, regulatory, uptime, asset tracking. Keywords: healthcare facility maintenance, hospital CMMS.

---

## 6. Technical Notes

- **Stack:** Next.js, React, TypeScript, Tailwind CSS.
- **Screenshots:** Use reusable placeholder containers (border, rounded, shadow, caption). Label: e.g. `[Product Screenshot Placeholder]`. No fake UI images or stock mockups.
- **App vs marketing:** Marketing pages use the same domain; app routes (`/login`, `/signup`, `/(authenticated)/*`, `/portal`, etc.) remain unchanged and are linked from marketing CTAs.

---

## 7. Conversion & Content Requirements (Reference)

- **Operational Workflow Visual:** Request → Work Order → Dispatch → Technician → Asset History → Reporting (on homepage).
- **Technician Pricing Advantage:** Only technicians billed; managers, supervisors, dispatchers, office staff included. Comparison vs MaintainX, UpKeep, Limble (per user).
- **Self-Guided Tour:** Primary CTAs — Start Free Trial, See How It Works, Explore Product Tour. Demo booking secondary.
- **Founding Customer:** First 25 customers — lifetime locked pricing, roadmap influence, priority requests, early access, concierge onboarding.

This document defines the site architecture and page structure for Phases 2–6.
