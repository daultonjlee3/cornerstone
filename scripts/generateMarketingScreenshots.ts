/**
 * Marketing screenshot generator.
 *
 * Logs into the Cornerstone demo environment and captures 1920×1080
 * screenshots of every major product module, then saves them to
 * /public/marketing/screenshots/ for use on the marketing site.
 *
 * Usage:
 *   npm run generate:screenshots
 *
 * Required environment variables (can be set in .env.local):
 *   PLAYWRIGHT_DEMO_EMAIL     – login email for the demo account
 *   PLAYWRIGHT_DEMO_PASSWORD  – login password
 *
 * Optional:
 *   SCREENSHOT_BASE_URL       – app base URL (default: http://localhost:3001)
 *   SCREENSHOT_OUTPUT_DIR     – output directory (default: public/marketing/screenshots)
 */

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local so credentials are available without exporting them to the shell
config({ path: resolve(process.cwd(), ".env.local") });

// ─── Configuration ────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.SCREENSHOT_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  process.env.SCREENSHOT_OUTPUT_DIR ?? "public/marketing/screenshots",
);

const EMAIL =
  process.env.PLAYWRIGHT_DEMO_EMAIL ??
  process.env.DEMO_EMAIL ??
  "facility-demo@cornerstonecmms.com";

const PASSWORD =
  process.env.PLAYWRIGHT_DEMO_PASSWORD ??
  process.env.DEMO_PASSWORD ??
  "demo123";

// Viewport for all screenshots: 1920×1080
const VIEWPORT = { width: 1920, height: 1080 };

// ─── Screenshot definitions ───────────────────────────────────────────────────

interface ScreenshotDef {
  /** URL path to navigate to */
  route: string;
  /** Output filename (saved under OUTPUT_DIR) */
  filename: string;
  /** Human-readable label for progress output */
  label: string;
  /** Extra ms to wait after navigation settles (for animations, lazy-loaded data) */
  extraWaitMs?: number;
  /** Selector to wait for before screenshotting */
  waitForSelector?: string;
  /** Whether to scroll to show content-rich area */
  scrollY?: number;
}

const SCREENSHOTS: ScreenshotDef[] = [
  {
    route: "/dashboard",
    filename: "cornerstone-hero-dashboard.png",
    label: "Dashboard (hero)",
    waitForSelector: "h1, [data-testid='dashboard'], main",
    extraWaitMs: 1500,
  },
  {
    route: "/dashboard",
    filename: "cornerstone-dashboard.png",
    label: "Dashboard (secondary)",
    waitForSelector: "h1, main",
    extraWaitMs: 1500,
  },
  {
    route: "/work-orders",
    filename: "cornerstone-work-orders.png",
    label: "Work Orders",
    waitForSelector: "table, [data-testid='work-orders-list'], main",
    extraWaitMs: 2000,
  },
  {
    route: "/preventive-maintenance",
    filename: "cornerstone-pm.png",
    label: "Preventive Maintenance",
    waitForSelector: "table, main",
    extraWaitMs: 1500,
  },
  {
    route: "/assets",
    filename: "cornerstone-assets-list.png",
    label: "Assets",
    waitForSelector: "table, main",
    extraWaitMs: 1500,
  },
  {
    route: "/dispatch",
    filename: "cornerstone-dispatch.png",
    label: "Dispatch",
    waitForSelector: "main",
    extraWaitMs: 2500,
  },
  {
    route: "/inventory",
    filename: "cornerstone-inventory.png",
    label: "Inventory",
    waitForSelector: "table, main",
    extraWaitMs: 1500,
  },
  {
    route: "/vendors",
    filename: "cornerstone-vendors.png",
    label: "Vendors",
    waitForSelector: "table, main",
    extraWaitMs: 1500,
  },
  {
    route: "/purchase-orders",
    filename: "cornerstone-purchase-orders.png",
    label: "Purchase Orders",
    waitForSelector: "table, main",
    extraWaitMs: 1500,
  },
  {
    route: "/reports/operations",
    filename: "cornerstone-reporting.png",
    label: "Operations Intelligence",
    waitForSelector: "main",
    extraWaitMs: 2500,
  },
  {
    route: "/portal",
    filename: "cornerstone-mobile-field.png",
    label: "Technician Portal (mobile field)",
    waitForSelector: "main, nav",
    extraWaitMs: 1500,
  },
  {
    route: "/assets/intelligence",
    filename: "cornerstone-asset-intelligence.png",
    label: "Asset Intelligence",
    waitForSelector: "main",
    extraWaitMs: 2000,
  },
  {
    route: "/request",
    filename: "cornerstone-request-portal.png",
    label: "Request Portal",
    waitForSelector: "main, form",
    extraWaitMs: 1500,
  },
  // Hero variants using the same routes with different filenames
  {
    route: "/work-orders",
    filename: "cornerstone-hero-work-orders.png",
    label: "Work Orders (hero variant)",
    waitForSelector: "table, main",
    extraWaitMs: 2000,
  },
  {
    route: "/dispatch",
    filename: "cornerstone-hero-dispatch.png",
    label: "Dispatch (hero variant)",
    waitForSelector: "main",
    extraWaitMs: 2500,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

function log(msg: string) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${msg}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("Starting marketing screenshot generation");
  log(`Base URL: ${BASE_URL}`);
  log(`Output:   ${OUTPUT_DIR}`);
  log(`Account:  ${EMAIL}`);
  log("");

  ensureOutputDir();

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2, // Retina quality
    colorScheme: "light",
  });

  const page = await context.newPage();

  // Suppress console errors from the app to keep output clean
  page.on("console", (msg) => {
    if (msg.type() === "error") return;
  });

  // ── Login ──────────────────────────────────────────────────────────────────
  log("Logging in…");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  // Dismiss any modals/banners that might appear
  await dismissModalsAndBanners(page);

  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15_000 }).catch(() => {
    log("  ⚠ Did not redirect to /dashboard — continuing anyway");
  });

  // Wait for the main content to be visible
  await page.waitForSelector("main, aside", { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Ensure sidebar is expanded for screenshots (looks better)
  await expandSidebar(page);

  log("Login complete\n");

  // ── Capture screenshots ────────────────────────────────────────────────────
  const results: { label: string; filename: string; success: boolean }[] = [];

  for (const def of SCREENSHOTS) {
    log(`Capturing: ${def.label} → ${def.filename}`);

    try {
      await page.goto(`${BASE_URL}${def.route}`, {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      });

      // Wait for key selector
      if (def.waitForSelector) {
        await page
          .waitForSelector(def.waitForSelector, { timeout: 8_000 })
          .catch(() => {});
      }

      // Dismiss any modals / notification bars that could obscure content
      await dismissModalsAndBanners(page);

      // Extra stabilisation time
      await page.waitForTimeout(def.extraWaitMs ?? 1000);

      // Scroll to show content if specified
      if (def.scrollY) {
        await page.evaluate((y) => window.scrollTo(0, y), def.scrollY);
        await page.waitForTimeout(400);
      }

      // Ensure sidebar is expanded
      await expandSidebar(page);

      const outPath = path.join(OUTPUT_DIR, def.filename);
      await page.screenshot({
        path: outPath,
        fullPage: false,
        type: "png",
        clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
      });

      log(`  ✓ Saved ${def.filename}`);
      results.push({ label: def.label, filename: def.filename, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`  ✗ Failed: ${msg}`);
      results.push({ label: def.label, filename: def.filename, success: false });
    }
  }

  await browser.close();

  // ── Summary ────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  log(`\nDone — ${passed} captured, ${failed} failed`);
  if (failed > 0) {
    log("Failed screenshots:");
    results.filter((r) => !r.success).forEach((r) => log(`  - ${r.label}`));
  }

  log(`\nScreenshots saved to: ${OUTPUT_DIR}`);
}

// ─── Page utilities ────────────────────────────────────────────────────────────

/** Expand the sidebar if it is currently collapsed (icon-only mode). */
async function expandSidebar(page: import("playwright").Page) {
  // The sidebar toggle stores state in localStorage["sidebar-collapsed"]
  await page
    .evaluate(() => {
      localStorage.setItem("sidebar-collapsed", "0");
    })
    .catch(() => {});

  // Click the expand chevron if it's visible (collapsed state)
  const expandBtn = page.locator('button[aria-label="Expand sidebar"]');
  if (await expandBtn.isVisible().catch(() => false)) {
    await expandBtn.click().catch(() => {});
    await page.waitForTimeout(300);
  }
}

/** Dismiss welcome modals, tour overlays, notification banners. */
async function dismissModalsAndBanners(page: import("playwright").Page) {
  // Close any guided tour welcome modals
  const skipTour = page.locator('button:has-text("Skip Tour"), button:has-text("Skip")').first();
  if (await skipTour.isVisible({ timeout: 500 }).catch(() => false)) {
    await skipTour.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // Close any demo welcome modals
  const explorBtn = page.locator('button:has-text("Explore"), button:has-text("Skip")').first();
  if (await explorBtn.isVisible({ timeout: 500 }).catch(() => false)) {
    await explorBtn.click().catch(() => {});
    await page.waitForTimeout(300);
  }

  // Dismiss notification dropdowns if open
  await page.keyboard.press("Escape").catch(() => {});
}

main().catch((err) => {
  console.error("Screenshot generation failed:", err);
  process.exit(1);
});
