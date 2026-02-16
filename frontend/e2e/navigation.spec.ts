import { test, expect } from '@playwright/test';

test.describe('Page Load & Navigation', () => {
  test('login page should load without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Page should load without JS errors
    expect(errors.length).toBe(0);
  });

  test('login page should have correct title or heading', async ({ page }) => {
    await page.goto('/login');
    // Check for any heading or branding
    const heading = page.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible();
  });

  test('should render the app root element', async ({ page }) => {
    await page.goto('/login');
    const root = page.locator('#root');
    await expect(root).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('login page should be usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Login form should still be visible
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test('login page should be usable on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test('login page should be usable on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });
});

test.describe('Accessibility Basics', () => {
  test('login page should have form labels or placeholders', async ({ page }) => {
    await page.goto('/login');
    // Every input should have a label, aria-label, or placeholder
    const inputs = page.locator('input:visible');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.getAttribute('aria-label');
      const hasPlaceholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      const labelFor = id ? await page.locator(`label[for="${id}"]`).count() : 0;
      expect(hasLabel || hasPlaceholder || labelFor > 0).toBeTruthy();
    }
  });

  test('login page should have no missing alt text on images', async ({ page }) => {
    await page.goto('/login');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });
});
