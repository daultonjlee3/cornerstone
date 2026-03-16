import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

/**
 * Screenshot test: password-based login to seeded healthcare demo, then capture
 * dashboard, work orders, dispatch, and assets. No magic link.
 *
 * Prerequisites: npm run seed:demo, npm run seed:demo:users, and set
 * PLAYWRIGHT_DEMO_PASSWORD or DEMO_PASSWORD when running Playwright.
 *
 * Policy: Do not use test.skip, test.fixme, or test.describe.skip in this project.
 * Tests must run or fail so failures are visible and can be fixed.
 */
const DEMO_PASSWORD = process.env.PLAYWRIGHT_DEMO_PASSWORD || process.env.DEMO_PASSWORD || '';

test.describe('Marketing screenshots from demo environment', () => {
  test('capture product screenshots via test-safe demo login', async ({ page }) => {
    test.setTimeout(60_000);

    // 1. Enter demo via password-based login (no magic link). Uses existing healthcare seeded demo.
    await page.goto(`${BASE_URL}/login?demo=healthcare&next=/dashboard`);
    await page.waitForLoadState('domcontentloaded');

    await page.getByLabel('Email').fill('healthcare-demo@cornerstonecmms.com');
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // 2. Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle');

    // If redirected to onboarding, demo user has no tenant membership (run seed:demo:users).
    const url = page.url();
    if (url.includes('/onboarding')) {
      throw new Error('Demo user was redirected to /onboarding. Ensure healthcare demo user has tenant membership (npm run seed:demo:users).');
    }

    // 3. Dismiss welcome modal if present (so it does not cover the dashboard)
    const welcomeTitle = page.getByRole('heading', { name: /Welcome to Cornerstone OS/i });
    if (await welcomeTitle.isVisible()) {
      await page.getByRole('button', { name: /Explore the Live Demo/i }).click();
    }

    // 4. Wait for dashboard content: the dashboard page title (h1) is visible only when the dashboard has rendered
    await page.getByRole('heading', { name: /Operations Command Center/i }).waitFor({ state: 'visible', timeout: 20_000 });

    // 5. Screenshots
    await page.screenshot({
      path: 'screenshots/dashboard.png',
      fullPage: true,
    });

    await page.goto(`${BASE_URL}/work-orders`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Work Order/i }).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await page.screenshot({
      path: 'screenshots/work-orders.png',
      fullPage: true,
    });

    await page.goto(`${BASE_URL}/dispatch`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Dispatch/i }).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await page.screenshot({
      path: 'screenshots/dispatch.png',
      fullPage: true,
    });

    await page.goto(`${BASE_URL}/assets`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: /Assets/i }).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    await page.screenshot({
      path: 'screenshots/assets.png',
      fullPage: true,
    });
  });
});
