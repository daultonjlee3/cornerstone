# Cornerstone Fleet Intelligence — Website Repositioning

Complete repositioning from CMMS to enterprise Fleet Intelligence platform.

---

## 1. New Sitemap

| URL | Page | Priority |
|-----|------|----------|
| `/` | Homepage — outcome-driven hero, operational loop, intelligence layer | Primary |
| `/integrations` | Integration ecosystem (40+ partners, custom connectors) | Primary |
| `/launch` | Operational Intelligence Launch (4-week timeline) | Primary |
| `/about` | Why Cornerstone exists — problem, DOS, explainable AI, vision | Secondary |
| `/contact` | Request Demo | Conversion |
| `/login` | App login | Utility |
| `/privacy` | Privacy Policy | Legal |
| `/terms` | Terms of Service | Legal |

**Deprecated from nav (legacy CMMS pages still exist at URL but unlinked):**
- `/product`, `/pricing`, `/founding-customer`, `/how-it-works`
- `/industries`, `/features/*`, industry landing pages

---

## 2. Homepage Copy

**Eyebrow:** CORNERSTONE FLEET INTELLIGENCE  
**Tagline:** The Dispatch Operating System for Industrial Fleets

**Headline:** Every Dispatch Decision Matters.

**Subheadline:** Cornerstone helps industrial fleet operators reduce deadhead, improve utilization, protect revenue, and dispatch with confidence using operational intelligence and explainable AI.

**Primary CTA:** Request Demo  
**Secondary CTA:** See Fleet Intelligence

**Positioning statement:** We do not replace your ERP, fleet management, telematics, accounting, or dispatch software. We become the operational intelligence layer that connects them together.

**Sections:**
1. Hero (outcome-driven)
2. Positioning statement
3. Business Outcomes (6 outcome cards)
4. The Operational Loop (Understand → Recommend → Approve → Execute → Measure → Improve)
5. AI Decision Support (explainable recommendations)
6. Fleet Command Center
7. Integrations preview → `/integrations`
8. Implementation preview → `/implementation`
9. Operational Impact metrics
10. Enterprise Trust / Security
11. Final CTA: "This isn't another fleet management platform."

---

## 3. About Page

**Headline:** Why Cornerstone Exists

**Subheadline:** Industrial fleet operators make hundreds of dispatch decisions every day. Most of those decisions happen without the operational intelligence to protect margin, utilization, and service levels.

**Sections:**
- **The Problem** — disconnected systems, instinct-based decisions, silent margin erosion
- **The Dispatch Operating System** — intelligence layer, not replacement software
- **Explainable AI** — why every recommendation, human approval stays in control
- **Built Around Existing Systems** — integration-first, weeks not months
- **Our Vision** — enterprise-grade intelligence for every industrial fleet operator

No founder story. Customer outcomes only.

---

## 4. Integrations Page

**Headline:** Built Around Your Existing Systems

**Subheadline:** You shouldn't have to replace the software you've already invested in. Cornerstone connects your operational data into one intelligent decision platform.

**Principles:**
- Integration-first
- Connect anything (API, webhook, database, CSV, custom connector)
- Days, not months

**Categories:**
- Telematics (Samsara, Geotab, Motive, Verizon Connect, Azuga, GPS Insight)
- Fleet Management (Fleetio, Whip Around, RTA Fleet, AssetWorks, Dossier)
- ERP & Accounting (QuickBooks, NetSuite, Dynamics 365, Sage Intacct, Acumatica, Viewpoint, CMiC)
- Field Service (ServiceTitan, BuildOps, Jobber, Housecall Pro, Salesforce Field Service)
- HR & Payroll (ADP, Paylocity, UKG, Paycom, Workday)
- Data & BI (Power BI, Tableau, Snowflake, Databricks)
- Communication (Teams, Slack, Twilio, Email)
- Open APIs (REST, GraphQL, Webhooks, CSV, Scheduled Syncs, OAuth, Custom Connectors)

**Hero CTA block:** Don't see your software? We'll build the connector.

**Architecture diagram:** Systems layer → Cornerstone intelligence layer → Fleet Command Center

---

## 5. Implementation Page

**Headline:** Operational Intelligence Launch

**Subheadline:** Not a multi-month ERP rollout. Connect your systems, establish an operational baseline, and start receiving explainable recommendations within four weeks.

**Timeline:**
| Week | Phase |
|------|-------|
| Week 1 | Connect Systems |
| Week 2 | Baseline Operations |
| Week 3 | AI Recommendations |
| Week 4 | Go Live |

**Key message:** Your team keeps using their existing software. Cornerstone makes operations smarter.

**Contrast section:** This is not (ERP rollout, rip-and-replace) vs. This is (connect, baseline, recommend, go live).

---

## 6. Updated Navigation

**Header:**
- Platform (dropdown)
  - Business Outcomes
  - The Operational Loop
  - Fleet Command Center
  - Operational Impact
- Integrations → `/integrations`
- Implementation → `/implementation`
- Company (dropdown)
  - About, Contact, Privacy, Terms
- CTAs: Log in | **Request Demo**

**Footer:**
- Platform (homepage anchors)
- Solutions (Integrations, Implementation, About, Contact)
- Legal (Privacy, Terms)

---

## 7. Visual Recommendations

**Implemented:**
- Dark enterprise palette (slate/teal) — Palantir/Linear aesthetic
- Operational Loop animated section (mobile vertical + desktop horizontal)
- Integration logo wall with category grouping
- Architecture stack diagram on integrations page
- Increased section padding and whitespace
- Outcome cards with iconography (not feature icons)

**Recommended next:**
- Replace placeholder `FleetHeroVisual` with actual Fleet Command Center screenshots
- Add partner logo SVGs (currently text-based logo wall)
- Animated connection lines between integration categories and Cornerstone layer (Lottie or CSS SVG)
- Product demo video embed on homepage hero secondary CTA
- Case study cards with quantified outcomes (+12% utilization, -18% deadhead)
- Customer quote strip (operations leader / fleet owner)
- Scroll-triggered fade-in for outcome cards (Intersection Observer)
- Open Graph images per page with Fleet Intelligence branding

---

## 8. SEO Recommendations

**Implemented:**
- Root metadata updated to Fleet Intelligence positioning
- Per-page metadata via `FLEET_SEO` constants
- Sitemap trimmed to fleet pages only (removed legacy CMMS URLs)

**Recommended next:**
- Add `robots.txt` disallow for legacy CMMS pages or 301 redirect them
- Create `/integrations/[partner]` landing pages for long-tail SEO (e.g., "Samsara fleet intelligence integration")
- Schema.org `SoftwareApplication` + `Organization` structured data
- Blog/content hub: "Operational Intelligence" thought leadership
- Target keywords:
  - fleet intelligence platform
  - dispatch operating system
  - fleet operational intelligence
  - reduce deadhead fleet
  - fleet utilization software
  - explainable AI dispatch
  - fleet integration platform
- Update email domain from cornerstonecmms.com → fleet-branded domain when ready

---

## 9. Messaging Framework

| Element | Message |
|---------|---------|
| **Category** | Operational Intelligence / Dispatch Operating System |
| **Product name** | Cornerstone Fleet Intelligence |
| **Tagline** | The Dispatch Operating System for Industrial Fleets |
| **Mission** | Help industrial fleet operators make better operational decisions using real-time data and explainable AI |
| **We are NOT** | CMMS, fleet management replacement, telematics, ERP, dispatch software |
| **We ARE** | Intelligence layer on top of existing systems |
| **Audience** | Industrial fleet operators, dispatch leaders, operations executives, fleet owners |
| **Primary CTA** | Request Demo |
| **Secondary CTA** | See Fleet Intelligence |
| **Proof points** | +12% utilization, -18% deadhead, +$142K contribution protected, 91% on-time |
| **Differentiator #1** | Integration-first — connect, don't replace |
| **Differentiator #2** | Explainable AI — human approval, not black box |
| **Differentiator #3** | Weeks to live — Operational Intelligence Launch, not ERP rollout |
| **Outcome pillars** | Reduce Deadhead, Increase Contribution, Improve Utilization, Protect Revenue, Dispatcher Productivity, Operational Visibility, AI Decision Support, Shorter Implementation |
| **Competitive frame** | Palantir / RELEX / Samsara Enterprise / Linear / Stripe — not traditional fleet software |

**Voice:** Modern, premium, enterprise, outcome-driven. No feature checklists. No jargon without explanation.

**Elevator pitch:** Cornerstone Fleet Intelligence is the Dispatch Operating System for industrial fleets. We connect your telematics, ERP, dispatch, and payroll into one operational intelligence layer — and deliver explainable AI recommendations that reduce deadhead, improve utilization, and protect revenue. We don't replace your existing software. We make every dispatch decision smarter.

---

## 10. Remaining Opportunities

1. **Retire or redirect legacy CMMS pages** — `/product`, `/pricing`, `/features/*` still accessible; add 301 redirects or remove from build
2. **Partner logo assets** — replace text-based integration cards with official partner logos (with permission)
3. **Product screenshots** — swap `FleetHeroVisual` placeholder with real Command Center, dispatch board, recommendation card UI
4. **Demo video** — 90-second walkthrough of operational loop in action
5. **Customer proof** — named pilot customer quotes and case studies (Peachtree Industrial demo tenant)
6. **Industry vertical pages** — industrial services, waste hauling, utility fleets (outcome-framed, not CMMS-framed)
7. **Pricing page** — enterprise "Contact for pricing" or value-based tiers (not per-seat CMMS pricing)
8. **Security/compliance page** — SOC 2, data handling, tenant isolation for enterprise buyers
9. **Developer docs portal** — REST API, webhooks, OAuth for integration partners
10. **Email/domain rebrand** — move from cornerstonecmms.com to fleet-branded domain
11. **Blog/thought leadership** — "Operational Intelligence" content hub for SEO and enterprise credibility
12. **Comparison pages** — "Cornerstone vs. building in-house" / "Cornerstone vs. BI dashboards"
13. **Interactive integration configurator** — "Select your stack → see your launch timeline"
14. **Animated architecture diagram** — data flowing from systems into Cornerstone layer (premium motion design)

---

## Files Changed

| File | Change |
|------|--------|
| `lib/fleet-marketing-site.ts` | Full content model, nav, integrations ecosystem, SEO, messaging |
| `app/(marketing)/page.tsx` | Outcome-driven homepage rewrite |
| `app/(marketing)/integrations/page.tsx` | New integrations page |
| `app/(marketing)/launch/page.tsx` | New launch page (avoids /implementation conflict with app) |
| `app/(marketing)/about/page.tsx` | Fleet Intelligence about rewrite |
| `app/(marketing)/contact/page.tsx` | Request Demo positioning |
| `app/components/marketing/fleet/operational-loop-section.tsx` | New animated loop component |
| `app/components/marketing/fleet/integration-ecosystem.tsx` | New full ecosystem component |
| `app/components/marketing/fleet/implementation-timeline.tsx` | New 4-week timeline |
| `app/components/marketing/fleet/outcome-grid.tsx` | New outcome cards |
| `app/components/marketing/fleet/fleet-marketing-header.tsx` | Updated nav |
| `app/components/marketing/fleet/fleet-marketing-footer.tsx` | Updated footer |
| `app/globals.css` | Operational loop animations |
| `app/layout.tsx` | Root metadata → Fleet Intelligence |
| `app/sitemap.ts` | Fleet pages only |
