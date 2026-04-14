import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for User Deletion & Ticket Unassignment
 *
 * Tests the core functionality:
 * - When an agent user is deleted, their assigned tickets become unassigned
 */

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
 * Helper: Create a user via API
 */
async function createUserViaApi(request: any, cookies: string[], name: string, email: string, password: string, role: string = 'AGENT') {
  const response = await request.post(`${BACKEND_URL}/api/admin/users`, {
    data: { name, email, password, role },
    headers: {
      ...buildCookieHeader(cookies),
      'Content-Type': 'application/json',
    },
  });

  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Helper: Create a ticket via API
 */
async function createTicketViaApi(request: any, cookies: string[], subject: string, assignedToId?: string | null) {
  const data: any = {
    subject,
    description: 'Test description',
    emailFrom: 'test@example.com',
    senderName: 'Test User',
    emailTo: 'support@helpdesk.com',
  };

  const response = await request.post(`${BACKEND_URL}/api/tickets`, {
    data,
    headers: {
      ...buildCookieHeader(cookies),
      'Content-Type': 'application/json',
    },
  });

  expect(response.ok()).toBeTruthy();
  const ticket = await response.json();
  
  // If assignedToId is provided, update the ticket to assign it
  if (assignedToId) {
    const updateResponse = await request.put(`${BACKEND_URL}/api/tickets/${ticket.id}`, {
      data: { assignedToId },
      headers: {
        ...buildCookieHeader(cookies),
        'Content-Type': 'application/json',
      },
    });
    expect(updateResponse.ok()).toBeTruthy();
    return await updateResponse.json();
  }
  
  return ticket;
}

/**
 * Helper: Delete a user via API
 */
async function deleteUserViaApi(request: any, cookies: string[], userId: string) {
  const response = await request.delete(`${BACKEND_URL}/api/admin/users/${userId}`, {
    headers: buildCookieHeader(cookies),
  });

  expect(response.ok()).toBeTruthy();
  return await response.json();
}

/**
 * Helper: Get ticket by ID
 */
async function getTicketById(request: any, cookies: string[], ticketId: string) {
  const response = await request.get(`${BACKEND_URL}/api/tickets/${ticketId}`, {
    headers: buildCookieHeader(cookies),
  });

  expect(response.ok()).toBeTruthy();
  return await response.json();
}

test.describe('User Deletion & Ticket Unassignment', () => {
  test.describe('Ticket Unassignment', () => {
    test('should unassign tickets when an agent is deleted', async ({ request }) => {
      // 1. Sign in as admin
      const adminCookies = await signIn(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      
      // 2. Create a new agent user
      const agentEmail = `test-agent-${Date.now()}@example.com`;
      const agent = await createUserViaApi(
        request,
        adminCookies,
        'Test Agent',
        agentEmail,
        'TestPassword123!',
        'AGENT'
      );
      
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBe('Test Agent');
      
      // 3. Create a ticket assigned to the agent
      const ticket = await createTicketViaApi(
        request,
        adminCookies,
        'Test Ticket for Deletion',
        agent.id
      );
      
      expect(ticket.id).toBeTruthy();
      expect(ticket.assignedToId).toBe(agent.id);
      
      // 4. Delete the agent user
      const deleteResult = await deleteUserViaApi(request, adminCookies, agent.id);
      expect(deleteResult.message).toBe('User deleted successfully');
      
      // 5. Verify the ticket is now unassigned
      const ticketAfterDelete = await getTicketById(request, adminCookies, ticket.id);
      expect(ticketAfterDelete.assignedToId).toBeNull();
      expect(ticketAfterDelete.assignedTo).toBeNull();
    });

    test('should handle deleting agent with multiple assigned tickets', async ({ request }) => {
      // 1. Sign in as admin
      const adminCookies = await signIn(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      
      // 2. Create a new agent
      const agentEmail = `test-agent-multi-${Date.now()}@example.com`;
      const agent = await createUserViaApi(
        request,
        adminCookies,
        'Test Agent Multi',
        agentEmail,
        'TestPassword123!',
        'AGENT'
      );
      
      // 3. Create multiple tickets assigned to the agent
      const ticketIds = [];
      for (let i = 1; i <= 3; i++) {
        const ticket = await createTicketViaApi(
          request,
          adminCookies,
          `Multi Ticket Test ${i}`,
          agent.id
        );
        ticketIds.push(ticket.id);
      }
      
      // 4. Delete the agent
      const deleteResult = await deleteUserViaApi(request, adminCookies, agent.id);
      expect(deleteResult.message).toBe('User deleted successfully');
      
      // 5. Verify all tickets are unassigned
      for (const ticketId of ticketIds) {
        const ticket = await getTicketById(request, adminCookies, ticketId);
        expect(ticket.assignedToId).toBeNull();
        expect(ticket.assignedTo).toBeNull();
      }
    });

    test('should not affect unassigned tickets when agent is deleted', async ({ request }) => {
      // 1. Sign in as admin
      const adminCookies = await signIn(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
      
      // 2. Create a new agent
      const agentEmail = `test-agent-unassigned-${Date.now()}@example.com`;
      const agent = await createUserViaApi(
        request,
        adminCookies,
        'Test Agent Unassigned',
        agentEmail,
        'TestPassword123!',
        'AGENT'
      );
      
      // 3. Create an unassigned ticket
      const unassignedTicket = await createTicketViaApi(
        request,
        adminCookies,
        'Unassigned Ticket',
        null // No assignment
      );
      
      expect(unassignedTicket.assignedToId).toBeNull();
      
      // 4. Delete the agent
      await deleteUserViaApi(request, adminCookies, agent.id);
      
      // 5. Verify unassigned ticket remains unassigned
      const ticket = await getTicketById(request, adminCookies, unassignedTicket.id);
      expect(ticket.assignedToId).toBeNull();
    });
  });
});
