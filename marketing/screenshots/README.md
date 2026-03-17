# Marketing Screenshots

Playwright-generated product screenshots for the Cornerstone OS marketing website. All images use the real app UI and seeded healthcare demo data.

## How to generate

1. Ensure the app is running: `npm run dev`
2. Ensure demo is seeded: `npm run seed:demo` and `npm run seed:demo:users` (with `DEMO_PASSWORD` in `.env.local`)
3. Run: `npx playwright test tests/marketing-screenshots.spec.ts --project=chromium`

Screenshots are written to `marketing/screenshots/`. The spec loads `DEMO_PASSWORD` from `.env.local` via dotenv.

## File paths and routes

| File | Route | Description |
|------|--------|-------------|
| `cornerstone-hero-dashboard.png` | `/dashboard` | Hero: Operations Command Center |
| `cornerstone-dashboard.png` | `/dashboard` | Dashboard (same as hero) |
| `cornerstone-hero-work-orders.png` | `/work-orders` | Hero: Work Order list |
| `cornerstone-work-orders.png` | `/work-orders` | Work Order Command Center |
| `cornerstone-hero-dispatch.png` | `/dispatch` | Hero: Dispatch / Scheduling |
| `cornerstone-dispatch.png` | `/dispatch` | Dispatch board |
| `cornerstone-assets-list.png` | `/assets` | Assets list |
| `cornerstone-asset-detail.png` | `/assets/[id]` | First asset detail (from list) |
| `cornerstone-pm.png` | `/preventive-maintenance` | Preventive Maintenance |
| `cornerstone-inventory.png` | `/inventory` | Inventory Overview |
| `cornerstone-vendors.png` | `/vendors` | Vendors |
| `cornerstone-reporting.png` | `/reports` | Reports / Analytics |
| `cornerstone-request-portal.png` | `/requests` | Work requests (request portal) |
| `cornerstone-mobile-field.png` | `/technicians/work-queue` | Technician Work Queue (field view) |

Viewport: 1440×900. All screenshots are full-page.

## Code changes made

- **`tests/marketing-screenshots.spec.ts`** (new): Full marketing screenshot spec; loads `.env.local` via dotenv so `DEMO_PASSWORD` is available when running Playwright; login helper; captures all listed routes and hero variants.
- **Dotenv in spec**: `config({ path: resolve(process.cwd(), '.env.local') })` at top of spec so login succeeds when run without manually setting env.

No other application code was changed. The existing `tests/screenshots.spec.ts` was left as-is (different output dir and subset of pages).

## Seed / demo data

No seed or demo data changes were made. Screenshots use the existing healthcare demo tenant and `seed:demo` / `seed:demo:users` data. If a page looks sparse, re-run the demo seed or adjust seed data in the existing scripts.

## Remaining manual polish

- **Hero choice**: The spec saves both a general and a “hero” file for dashboard, work orders, and dispatch. Pick the best hero for the homepage/feature sections (e.g. crop or use the hero-* file that looks best).
- **Mobile/tablet**: `cornerstone-mobile-field.png` is captured at desktop viewport (1440×900). For a true mobile hero, run a separate test with a mobile viewport (e.g. 390×844) and capture `/technicians/work-queue` or the relevant field view.
- **Charts/maps**: If Reports or Dispatch use async charts/maps, they are captured after `networkidle`; if any tiles or charts still load late, consider adding a short wait for a chart container or map canvas before that capture.
- **Empty states**: If any screenshot shows an empty list or “no data” and you want it populated, add or adjust data in the demo seed for that module.
