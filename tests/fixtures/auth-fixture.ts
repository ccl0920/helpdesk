import { test as base, expect, Page } from '@playwright/test';

/**
 * Test fixtures for authentication
 *
 * Usage:
 * import { test } from '../fixtures/auth-fixture';
 *
 * test('example', async ({ authenticatedPage }) => {
 *   // Already logged in as admin
 * });
 */

// Test credentials (from seed data)
export const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'TestPassword123!',
  name: 'Admin User',
  role: 'ADMIN'
};

export const AGENT_CREDENTIALS = {
  email: 'agent@example.com',
  password: 'TestPassword123!',
  name: 'Agent User',
  role: 'AGENT'
};

/**
 * Helper function to log in a user
 */
export async function login(page: Page, email: string, password: string) {
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
export async function logout(page: Page) {
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL('/login', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL('/login');
}

/**
 * Extend the base test with authentication fixtures
 */
export const test = base.extend<{
  authenticatedPage: Page;
  agentAuthenticatedPage: Page;
  loginAsAdmin: (page: Page) => Promise<void>;
  loginAsAgent: (page: Page) => Promise<void>;
}>({
  // Page already authenticated as admin
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as admin
    await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

    await use(page);

    await context.close();
  },

  // Page already authenticated as agent
  agentAuthenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login as agent
    await login(page, AGENT_CREDENTIALS.email, AGENT_CREDENTIALS.password);

    await use(page);

    await context.close();
  },

  // Login helper for admin
  loginAsAdmin: async ({ page }, use) => {
    await use(async (page: Page) => {
      await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    });
  },

  // Login helper for agent
  loginAsAgent: async ({ page }, use) => {
    await use(async (page: Page) => {
      await login(page, AGENT_CREDENTIALS.email, AGENT_CREDENTIALS.password);
    });
  },
});

export { expect };
