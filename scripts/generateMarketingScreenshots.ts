/**
 * Marketing screenshot generator — hardened version.
 *
 * Authenticates into the Cornerstone demo environment, suppresses all
 * onboarding tours/modals via ?screenshotMode=true and localStorage flags,
 * validates each page before saving, and writes clean 1920×1080 retina PNGs
 * to /public/screenshots/.
 *
 * Usage:
 *   npm run generate:screenshots
 *
 * Required environment variables:
 *   PLAYWRIGHT_DEMO_EMAIL     – demo login email
 *   PLAYWRIGHT_DEMO_PASSWORD  – demo login password
 *   SCREENSHOT_BASE_URL       – app base URL (e.g. http://localhost:3001)
 *
 * Optional:
 *   SCREENSHOT_OUTPUT_DIR     – override output dir (default: public/screenshots)
 */

import { chromium, type Page } from "playwright";
import path from "path";
import fs from "fs";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

// ─── Configuration & validation ───────────────────────────────────────────────

const EMAIL = process.env.PLAYWRIGHT_DEMO_EMAIL?.trim();
const PASSWORD = process.env.PLAYWRIGHT_DEMO_PASSWORD?.trim();
const BASE_URL = process.env.SCREENSHOT_BASE_URL?.replace(/\/$/, "").trim();

if (!EMAIL || !PASSWORD || !BASE_URL) {
  console.error(
    "\n[ERROR] Screenshot generator requires PLAYWRIGHT_DEMO_EMAIL, " +
      "PLAYWRIGHT_DEMO_PASSWORD, and SCREENSHOT_BASE_URL.\n" +
      "Set them in .env.local or export them before running the script.\n"
  );
  process.exit(1);
}

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  process.env.SCREENSHOT_OUTPUT_DIR ?? "public/screenshots"
);

// Smaller viewport + CSS zoom means the app UI fills more of the frame and
// appears readable when scaled into marketing page containers (~800px wide).
// At 1440×900 + 1.5× zoom: effective 960px content in 1440px frame →
// ~83% scale in the marketing card vs ~42% at 1920×1080 (≈2× more readable).
const VIEWPORT = { width: 1440, height: 900 };
const CSS_ZOOM = 1.5;

// ─── Screenshot definitions ───────────────────────────────────────────────────

interface ScreenshotSpec {
  /** Authenticated app route (without base URL). */
  route: string;
  /** Output filename under OUTPUT_DIR. */
  filename: string;
  /** Human-readable label for logs. */
  label: string;
  /** Text that MUST appear on the page (validates correct page loaded). */
  expectedText: string;
  /** Extra stabilisation wait after navigation (ms). */
  waitMs?: number;
  /** Selector to wait for (in addition to text). */
  waitForSelector?: string;
}

const SCREENSHOTS: ScreenshotSpec[] = [
  {
    route: "/dashboard",
    filename: "dashboard.png",
    label: "Dashboard",
    expectedText: "Dashboard",
    waitForSelector: "main",
    waitMs: 2000,
  },
  {
    route: "/work-orders",
    filename: "work-orders.png",
    label: "Work Orders",
    expectedText: "Work Orders",
    waitForSelector: "table, main",
    waitMs: 2500,
  },
  {
    route: "/preventive-maintenance",
    filename: "preventive-maintenance.png",
    label: "Preventive Maintenance",
    expectedText: "Preventive Maintenance",
    waitForSelector: "table, main",
    waitMs: 2000,
  },
  {
    route: "/assets",
    filename: "assets.png",
    label: "Assets",
    expectedText: "Assets",
    waitForSelector: "table, main",
    waitMs: 2000,
  },
  {
    route: "/dispatch",
    filename: "dispatch.png",
    label: "Dispatch",
    expectedText: "Dispatch",
    waitForSelector: "main",
    waitMs: 3000,
  },
  {
    route: "/technicians/work-queue",
    filename: "technician-mobile.png",
    label: "Technician Work Queue",
    expectedText: "Work Queue",
    waitForSelector: "main",
    waitMs: 2000,
  },
  {
    route: "/inventory",
    filename: "inventory.png",
    label: "Inventory",
    expectedText: "Inventory",
    waitForSelector: "table, main",
    waitMs: 2000,
  },
  {
    route: "/vendors",
    filename: "vendors.png",
    label: "Vendors",
    expectedText: "Vendors",
    waitForSelector: "table, main",
    waitMs: 2000,
  },
  {
    route: "/purchase-orders",
    filename: "purchase-orders.png",
    label: "Purchase Orders",
    expectedText: "Purchase Orders",
    waitForSelector: "table, main",
    waitMs: 2000,
  },
  {
    route: "/reports/operations",
    filename: "operations-dashboard.png",
    label: "Operations Intelligence",
    expectedText: "Operations Intelligence",
    waitForSelector: "main",
    waitMs: 3000,
  },
  // Additional screenshots used by feature/industry pages
  {
    route: "/assets/intelligence",
    filename: "asset-intelligence.png",
    label: "Asset Intelligence",
    expectedText: "Intelligence",
    waitForSelector: "main",
    waitMs: 2500,
  },
  {
    route: "/request",
    filename: "request-portal.png",
    label: "Request Portal",
    expectedText: "Request",
    waitForSelector: "main, form",
    waitMs: 1500,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    log(`Created output directory: ${OUTPUT_DIR}`);
  }
}

/** Build a full URL with screenshotMode query param. */
function screenshotUrl(route: string): string {
  const sep = route.includes("?") ? "&" : "?";
  return `${BASE_URL}${route}${sep}screenshotMode=true`;
}

/** Suppress all tours/modals via localStorage and apply CSS zoom for readability. */
async function setScreenshotModeStorage(page: Page) {
  await page.evaluate((zoom) => {
    // Disable new guided product tour
    localStorage.setItem("cornerstone_demo_tour_completed", "1");
    // Signal app-level screenshot mode flag
    localStorage.setItem("screenshot_mode", "true");
    // Expand sidebar
    localStorage.setItem("sidebar-collapsed", "0");
    // Mark old demo welcome as shown
    sessionStorage.setItem("demo_welcome_shown", "1");
    // Zoom in so product UI is readable in marketing page containers.
    // CSS zoom scales the entire page (including fixed sidebar/topbar) in Chrome.
    document.documentElement.style.zoom = String(zoom);
  }, CSS_ZOOM);
}

/** Expand the sidebar to ensure nav items are visible in screenshots. */
async function expandSidebar(page: Page) {
  await page
    .evaluate(() => {
      localStorage.setItem("sidebar-collapsed", "0");
    })
    .catch(() => {});

  const btn = page.locator('button[aria-label="Expand sidebar"]');
  if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(250);
  }
}

/** Close any visible overlay/modal/tour that could obscure the screenshot. */
async function dismissOverlays(page: Page) {
  // Skip buttons (guided tour, demo welcome)
  for (const label of ["Skip Tour", "Skip", "Explore the Live Demo", "Continue Exploring"]) {
    const btn = page.locator(`button:has-text("${label}")`).first();
    if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(200);
    }
  }
  // Escape to close dropdowns / tooltips
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);
}

/**
 * Validate the page state before taking a screenshot.
 * Throws if:
 *  - The current URL does NOT include the expected route
 *  - The login page is visible
 *  - The expected text is NOT present
 */
async function validatePageState(page: Page, spec: ScreenshotSpec) {
  const currentUrl = page.url();

  // 1. Confirm we are on the correct route
  const routeWithoutQuery = spec.route.split("?")[0];
  if (!currentUrl.includes(routeWithoutQuery)) {
    throw new Error(
      `Route validation failed for "${spec.label}": ` +
        `expected URL to contain "${routeWithoutQuery}" but got "${currentUrl}"`
    );
  }

  // 2. Confirm the login page is NOT visible
  const loginForm = page.locator('input[type="password"]');
  const loginVisible = await loginForm.isVisible({ timeout: 500 }).catch(() => false);
  if (loginVisible) {
    throw new Error(
      `Page validation failed for "${spec.label}": ` +
        `login form is visible — authentication may have failed or the session expired.`
    );
  }

  // 3. Confirm expected text is present
  const bodyText = await page
    .locator("body")
    .innerText({ timeout: 5000 })
    .catch(() => "");
  if (!bodyText.toLowerCase().includes(spec.expectedText.toLowerCase())) {
    throw new Error(
      `Content validation failed for "${spec.label}": ` +
        `expected page to contain "${spec.expectedText}" but it was not found. ` +
        `Current URL: ${currentUrl}`
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Cornerstone Marketing Screenshot Generator ===");
  log(`Base URL:  ${BASE_URL}`);
  log(`Output:    ${OUTPUT_DIR}`);
  log(`Account:   ${EMAIL}`);
  log("");

  ensureOutputDir();

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "light",
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  // ── Step 1: Navigate to login ───────────────────────────────────────────────
  log("Step 1: Navigating to login page…");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });

  // Set screenshot mode storage early
  await setScreenshotModeStorage(page);
  await dismissOverlays(page);

  // ── Step 2: Authenticate ────────────────────────────────────────────────────
  log("Step 2: Authenticating…");

  await page.fill('input[type="email"], input[name="email"]', EMAIL!);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD!);
  await page.click('button[type="submit"]');

  // FATAL: must reach /dashboard after login
  try {
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15_000 });
  } catch {
    const currentUrl = page.url();
    // Check for error message on the page
    const errorText = await page
      .locator('[role="alert"], .error, [data-testid="error"]')
      .first()
      .innerText({ timeout: 1000 })
      .catch(() => "(no error element found)");
    await browser.close();
    throw new Error(
      `Login failed: did not reach /dashboard. ` +
        `Current URL: ${currentUrl}. ` +
        `Page error: ${errorText}. ` +
        `Check PLAYWRIGHT_DEMO_EMAIL="${EMAIL}", PLAYWRIGHT_DEMO_PASSWORD, and SCREENSHOT_BASE_URL="${BASE_URL}".`
    );
  }

  log("  ✓ Authenticated — reached /dashboard");

  // Set screenshot mode storage again now that we are authenticated
  await setScreenshotModeStorage(page);
  await dismissOverlays(page);
  await expandSidebar(page);
  await page.waitForTimeout(1000);

  log("Step 3: Capturing screenshots…\n");

  // ── Step 3: Capture each screenshot ────────────────────────────────────────
  const results: { label: string; filename: string; ok: boolean; error?: string }[] = [];

  for (const spec of SCREENSHOTS) {
    log(`  → ${spec.label} (${spec.filename})`);

    try {
      // Navigate with screenshotMode query param
      await page.goto(screenshotUrl(spec.route), {
        waitUntil: "domcontentloaded",
        timeout: 25_000,
      });

      // Set storage after each navigation (SPA may clear it)
      await setScreenshotModeStorage(page);

      // Wait for key selector
      if (spec.waitForSelector) {
        await page
          .waitForSelector(spec.waitForSelector, { timeout: 8_000 })
          .catch(() => {});
      }

      // Dismiss any leftover overlays
      await dismissOverlays(page);

      // Extra stabilisation time for data to load
      await page.waitForTimeout(spec.waitMs ?? 1500);

      // Ensure sidebar expanded
      await expandSidebar(page);

      // VALIDATION: confirm correct page, no login, expected content
      await validatePageState(page, spec);

      // Take the screenshot
      const outPath = path.join(OUTPUT_DIR, spec.filename);
      await page.screenshot({
        path: outPath,
        fullPage: false,
        type: "png",
        clip: {
          x: 0,
          y: 0,
          width: VIEWPORT.width,
          height: VIEWPORT.height,
        },
      });

      log(`     ✓ Saved ${spec.filename}`);
      results.push({ label: spec.label, filename: spec.filename, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`     ✗ FAILED: ${msg}`);
      results.push({ label: spec.label, filename: spec.filename, ok: false, error: msg });
    }
  }

  await browser.close();

  // ── Summary ─────────────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  log(`\n=== Summary: ${passed}/${results.length} screenshots captured ===`);

  if (failed > 0) {
    log("\nFailed:");
    results.filter((r) => !r.ok).forEach((r) => {
      log(`  ✗ ${r.label}: ${r.error}`);
    });

    const fatal = results.filter(
      (r) =>
        !r.ok &&
        (r.error?.includes("Route validation") ||
          r.error?.includes("login form is visible") ||
          r.error?.includes("Content validation"))
    );
    if (fatal.length > 0) {
      console.error(
        "\n[ERROR] One or more screenshots failed validation. " +
          "Do NOT commit these screenshots. Fix the root cause and re-run.\n"
      );
      process.exit(1);
    }
  }

  log(`\nScreenshots saved to: ${OUTPUT_DIR}`);
  log(
    "\nNext steps:\n" +
      "  git add public/screenshots/*.png\n" +
      "  git commit -m 'Update marketing screenshots'\n" +
      "  git push\n"
  );
}

main().catch((err) => {
  console.error("\n[FATAL]", err instanceof Error ? err.message : err);
  process.exit(1);
});
