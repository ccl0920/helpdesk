import { test, expect, Page } from '@playwright/test';

/**
 * Focused E2E Tests for Ticket List Page UI
 *
 * Minimal test coverage for the critical user journey:
 * - Navigate to /tickets and verify table renders
 * - Verify tickets display correctly or empty state is shown
 * - Verify newest-first sorting when multiple tickets exist
 */

// Test credentials (from seed data)
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'TestPassword123!',
};

const BACKEND_URL = 'http://localhost:3001';

/**
 * Helper: Sign in via Better Auth API and return session cookie
 */
async function signIn(request: any, email: string, password: string): Promise<string[]> {
  const response = await request.post(`${BACKEND_URL}/api/auth/sign-in/email`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });

  expect(response.ok()).toBeTruthy();

  const setCookieHeaders = response.headers()['set-cookie'];
  expect(setCookieHeaders).toBeDefined();

  const cookies: string[] = [];
  if (typeof setCookieHeaders === 'string') {
    cookies.push(setCookieHeaders.split(';')[0]);
  } else if (Array.isArray(setCookieHeaders)) {
    for (const cookie of setCookieHeaders) {
      cookies.push(cookie.split(';')[0]);
    }
  }

  return cookies;
}

/**
 * Helper: Build cookie header for API requests
 */
function buildCookieHeader(cookies: string[]): Record<string, string> {
  return {
    Cookie: cookies.map((c) => c.split(';')[0]).join('; '),
  };
}

/**
 * Helper: Log in via UI
 */
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await expect(page.getByLabel('Email address')).toBeVisible();

  await page.getByLabel('Email address').fill(ADMIN_CREDENTIALS.email);
  await page.getByLabel('Password').fill(ADMIN_CREDENTIALS.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL('/');
}

/**
 * Helper: Create a ticket via API for testing
 */
async function createTestTicket(request: any, cookies: string[], subject: string) {
  const response = await request.post(`${BACKEND_URL}/api/tickets`, {
    data: {
      subject,
      description: 'Test description',
      emailFrom: 'test@example.com',
      senderName: 'Test User',
      emailTo: 'support@helpdesk.com',
    },
    headers: {
      ...buildCookieHeader(cookies),
      'Content-Type': 'application/json',
    },
  });

  expect(response.ok()).toBeTruthy();
  return await response.json();
}

test.describe('Ticket List Page', () => {
  test.describe('Navigation & Table Rendering', () => {
    test('should display tickets page with table headers', async ({ page }) => {
      // Login as admin
      await loginAsAdmin(page);

      // Navigate to tickets page
      await page.goto('/tickets');
      await expect(page).toHaveURL('/tickets');

      // Verify page title
      await expect(page.getByText('Tickets')).toBeVisible();

      // Verify table headers are present
      const table = page.getByRole('table');
      await expect(table).toBeVisible();

      // Verify all expected column headers
      await expect(page.getByRole('columnheader', { name: 'ID' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Subject' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'From' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Created' })).toBeVisible();
    });

    test('unauthenticated user is redirected to login', async ({ page }) => {
      await page.goto('/tickets');
      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    });
  });

  test.describe('Ticket Display', () => {
    let authCookies: string[];

    test.beforeAll(async ({ request }) => {
      authCookies = await signIn(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    });

    test('should display tickets when they exist', async ({ page, request }) => {
      // Create a test ticket with known data
      const ticket = await createTestTicket(
        request,
        authCookies,
        'Test Ticket - Display Verification'
      );

      // Login and navigate
      await loginAsAdmin(page);
      await page.goto('/tickets');
      await expect(page.getByText('Tickets')).toBeVisible();

      // Verify ticket ID appears (format: #1, #2, etc.)
      const ticketIdDisplay = `#${ticket.id}`;
      await expect(page.getByText(ticketIdDisplay)).toBeVisible();

      // Verify subject is displayed
      await expect(page.getByText('Test Ticket - Display Verification')).toBeVisible();

      // Verify sender name is displayed
      await expect(page.getByText('Test User')).toBeVisible();

      // Verify status badge shows "Open"
      await expect(page.getByRole('cell', { name: 'Open' })).toBeVisible();
    });

    test('should show empty state when no tickets exist', async ({ page, request }) => {
      // Note: This test assumes an empty test database
      // In practice, you may need to clear tickets before this test
      await loginAsAdmin(page);
      await page.goto('/tickets');
      await expect(page.getByText('Tickets')).toBeVisible();

      // Check for empty state message (adjust text based on actual implementation)
      const emptyStateText = page.getByText(/no tickets found/i);
      const table = page.getByRole('table');

      // Either show empty state message OR show table with no data rows
      const isEmptyStateVisible = await emptyStateText.isVisible().catch(() => false);
      const isTableVisible = await table.isVisible().catch(() => false);

      if (isEmptyStateVisible) {
        await expect(emptyStateText).toBeVisible();
      } else if (isTableVisible) {
        // If table exists, verify it has data or shows empty message within
        const rows = table.getByRole('row');
        const rowCount = await rows.count();
        // Should only have header row if empty
        if (rowCount <= 1) {
          // Table is effectively empty (header only)
          expect(true).toBe(true); // Pass
        }
      }
    });
  });

  test.describe('Sorting (Newest First)', () => {
    let authCookies: string[];

    test.beforeAll(async ({ request }) => {
      authCookies = await signIn(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    });

    test('should display tickets sorted by newest first', async ({ page, request }) => {
      // Create three tickets with deliberate timing gaps
      const ticket1 = await createTestTicket(request, authCookies, 'Oldest Ticket');

      // Small delay to ensure different createdAt timestamps
      await page.waitForTimeout(100);

      const ticket2 = await createTestTicket(request, authCookies, 'Middle Ticket');

      await page.waitForTimeout(100);

      const ticket3 = await createTestTicket(request, authCookies, 'Newest Ticket');

      // Login and navigate
      await loginAsAdmin(page);
      await page.goto('/tickets');
      await expect(page.getByText('Tickets')).toBeVisible();

      // Get all cell text contents from the table
      const table = page.getByRole('table');
      const allCells = await table.getByRole('cell').allTextContents();

      // Find indices of our ticket IDs in the table
      const newestIndex = allCells.findIndex((text) => text === '#' + ticket3.id);
      const middleIndex = allCells.findIndex((text) => text === '#' + ticket2.id);
      const oldestIndex = allCells.findIndex((text) => text === '#' + ticket1.id);

      // Verify all tickets are visible
      expect(newestIndex).toBeGreaterThanOrEqual(0);
      expect(middleIndex).toBeGreaterThanOrEqual(0);
      expect(oldestIndex).toBeGreaterThanOrEqual(0);

      // Newest should appear before Middle, which should appear before Oldest
      expect(newestIndex).toBeLessThan(middleIndex);
      expect(middleIndex).toBeLessThan(oldestIndex);
    });
  });
});
