# Fleet Intelligence Launch Estimator — Deliverables

Interactive implementation scoping tool at `/launch-estimator`.

## 1. Components created

| Component | Path |
|-----------|------|
| `LaunchEstimatorWizard` | `app/components/marketing/fleet/launch-estimator/launch-estimator-wizard.tsx` |
| `EstimatorProgress` | `estimator-progress.tsx` |
| `EstimatorCard` | `estimator-card.tsx` |
| `EstimatorSlider` | `estimator-slider.tsx` |
| `EstimatorStepCompany` | `estimator-step-company.tsx` |
| `EstimatorStepSystems` | `estimator-step-systems.tsx` |
| `EstimatorStepGoals` | `estimator-step-goals.tsx` |
| `EstimatorResults` | `estimator-results.tsx` |
| Marketing page | `app/(marketing)/launch-estimator/page.tsx` |
| API route | `app/api/launch-estimator/route.ts` |

## 2. Pricing calculation logic

Rules live in `lib/launch-estimator/config.ts` (`PRICING_RULES`) and `lib/launch-estimator/pricing.ts`.

- **Base:** $10,000 — 1 branch, up to 25 trucks (per branch), up to 3 integrations
- **Additional branch:** +$10,000 each
- **26–50 trucks per branch:** +$5,000
- **51–100 trucks per branch:** +$10,000
- **Beyond 3 integrations:** +$1,500 each
- **Rounding:** Snapped to clean tiers (`$10k`, `$25k`, `$40k`, `$65k`, …) via `CLEAN_PRICE_TIERS`
- **Enterprise signal:** Custom planning recommended when complexity is Enterprise, >100 trucks/branch, 7+ branches, or 10+ integrations

## 3. Complexity scoring logic

Internal weighted score in `lib/launch-estimator/complexity.ts` — **not exposed in UI**.

Inputs: branch count, truck count, integration count, dispatchers, daily jobs, goal count.

| Score | Tier |
|-------|------|
| 0–25 | Low |
| 26–45 | Medium |
| 46–65 | High |
| 66+ | Enterprise |

Timeline mapping (`pricing.ts`):

| Tier | Timeline |
|------|----------|
| Low | 2–3 weeks (display: 3 Weeks) |
| Medium | 3–5 weeks (display: 4 Weeks) |
| High | 5–8 weeks (display: 6 Weeks) |
| Enterprise | Custom rollout |

## 4. PDF template

Generated server-side with `pdf-lib` in `lib/launch-estimator/pdf.ts`.

Includes: company profile, implementation estimate, timeline, complexity, integrations, operational focus, goals, illustrative opportunities, disclaimer, next-step CTA.

## 5. CRM payload

`buildCrmPayload()` in `lib/launch-estimator/calculate.ts` produces:

```json
{
  "source": "launch_estimator",
  "company_name", "email", "phone", "industry",
  "branch_count", "truck_count", "daily_jobs", "dispatcher_count",
  "integration_count", "integrations", "goals",
  "estimated_implementation", "estimated_implementation_label",
  "complexity", "timeline", "custom_planning_recommended"
}
```

Stored in `launch_estimator_leads` (migration `20260623000000_launch_estimator_leads.sql`). Internal notification email sent via `lib/email/sendLaunchEstimatorNotification.ts`.

## 6. Mobile experience

- Single-column wizard with touch-friendly 48px+ controls
- Branch and goal selectors use 2-column grid on small screens
- Progress step labels hidden on xs, visible from `sm`
- Stacked CTAs on results screen
- Range sliders styled for touch (`globals.css` `.le-slider`)

## 7. Future enhancements

- HubSpot / Salesforce webhook on lead submit
- A/B test headline and CTA copy
- Admin dashboard for estimator funnel analytics
- Save-and-resume via email magic link
- Industry-specific opportunity benchmarks
- Multi-currency / regional pricing bands
- Compare scenarios (branch expansion what-if)
- Embed widget for partner sites

## Local progress

Wizard state persists in `localStorage` under key `cornerstone-launch-estimator-v1`.

## Updating pricing

Edit `PRICING_RULES` and `CLEAN_PRICE_TIERS` in `lib/launch-estimator/config.ts` — no UI changes required.
