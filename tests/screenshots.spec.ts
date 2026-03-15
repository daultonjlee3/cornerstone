import { test } from '@playwright/test';

test('capture dashboard full-page screenshot', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: 'screenshots/dashboard.png',
    fullPage: true,
  });
});
