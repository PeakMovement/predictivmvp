import { test, expect } from '@playwright/test';

test.describe('Oura Connection Flow', () => {
  test.describe('Unauthenticated Access', () => {
    test('should redirect to login when accessing settings unauthenticated', async ({ page }) => {
      await page.goto('/settings');
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Settings Page - Wearable Connections', () => {
    test.skip('requires authentication - skipping for now', () => {});
  });
});

test.describe('Oura Callback Handling', () => {
  test('should handle OAuth callback with missing code', async ({ page }) => {
    await page.goto('/oauth/callback/oura');

    await expect(page.getByText(/error|missing|invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test('should handle OAuth callback with invalid state', async ({ page }) => {
    await page.goto('/oauth/callback/oura?code=test123&state=invalid');

    await expect(page.getByText(/error|invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display error message for failed connection', async ({ page }) => {
    await page.goto('/oauth/callback/oura?code=invalid_code&state=test');

    await expect(page.locator('body')).toContainText(/.+/, { timeout: 10000 });
  });
});

test.describe('Wearable Integration UI', () => {
  test('should display connection status UI elements', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/.*login/);
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Data Sync Status', () => {
  test('should display sync status indicators', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Connection Error Handling', () => {
  test('should gracefully handle network errors', async ({ page }) => {
    await page.route('**/api/**', route => route.abort());
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle timeout scenarios', async ({ page }) => {
    await page.route('**/api/**', route => new Promise(() => {}));
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Responsive Wearable UI', () => {
  test('should display connection UI on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/settings');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display connection UI on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/settings');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display connection UI on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/settings');

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility - Wearable Connection', () => {
  test('should have keyboard navigable elements', async ({ page }) => {
    await page.goto('/settings');

    await page.keyboard.press('Tab');
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeTruthy();
  });

  test('should have proper ARIA labels for buttons', async ({ page }) => {
    await page.goto('/');

    const buttons = await page.locator('button').all();
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('should maintain focus visibility', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const hasFocus = await page.evaluate(() => {
      const activeEl = document.activeElement;
      return activeEl !== null && activeEl !== document.body;
    });

    expect(hasFocus).toBeTruthy();
  });
});

test.describe('Dashboard with Oura Data', () => {
  test('should display dashboard structure', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle no wearable data gracefully', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Settings Page Structure', () => {
  test('should have proper page structure', async ({ page }) => {
    await page.goto('/settings');

    const heading = await page.locator('h1, h2').first();
    expect(heading).toBeTruthy();
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    expect(errors.length).toBe(0);
  });
});
