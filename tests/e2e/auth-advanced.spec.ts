import { test, expect } from '../fixtures/auth-fixture';

/**
 * Advanced Authentication Tests (Happy Paths)
 *
 * Tests using auth fixtures for successful scenarios:
 * - Session management
 * - Form behavior
 * - Accessibility
 */

test.describe('Advanced Authentication Tests', () => {
  test.describe('Using Auth Fixtures', () => {
    test('admin can access users page using authenticatedPage fixture', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/users');

      await expect(authenticatedPage).toHaveURL('/users');
      await expect(authenticatedPage.getByText('Users')).toBeVisible();
    });

    test('authenticated user sees correct UI elements', async ({ authenticatedPage }) => {
      await expect(authenticatedPage.getByText('Hello, Admin User')).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /sign out/i })).toBeVisible();
    });
  });

  test.describe('Using Login Helpers', () => {
    test('loginAsAdmin helper works correctly', async ({ page, loginAsAdmin }) => {
      await loginAsAdmin(page);

      await expect(page).toHaveURL('/');
      await expect(page.getByText('You are signed in as admin@example.com')).toBeVisible();
    });

    test('loginAsAgent helper works correctly', async ({ page, loginAsAgent }) => {
      await loginAsAgent(page);

      await expect(page).toHaveURL('/');
      await expect(page.getByText('You are signed in as agent@example.com')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('session cookie is set after login', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email address').fill('admin@example.com');
      await page.getByLabel('Password').fill('TestPassword123!');
      await page.getByRole('button', { name: /sign in/i }).click();

      await page.waitForURL('/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL('/');

      const cookies = await page.context().cookies();
      const authCookie = cookies.find(
        (cookie) => cookie.name.includes('auth') || cookie.name.includes('session'),
      );
      expect(authCookie).toBeDefined();
    });

    test('session is cleared after logout', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email address').fill('admin@example.com');
      await page.getByLabel('Password').fill('TestPassword123!');
      await page.getByRole('button', { name: /sign in/i }).click();

      await page.waitForURL('/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL('/');

      await page.getByRole('button', { name: /sign out/i }).click();
      await page.waitForURL('/login', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL('/login');

      const cookies = await page.context().cookies();
      const authCookie = cookies.find(
        (cookie) => cookie.name.includes('auth') || cookie.name.includes('session'),
      );
      expect(authCookie).toBeUndefined();
    });
  });

  test.describe('Form Behavior', () => {
    test('password field is masked', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('email field has correct autocomplete', async ({ page }) => {
      await page.goto('/login');

      const emailInput = page.getByLabel('Email address');
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    test('password field has correct autocomplete', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.getByLabel('Password');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });

  test.describe('Accessibility', () => {
    test('login form has proper labels', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByLabel('Email address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
    });

    test('buttons have descriptive text', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('demo credentials section is accessible', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByText('Demo credentials')).toBeVisible();
      await expect(page.getByText('admin@example.com')).toBeVisible();
    });
  });

  test.describe('URL Navigation', () => {
    test('login page is accessible at /login', async ({ page }) => {
      await page.goto('/login');
      await expect(page).toHaveURL('/login');
    });

    test('access denied page is accessible', async ({ page }) => {
      await page.goto('/access-denied');
      await expect(page).toHaveURL('/access-denied');
      await expect(page.getByText('Access Denied')).toBeVisible();
    });
  });
});
