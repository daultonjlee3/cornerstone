import { config } from 'dotenv';
import { resolve } from 'path';
import { test } from '@playwright/test';

config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const DEMO_PASSWORD = process.env.PLAYWRIGHT_DEMO_PASSWORD || process.env.DEMO_PASSWORD || '';
const SCREENSHOT_DIR = 'marketing/screenshots';

/** Login as healthcare demo user and wait until dashboard is ready. */
async function loginAndWaitForDashboard(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/login?demo=healthcare&next=/dashboard`);
  await page.waitForLoadState('domcontentloaded');
  await page.getByLabel('Email').fill('healthcare-demo@cornerstonecmms.com');
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  if (page.url().includes('/onboarding')) {
    throw new Error('Demo user was redirected to /onboarding. Run npm run seed:demo:users.');
  }
  const welcome = page.getByRole('heading', { name: /Welcome to Cornerstone OS/i });
  if (await welcome.isVisible()) {
    await page.getByRole('button', { name: /Explore the Live Demo/i }).click();
  }
  await page.getByRole('heading', { name: /Operations Command Center/i }).waitFor({ state: 'visible', timeout: 20_000 });
}

test.describe('Marketing website screenshots', () => {
  test('capture all product screenshots for marketing', async ({ page }) => {
    test.setTimeout(180_000);

    await page.setViewportSize({ width: 1440, height: 900 });

    await loginAndWaitForDashboard(page);

    // Hero-quality: dashboard
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-hero-dashboard.png`, fullPage: true });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-dashboard.png`, fullPage: true });

    // Main product pages
    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Work Order/i }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-work-orders.png`, fullPage: true });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-hero-work-orders.png`, fullPage: true });

    await page.goto(`${BASE_URL}/dispatch`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Dispatch/i }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-dispatch.png`, fullPage: true });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-hero-dispatch.png`, fullPage: true });

    await page.goto(`${BASE_URL}/assets`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Assets/i }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-assets-list.png`, fullPage: true });

    await page.goto(`${BASE_URL}/assets/intelligence`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Asset Intelligence|Intelligence/i }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-asset-intelligence.png`, fullPage: true });

    // Asset detail: open first asset from list
    const firstAssetLink = page.locator('a[href^="/assets/"]').first();
    const href = await firstAssetLink.getAttribute('href').catch(() => null);
    if (href) {
      await page.goto(`${BASE_URL}${href}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
      await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-asset-detail.png`, fullPage: true });
    }

    await page.goto(`${BASE_URL}/preventive-maintenance`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Preventive Maintenance/i }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-pm.png`, fullPage: true });

    await page.goto(`${BASE_URL}/inventory`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Inventory/i }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-inventory.png`, fullPage: true });

    await page.goto(`${BASE_URL}/vendors`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Vendors/i }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-vendors.png`, fullPage: true });

    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Reports/i }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-reporting.png`, fullPage: true });

    await page.goto(`${BASE_URL}/requests`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Work requests/i }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-request-portal.png`, fullPage: true });

    await page.goto(`${BASE_URL}/technicians/work-queue`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Technician Work Queue/i }).waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
    await page.screenshot({ path: `${SCREENSHOT_DIR}/cornerstone-mobile-field.png`, fullPage: true });
  });
});
