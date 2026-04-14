import { test, expect } from '../fixtures/auth-fixture';
import type { Page, APIRequestContext } from '@playwright/test';

/**
 * E2E Tests for Ticket Detail Page
 *
 * Tests cover integration-level flows that unit tests cannot verify:
 * - Navigation from tickets list to detail and back
 * - Full page rendering with real data (ticket info, messages, reply form)
 * - Reply submission end-to-end (fill form → submit → message appears in thread)
 * - Status/Category updates via dropdowns (select → API call → UI update)
 */

const BACKEND_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3001';

const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'TestPassword123!',
};

/**
 * Helper: Login via UI
 */
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { waitUntil: 'domcontentloaded' });
}

/**
 * Helper: Sign in via API and return session cookies
 */
async function getAuthCookies(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string[]> {
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
 * Helper: Create a ticket via API
 */
async function createTestTicket(
  request: APIRequestContext,
  cookies: string[],
  overrides: {
    subject?: string;
    description?: string;
    emailFrom?: string;
    senderName?: string;
    status?: string;
    category?: string;
  } = {}
) {
  const ticketData = {
    subject: overrides.subject || `E2E Ticket ${Date.now()}`,
    description: overrides.description || 'E2E test description',
    emailFrom: overrides.emailFrom || 'e2e@example.com',
    senderName: overrides.senderName || 'E2E User',
    emailTo: 'support@helpdesk.com',
    status: overrides.status || 'OPEN',
    category: overrides.category || null,
  };

  const response = await request.post(`${BACKEND_URL}/api/tickets`, {
    data: ticketData,
    headers: {
      Cookie: cookies.map((c) => c.split(';')[0]).join('; '),
      'Content-Type': 'application/json',
    },
  });

  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Helper: Add a message to a ticket via API
 */
async function addTestMessage(
  request: APIRequestContext,
  cookies: string[],
  ticketId: string,
  overrides: {
    from?: string;
    to?: string;
    subject?: string;
    body?: string;
    senderType?: string;
  } = {}
) {
  const messageData = {
    from: overrides.from || 'customer@example.com',
    to: overrides.to || 'support@helpdesk.com',
    subject: overrides.subject || 'Test message',
    body: overrides.body || 'Test message body',
    senderType: overrides.senderType || 'CUSTOMER',
  };

  const response = await request.post(`${BACKEND_URL}/api/tickets/${ticketId}/messages`, {
    data: messageData,
    headers: {
      Cookie: cookies.map((c) => c.split(';')[0]).join('; '),
      'Content-Type': 'application/json',
    },
  });

  expect(response.ok()).toBeTruthy();
  return await response.json();
}

test.describe('Ticket Detail Page - Navigation', () => {
  test('navigates from tickets list to detail and back', async ({ authenticatedPage: page }) => {
    await page.goto('/tickets');
    await expect(page.getByRole('main').getByText('Tickets')).toBeVisible();

    // Click on the first ticket row and wait for navigation
    const firstRow = page.getByRole('row').nth(1);
    const ticketIdText = await firstRow.getByRole('cell').first().textContent();
    await firstRow.click();

    // Should navigate to detail page
    await page.waitForURL(/\/tickets\/\d+/, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toContainText('Ticket #');

    // Click back button
    await page.getByRole('button', { name: 'Back' }).click();

    // Should return to tickets list
    await page.waitForURL('/tickets', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('main').getByText('Tickets')).toBeVisible();
  });
});

test.describe('Ticket Detail Page - Full Page Integration', () => {
  let authCookies: string[];

  test.beforeAll(async ({ request }) => {
    authCookies = await getAuthCookies(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  });

  test('displays ticket details, message thread, and reply form', async ({
    page,
    request,
  }) => {
    const ticket = await createTestTicket(request, authCookies, {
      subject: 'E2E Integration Test Ticket',
      description: 'This is the ticket description for E2E testing',
      senderName: 'Integration Tester',
      emailFrom: 'integration@example.com',
    });

    await addTestMessage(request, authCookies, ticket.id, {
      from: 'integration@example.com',
      subject: 'Initial inquiry',
      body: 'I need help with this issue.',
      senderType: 'CUSTOMER',
    });

    await addTestMessage(request, authCookies, ticket.id, {
      from: 'agent@helpdesk.com',
      subject: 'Re: Initial inquiry',
      body: 'I am looking into this for you.',
      senderType: 'AGENT',
    });

    await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify ticket header
    await expect(page.locator('h1')).toContainText(`Ticket #${ticket.id}`);

    // Verify ticket details
    await expect(page.getByText('Integration Tester')).toBeVisible();
    await expect(page.getByText('integration@example.com').first()).toBeVisible();
    await expect(page.getByText('This is the ticket description for E2E testing')).toBeVisible();

    // Verify message thread
    await expect(page.getByText('Message Thread')).toBeVisible();
    await expect(page.getByText('I need help with this issue.')).toBeVisible();
    await expect(page.getByText('I am looking into this for you.')).toBeVisible();

    // Verify reply form
    await expect(page.getByText('Reply to Customer').first()).toBeVisible();
    await expect(page.getByPlaceholder('Type your reply...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Reply' })).toBeVisible();
  });

  test('submits a reply and verifies it appears in the thread', async ({ page, request }) => {
    const ticket = await createTestTicket(request, authCookies, {
      subject: 'E2E Reply Test',
      description: 'Testing reply submission',
      senderName: 'Reply Tester',
      emailFrom: 'reply@example.com',
    });

    await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForLoadState('domcontentloaded');

    // Fill and submit reply
    const replyTextarea = page.getByPlaceholder('Type your reply...');
    await replyTextarea.fill('This is an E2E test reply');

    await page.getByRole('button', { name: 'Send Reply' }).click();

    // Wait for reply to appear in thread
    await expect(page.getByText('This is an E2E test reply')).toBeVisible();

    // Verify form was reset
    await expect(replyTextarea).toHaveValue('');
  });
});

test.describe('Ticket Detail Page - Update Ticket', () => {
  let authCookies: string[];

  test.beforeAll(async ({ request }) => {
    authCookies = await getAuthCookies(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  });

  test('updates ticket status via dropdown', async ({ page, request }) => {
    const ticket = await createTestTicket(request, authCookies, {
      subject: 'E2E Status Update Test',
      status: 'OPEN',
    });

    await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForLoadState('domcontentloaded');

    // Open status dropdown and select Resolved
    const statusTrigger = page.getByLabel('Update status');
    await statusTrigger.click();

    await page.getByRole('option', { name: 'Resolved' }).click();

    // Verify status updated (dropdown should show new value)
    await expect(statusTrigger).toContainText('Resolved');
  });

  test('updates ticket category via dropdown', async ({ page, request }) => {
    const ticket = await createTestTicket(request, authCookies, {
      subject: 'E2E Category Update Test',
      category: null,
    });

    await login(page, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForLoadState('domcontentloaded');

    // Open category dropdown and select Technical
    const categoryTrigger = page.getByLabel('Update category');
    await categoryTrigger.click();

    await page.getByRole('option', { name: 'Technical' }).click();

    // Verify category updated
    await expect(categoryTrigger).toContainText('Technical');
  });
});

test.describe('Ticket Detail Page - Agent Access', () => {
  test('agent can access ticket detail page', async ({ page, request }) => {
    const cookies = await getAuthCookies(request, 'agent@example.com', 'TestPassword123!');
    const ticket = await createTestTicket(request, cookies, {
      subject: 'Agent Access Test',
    });

    await login(page, 'agent@example.com', 'TestPassword123!');
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1')).toContainText('Ticket #');
    await expect(page.getByText('Agent Access Test')).toBeVisible();
  });
});
