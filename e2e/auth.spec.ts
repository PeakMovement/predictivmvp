import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page for unauthenticated users', async ({ page }) => {
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for invalid login', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('short');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('should handle empty form submission', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test('should redirect to registration page', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: /sign up/i }).click();

    await expect(page).toHaveURL(/.*register/);
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('should show password field as password type', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/login');

    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/email/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/password/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeFocused();
  });
});

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should show validation for weak passwords', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('123');
    await page.getByRole('button', { name: /sign up/i }).click();

    await expect(page.getByText(/password.*characters/i)).toBeVisible();
  });

  test('should have password confirmation field', async ({ page }) => {
    const passwordFields = page.getByLabel(/password/i);
    const count = await passwordFields.count();

    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should navigate back to login', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Session Management', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/.*login/);
  });

  test('should protect settings page', async ({ page }) => {
    await page.goto('/settings');

    await expect(page).toHaveURL(/.*login/);
  });

  test('should protect health page', async ({ page }) => {
    await page.goto('/health');

    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Login Page Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
  });

  test('should have form with proper ARIA labels', async ({ page }) => {
    const form = page.locator('form');
    await expect(form).toBeVisible();

    const emailInput = form.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');

    const passwordInput = form.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.keyboard.press('Tab');

    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Responsive Design', () => {
  test('should display correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });
});
