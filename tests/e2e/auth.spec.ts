import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Authentication System
 *
 * Tests the existing authentication features:
 * - Login/logout flow
 * - Protected routes
 * - Role-based access control (Admin/Agent)
 * - Session management
 */

// Test credentials (from seed data)
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'TestPassword123!',
  name: 'Admin User',
  role: 'ADMIN'
};

const AGENT_CREDENTIALS = {
  email: 'agent@example.com',
  password: 'TestPassword123!',
  name: 'Agent User',
  role: 'AGENT'
};

/**
 * Helper function to log in a user
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  
  // Wait for the form to be ready
  await expect(page.getByLabel('Email address')).toBeVisible();
  
  // Fill in the form
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  
  // Submit the form
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for navigation to complete (React Router navigation)
  await page.waitForURL('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL('/');
}

/**
 * Helper function to log out
 */
async function logout(page: Page) {
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL('/login', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL('/login');
}

test.describe('Authentication System', () => {
  test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('should successfully login with valid admin credentials', async ({ page }) => {
      await page.getByLabel('Email address').fill(ADMIN_CREDENTIALS.email);
      await page.getByLabel('Password').fill(ADMIN_CREDENTIALS.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      await page.waitForURL('/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL('/');
      await expect(page.getByText(`You are signed in as ${ADMIN_CREDENTIALS.email}`)).toBeVisible();
      await expect(page.getByText(`Hello, ${ADMIN_CREDENTIALS.name}`)).toBeVisible();
    });

    test('should successfully login with valid agent credentials', async ({ page }) => {
      await page.getByLabel('Email address').fill(AGENT_CREDENTIALS.email);
      await page.getByLabel('Password').fill(AGENT_CREDENTIALS.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      await page.waitForURL('/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL('/');
      await expect(page.getByText(`You are signed in as ${AGENT_CREDENTIALS.email}`)).toBeVisible();
      await expect(page.getByText(`Hello, ${AGENT_CREDENTIALS.name}`)).toBeVisible();
    });

    test('should persist session on page refresh', async ({ page }) => {
      await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await page.reload();

      await expect(page).toHaveURL('/');
      await expect(page.getByText(`You are signed in as ${ADMIN_CREDENTIALS.email}`)).toBeVisible();
    });
  });

  test.describe('Login Validation & Error States', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('should show error when email field is empty', async ({ page }) => {
      await page.getByLabel('Password').fill(ADMIN_CREDENTIALS.password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await expect(page.getByText('Email is required', { exact: true })).toBeVisible();
      await expect(page).toHaveURL('/login');
    });

    test('should show error when password field is empty', async ({ page }) => {
      await page.getByLabel('Email address').fill(ADMIN_CREDENTIALS.email);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await expect(page.getByText('Password is required', { exact: true })).toBeVisible();
      await expect(page).toHaveURL('/login');
    });

    test('should show error when email format is invalid', async ({ page }) => {
      await page.getByLabel('Email address').fill('invalid-email');
      await page.getByLabel('Password').fill(ADMIN_CREDENTIALS.password);
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
      await expect(page).toHaveURL('/login');
    });

    test('should show error when credentials are invalid', async ({ page }) => {
      await page.getByLabel('Email address').fill('nonexistent@example.com');
      await page.getByLabel('Password').fill('WrongPassword123!');
      await page.getByRole('button', { name: 'Sign in' }).click();

      await expect(page.getByRole('alert').first()).toBeVisible();
      await expect(page.getByText('Invalid email or password')).toBeVisible();
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Logout Flow', () => {
    test('should clear session and redirect to login', async ({ page }) => {
      await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await logout(page);

      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    });

    test('should not allow access to protected routes after logout', async ({ page }) => {
      await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await logout(page);
      await page.goto('/');

      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login page', async ({ page }) => {
      await page.goto('/');

      await expect(page).toHaveURL('/login');
    });

    test('should allow authenticated users to access home page', async ({ page }) => {
      await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await page.goto('/');

      await expect(page).toHaveURL('/');
      await expect(page.getByText('Welcome to Helpdesk')).toBeVisible();
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('admin can access /users page', async ({ page }) => {
      await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await page.goto('/users');

      await expect(page).toHaveURL('/users');
      await expect(page.getByText('Users')).toBeVisible();
    });

    test('agent cannot access /users page - redirected to access denied', async ({ page }) => {
      await login(page, AGENT_CREDENTIALS.email, AGENT_CREDENTIALS.password);
      await page.goto('/users');

      await expect(page).toHaveURL('/access-denied');
      await expect(page.getByText('Access Denied')).toBeVisible();
      await expect(page.getByText("You don't have permission to access this page")).toBeVisible();
    });

    test('unauthenticated user cannot access /users page', async ({ page }) => {
      await page.goto('/users');

      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Edge Cases', () => {
    test('browser back button after logout should not show protected page', async ({ page }) => {
      await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await page.goto('/');
      await logout(page);
      await page.goBack();

      await expect(page).toHaveURL('/login');
    });

    test('direct URL access to protected route redirects to login', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL('/login');
    });

    test('demo credentials are shown in development', async ({ page }) => {
      await page.goto('/login');

      await expect(page.getByText('Demo credentials')).toBeVisible();
      await expect(page.getByText('admin@example.com')).toBeVisible();
    });
  });

  test.describe('Navigation and UI', () => {
    test('navbar shows Sign Out button when authenticated', async ({ page }) => {
      await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    });

    test('navbar shows user greeting when authenticated', async ({ page }) => {
      await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      await expect(page.getByText(`Hello, ${ADMIN_CREDENTIALS.name}`)).toBeVisible();
    });

    test('access denied page has correct actions', async ({ page }) => {
      await login(page, AGENT_CREDENTIALS.email, AGENT_CREDENTIALS.password);
      await page.goto('/users');

      await expect(page).toHaveURL('/access-denied');
      await expect(page.getByRole('button', { name: 'Go Home' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
    });
  });
});
