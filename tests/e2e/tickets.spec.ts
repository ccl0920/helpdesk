import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * E2E Tests for Ticket API & Email-to-Ticket Flow
 *
 * Tests cover:
 * - Webhook email-to-ticket flow (creation, deduplication, reply threading)
 * - Manual ticket creation (authenticated/unauthenticated)
 * - Ticket listing with pagination and filtering
 * - Ticket detail retrieval
 * - Ticket updates (status, category, assignment)
 * - Adding messages to tickets
 *
 * All API tests use Playwright's request fixture for HTTP calls.
 * Authentication is handled via Better Auth session cookies.
 */

// Test credentials (from seed data)
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'TestPassword123!',
};

const AGENT_CREDENTIALS = {
  email: 'agent@example.com',
  password: 'TestPassword123!',
};

// Backend URL (from playwright.config.ts webServer)
const BACKEND_URL = 'http://localhost:3001';

/**
 * Helper: Sign in via Better Auth API and return session cookie
 */
async function signIn(request: APIRequestContext, email: string, password: string): Promise<string[]> {
  const response = await request.post(`${BACKEND_URL}/api/auth/sign-in/email`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  });

  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);

  // Extract session cookies from response
  const setCookieHeaders = response.headers()['set-cookie'];
  expect(setCookieHeaders).toBeDefined();

  // Parse set-cookie header(s) - can be string or array
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
 * Helper: Generate a unique email payload to avoid cross-test interference
 */
function generateEmailPayload(suffix: string) {
  const timestamp = Date.now();
  return {
    from: `customer-${timestamp}@example.com`,
    senderName: `Customer ${timestamp}`,
    to: 'support@helpdesk.com',
    subject: `Test Issue - ${suffix}`,
    body: `This is a test email body for: ${suffix}`,
    bodyHtml: `<p>This is a test email body for: ${suffix}</p>`,
    messageId: `<test-${timestamp}-${suffix}@example.com>`,
  };
}

test.describe('Ticket API', () => {
  let authCookies: string[];
  let adminUserId: string;

  test.beforeAll(async ({ request }) => {
    // Sign in as admin to get authenticated session
    authCookies = await signIn(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);

    // Fetch admin user ID for assignment tests
    const meResponse = await request.get(`${BACKEND_URL}/api/auth/get-session`, {
      headers: buildCookieHeader(authCookies),
    });
    if (meResponse.ok()) {
      const session = await meResponse.json();
      adminUserId = session.user?.id;
    }
  });

  test.describe('Webhook Email-to-Ticket Flow', () => {
    test('webhook with parsed email creates a new ticket', async ({ request }) => {
      const email = generateEmailPayload('webhook-create');

      // Send webhook with Mailgun-style parsed email payload (form-encoded)
      const response = await request.post(`${BACKEND_URL}/api/email/webhook`, {
        form: {
          from: email.from,
          to: email.to,
          subject: email.subject,
          'body-plain': email.body,
          'body-html': email.bodyHtml,
          'Message-Id': email.messageId,
        },
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.isNew).toBe(true);
      expect(body.ticket).toBeDefined();
      expect(body.ticket.subject).toBe(email.subject);
      expect(body.ticket.status).toBe('OPEN');

      // Verify ticket exists via GET endpoint
      const ticketResponse = await request.get(
        `${BACKEND_URL}/api/tickets/${body.ticket.id}`,
        { headers: buildCookieHeader(authCookies) }
      );
      expect(ticketResponse.ok()).toBeTruthy();

      const ticket = await ticketResponse.json();
      expect(ticket.subject).toBe(email.subject);
      expect(ticket.description).toBe(email.body);
      expect(ticket.emailFrom).toBe(email.from);
      expect(ticket.emailTo).toBe(email.to);
      expect(ticket.status).toBe('OPEN');
      expect(ticket.messages).toBeDefined();
      expect(ticket.messages.length).toBeGreaterThanOrEqual(1);
    });

    test('webhook with generic JSON payload creates ticket', async ({ request }) => {
      const email = generateEmailPayload('generic-webhook');

      const response = await request.post(`${BACKEND_URL}/api/email/webhook`, {
        data: {
          from: email.from,
          to: email.to,
          subject: email.subject,
          body: email.body,
          bodyHtml: email.bodyHtml,
          messageId: email.messageId,
        },
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.isNew).toBe(true);
      expect(body.ticket.subject).toBe(email.subject);
    });

    test('duplicate email (same Message-ID) is ignored', async ({ request }) => {
      const email = generateEmailPayload('duplicate-test');

      // First webhook - should create ticket
      const response1 = await request.post(`${BACKEND_URL}/api/email/webhook`, {
        form: {
          from: email.from,
          to: email.to,
          subject: email.subject,
          'body-plain': email.body,
          'Message-Id': email.messageId,
        },
      });

      expect(response1.ok()).toBeTruthy();
      const body1 = await response1.json();
      expect(body1.isNew).toBe(true);
      const ticketId = body1.ticket.id;

      // Second webhook with same Message-ID - should be ignored
      const response2 = await request.post(`${BACKEND_URL}/api/email/webhook`, {
        form: {
          from: email.from,
          to: email.to,
          subject: email.subject,
          'body-plain': 'This should not create a new ticket',
          'Message-Id': email.messageId, // Same Message-ID
        },
      });

      expect(response2.ok()).toBeTruthy();
      const body2 = await response2.json();
      expect(body2.success).toBe(true);
      expect(body2.isNew).toBe(false); // Not a new ticket
      expect(body2.ticket.id).toBe(ticketId); // Same ticket

      // Verify only one message in ticket (the original)
      const ticketResponse = await request.get(
        `${BACKEND_URL}/api/tickets/${ticketId}`,
        { headers: buildCookieHeader(authCookies) }
      );
      const ticket = await ticketResponse.json();
      // Should still have only the first message
      expect(ticket.messages.length).toBe(1);
      expect(ticket.messages[0].body).toBe(email.body);
    });

    test('reply email (In-Reply-To) appends to existing ticket', async ({ request }) => {
      const originalEmail = generateEmailPayload('reply-original');

      // First email - creates ticket
      const createResponse = await request.post(`${BACKEND_URL}/api/email/webhook`, {
        form: {
          from: originalEmail.from,
          to: originalEmail.to,
          subject: originalEmail.subject,
          'body-plain': originalEmail.body,
          'Message-Id': originalEmail.messageId,
        },
      });

      const createBody = await createResponse.json();
      const ticketId = createBody.ticket.id;

      // Reply email - should append to existing ticket
      const replyEmail = {
        from: originalEmail.from,
        to: originalEmail.to,
        subject: `Re: ${originalEmail.subject}`,
        body: 'This is a reply to the original ticket.',
        messageId: `<reply-${Date.now()}@example.com>`,
        inReplyTo: originalEmail.messageId,
      };

      const replyResponse = await request.post(`${BACKEND_URL}/api/email/webhook`, {
        form: {
          from: replyEmail.from,
          to: replyEmail.to,
          subject: replyEmail.subject,
          'body-plain': replyEmail.body,
          'Message-Id': replyEmail.messageId,
          'In-Reply-To': replyEmail.inReplyTo,
        },
      });

      expect(replyResponse.ok()).toBeTruthy();
      const replyBody = await replyResponse.json();
      expect(replyBody.success).toBe(true);
      expect(replyBody.isNew).toBe(false); // Not a new ticket
      expect(replyBody.ticket.id).toBe(ticketId); // Same ticket

      // Verify message was appended
      const ticketResponse = await request.get(
        `${BACKEND_URL}/api/tickets/${ticketId}`,
        { headers: buildCookieHeader(authCookies) }
      );
      const ticket = await ticketResponse.json();
      expect(ticket.messages.length).toBe(2);
      expect(ticket.messages[1].body).toBe(replyEmail.body);
      expect(ticket.messages[1].subject).toBe(replyEmail.subject);
    });

    test('webhook with unsupported payload returns 400', async ({ request }) => {
      const response = await request.post(`${BACKEND_URL}/api/email/webhook`, {
        data: {
          unsupportedField: 'some value',
        },
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Unsupported payload format');
    });
  });

  test.describe('Manual Ticket Creation', () => {
    test('authenticated user can create a ticket via POST /api/tickets', async ({ request }) => {
      const ticketData = {
        subject: 'Manual Test Ticket',
        description: 'This ticket was created manually for testing.',
        emailFrom: 'testuser@example.com',
        senderName: 'Test User',
        emailTo: 'support@helpdesk.com',
        category: 'TECHNICAL_QUESTION',
      };

      const response = await request.post(`${BACKEND_URL}/api/tickets`, {
        data: ticketData,
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(201);

      const ticket = await response.json();
      expect(ticket.subject).toBe(ticketData.subject);
      expect(ticket.description).toBe(ticketData.description);
      expect(ticket.emailFrom).toBe(ticketData.emailFrom);
      expect(ticket.status).toBe('OPEN');
      expect(ticket.category).toBe('TECHNICAL_QUESTION');
      expect(ticket.messages).toBeDefined();
      expect(ticket.messages.length).toBeGreaterThanOrEqual(1);
    });

    test('unauthenticated user gets 401 when creating ticket', async ({ request }) => {
      const ticketData = {
        subject: 'Unauthorized Ticket',
        description: 'This should fail.',
        emailFrom: 'unauthorized@example.com',
        emailTo: 'support@helpdesk.com',
      };

      const response = await request.post(`${BACKEND_URL}/api/tickets`, {
        data: ticketData,
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status()).toBe(401);
    });

    test('ticket creation with invalid data returns 400', async ({ request }) => {
      const invalidData = {
        subject: '', // Empty subject should fail validation
        description: 'Some description',
        emailFrom: 'not-an-email', // Invalid email
        senderName: 'Test',
        emailTo: 'support@helpdesk.com',
      };

      const response = await request.post(`${BACKEND_URL}/api/tickets`, {
        data: invalidData,
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('created ticket appears in list endpoint', async ({ request }) => {
      const uniqueSubject = `List Test Ticket ${Date.now()}`;

      // Create ticket
      const createResponse = await request.post(`${BACKEND_URL}/api/tickets`, {
        data: {
          subject: uniqueSubject,
          description: 'Testing list endpoint.',
          emailFrom: 'listtest@example.com',
          senderName: 'List Test User',
          emailTo: 'support@helpdesk.com',
        },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      expect(createResponse.ok()).toBeTruthy();
      const createdTicket = await createResponse.json();

      // Fetch list and verify ticket appears
      const listResponse = await request.get(`${BACKEND_URL}/api/tickets`, {
        headers: buildCookieHeader(authCookies),
      });

      expect(listResponse.ok()).toBeTruthy();
      const list = await listResponse.json();
      expect(list.tickets).toBeDefined();

      // Find the created ticket in the list
      const found = list.tickets.find(
        (t: { subject: string }) => t.subject === uniqueSubject
      );
      expect(found).toBeDefined();
      expect(found.id).toBe(createdTicket.id);
    });
  });

  test.describe('Ticket Listing', () => {
    test('GET /api/tickets returns paginated results', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/tickets`, {
        headers: buildCookieHeader(authCookies),
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.tickets).toBeDefined();
      expect(Array.isArray(body.tickets)).toBe(true);
      expect(body.total).toBeDefined();
      expect(body.page).toBeDefined();
      expect(body.limit).toBeDefined();
      expect(body.totalPages).toBeDefined();
    });

    test('unauthenticated user gets 401 when listing tickets', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/tickets`);
      expect(response.status()).toBe(401);
    });

    test('filtering by status works', async ({ request }) => {
      // Create a ticket with OPEN status (default)
      await request.post(`${BACKEND_URL}/api/tickets`, {
        data: {
          subject: 'Filter Test OPEN Ticket',
          description: 'Testing status filter.',
          emailFrom: 'filter-open@example.com',
          senderName: 'Filter Open User',
          emailTo: 'support@helpdesk.com',
        },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      // Filter by OPEN status
      const response = await request.get(
        `${BACKEND_URL}/api/tickets?status=OPEN`,
        { headers: buildCookieHeader(authCookies) }
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.tickets).toBeDefined();

      // All returned tickets should have OPEN status
      for (const ticket of body.tickets) {
        expect(ticket.status).toBe('OPEN');
      }
    });

    test('filtering by category works', async ({ request }) => {
      // Create a ticket with specific category
      await request.post(`${BACKEND_URL}/api/tickets`, {
        data: {
          subject: 'Category Filter Test',
          description: 'Testing category filter.',
          emailFrom: 'filter-category@example.com',
          senderName: 'Filter Category User',
          emailTo: 'support@helpdesk.com',
          category: 'REFUND_REQUEST',
        },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      // Filter by REFUND_REQUEST category
      const response = await request.get(
        `${BACKEND_URL}/api/tickets?category=REFUND_REQUEST`,
        { headers: buildCookieHeader(authCookies) }
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.tickets).toBeDefined();

      // All returned tickets should have REFUND_REQUEST category
      for (const ticket of body.tickets) {
        expect(ticket.category).toBe('REFUND_REQUEST');
      }
    });

    test('pagination parameters work correctly', async ({ request }) => {
      const response = await request.get(
        `${BACKEND_URL}/api/tickets?page=1&limit=5`,
        { headers: buildCookieHeader(authCookies) }
      );

      expect(response.ok()).toBeTruthy();
      const body = await response.json();
      expect(body.page).toBe(1);
      expect(body.limit).toBe(5);
      expect(body.tickets.length).toBeLessThanOrEqual(5);
    });
  });

  test.describe('Ticket Detail', () => {
    test('GET /api/tickets/:id returns ticket with messages', async ({ request }) => {
      // Create a ticket first
      const createResponse = await request.post(`${BACKEND_URL}/api/tickets`, {
        data: {
          subject: 'Detail Test Ticket',
          description: 'Testing detail endpoint.',
          emailFrom: 'detail-test@example.com',
          senderName: 'Detail Test User',
          emailTo: 'support@helpdesk.com',
        },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      const createdTicket = await createResponse.json();

      // Fetch ticket detail
      const detailResponse = await request.get(
        `${BACKEND_URL}/api/tickets/${createdTicket.id}`,
        { headers: buildCookieHeader(authCookies) }
      );

      expect(detailResponse.ok()).toBeTruthy();
      expect(detailResponse.status()).toBe(200);

      const ticket = await detailResponse.json();
      expect(ticket.id).toBe(createdTicket.id);
      expect(ticket.subject).toBe('Detail Test Ticket');
      expect(ticket.description).toBe('Testing detail endpoint.');
      expect(ticket.status).toBe('OPEN');
      expect(ticket.messages).toBeDefined();
      expect(ticket.messages.length).toBeGreaterThanOrEqual(1);
    });

    test('returns 404 for non-existent ticket', async ({ request }) => {
      // Use a valid BigInt ID that doesn't exist in the database
      const nonExistentId = '999999999';
      const response = await request.get(
        `${BACKEND_URL}/api/tickets/${nonExistentId}`,
        { headers: buildCookieHeader(authCookies) }
      );

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Ticket not found');
    });

    test('unauthenticated user gets 401 when viewing ticket detail', async ({ request }) => {
      const response = await request.get(`${BACKEND_URL}/api/tickets/some-id`);
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Ticket Updates', () => {
    let ticketId: string;

    test.beforeEach(async ({ request }) => {
      // Create a fresh ticket for each update test
      const response = await request.post(`${BACKEND_URL}/api/tickets`, {
        data: {
          subject: `Update Test Ticket ${Date.now()}`,
          description: 'Testing update endpoint.',
          emailFrom: 'update-test@example.com',
          senderName: 'Update Test User',
          emailTo: 'support@helpdesk.com',
        },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const ticket = await response.json();
      ticketId = ticket.id;
    });

    test('can update status from OPEN to RESOLVED', async ({ request }) => {
      const response = await request.put(`${BACKEND_URL}/api/tickets/${ticketId}`, {
        data: { status: 'RESOLVED' },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const ticket = await response.json();
      expect(ticket.status).toBe('RESOLVED');
    });

    test('can update status from RESOLVED to CLOSED', async ({ request }) => {
      // First set to RESOLVED
      await request.put(`${BACKEND_URL}/api/tickets/${ticketId}`, {
        data: { status: 'RESOLVED' },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      // Then set to CLOSED
      const response = await request.put(`${BACKEND_URL}/api/tickets/${ticketId}`, {
        data: { status: 'CLOSED' },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const ticket = await response.json();
      expect(ticket.status).toBe('CLOSED');
    });

    test('can update category', async ({ request }) => {
      const response = await request.put(`${BACKEND_URL}/api/tickets/${ticketId}`, {
        data: { category: 'GENERAL_QUESTION' },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const ticket = await response.json();
      expect(ticket.category).toBe('GENERAL_QUESTION');
    });

    test('can assign ticket to a user', async ({ request }) => {
      const response = await request.put(`${BACKEND_URL}/api/tickets/${ticketId}`, {
        data: { assignedToId: adminUserId },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const ticket = await response.json();
      expect(ticket.assignedToId).toBe(adminUserId);
      expect(ticket.assignedTo).toBeDefined();
      expect(ticket.assignedTo.email).toBe(ADMIN_CREDENTIALS.email);
    });

    test('can unassign a ticket by setting assignedToId to null', async ({ request }) => {
      // First assign
      await request.put(`${BACKEND_URL}/api/tickets/${ticketId}`, {
        data: { assignedToId: adminUserId },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      // Then unassign
      const response = await request.put(`${BACKEND_URL}/api/tickets/${ticketId}`, {
        data: { assignedToId: null },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const ticket = await response.json();
      expect(ticket.assignedToId).toBeNull();
    });

    test('updating non-existent ticket returns 404', async ({ request }) => {
      // Use a valid BigInt ID that doesn't exist in the database
      const nonExistentId = '999999998';
      const response = await request.put(
        `${BACKEND_URL}/api/tickets/${nonExistentId}`,
        {
          data: { status: 'RESOLVED' },
          headers: {
            ...buildCookieHeader(authCookies),
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status()).toBe(404);
    });

    test('unauthenticated user gets 401 when updating ticket', async ({ request }) => {
      const response = await request.put(`${BACKEND_URL}/api/tickets/${ticketId}`, {
        data: { status: 'RESOLVED' },
        headers: { 'Content-Type': 'application/json' },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Adding Messages', () => {
    let ticketId: string;

    test.beforeEach(async ({ request }) => {
      // Create a fresh ticket for each message test
      const response = await request.post(`${BACKEND_URL}/api/tickets`, {
        data: {
          subject: `Message Test Ticket ${Date.now()}`,
          description: 'Original ticket description.',
          emailFrom: 'message-test@example.com',
          senderName: 'Message Test User',
          emailTo: 'support@helpdesk.com',
        },
        headers: {
          ...buildCookieHeader(authCookies),
          'Content-Type': 'application/json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const ticket = await response.json();
      ticketId = ticket.id;
    });

    test('can add message to existing ticket', async ({ request }) => {
      const messageData = {
        from: 'agent@example.com',
        to: 'customer@example.com',
        subject: 'Re: Your ticket update',
        body: 'This is a follow-up message from the agent.',
        bodyHtml: '<p>This is a follow-up message from the agent.</p>',
      };

      const response = await request.post(
        `${BACKEND_URL}/api/tickets/${ticketId}/messages`,
        {
          data: messageData,
          headers: {
            ...buildCookieHeader(authCookies),
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(201);

      const ticket = await response.json();
      expect(ticket.id).toBe(ticketId);
      expect(ticket.messages).toBeDefined();
      expect(ticket.messages.length).toBe(2); // Original + new message

      // Verify the new message details
      const lastMessage = ticket.messages[ticket.messages.length - 1];
      expect(lastMessage.from).toBe(messageData.from);
      expect(lastMessage.to).toBe(messageData.to);
      expect(lastMessage.subject).toBe(messageData.subject);
      expect(lastMessage.body).toBe(messageData.body);
    });

    test('added message appears in ticket detail', async ({ request }) => {
      // Add a message
      await request.post(
        `${BACKEND_URL}/api/tickets/${ticketId}/messages`,
        {
          data: {
            from: 'support@helpdesk.com',
            to: 'customer@example.com',
            subject: 'Follow up',
            body: 'Please provide more details.',
          },
          headers: {
            ...buildCookieHeader(authCookies),
            'Content-Type': 'application/json',
          },
        }
      );

      // Fetch ticket detail and verify message
      const detailResponse = await request.get(
        `${BACKEND_URL}/api/tickets/${ticketId}`,
        { headers: buildCookieHeader(authCookies) }
      );

      expect(detailResponse.ok()).toBeTruthy();
      const ticket = await detailResponse.json();
      expect(ticket.messages.length).toBe(2);

      const lastMessage = ticket.messages[ticket.messages.length - 1];
      expect(lastMessage.body).toBe('Please provide more details.');
      expect(lastMessage.from).toBe('support@helpdesk.com');
    });

    test('adding message to non-existent ticket returns error', async ({ request }) => {
      const response = await request.post(
        `${BACKEND_URL}/api/tickets/non-existent-id/messages`,
        {
          data: {
            from: 'test@example.com',
            to: 'support@helpdesk.com',
            subject: 'Test',
            body: 'This should fail.',
          },
          headers: {
            ...buildCookieHeader(authCookies),
            'Content-Type': 'application/json',
          },
        }
      );

      // The route handler will try to update a non-existent ticket
      expect([404, 500]).toContain(response.status());
    });

    test('unauthenticated user gets 401 when adding message', async ({ request }) => {
      const response = await request.post(
        `${BACKEND_URL}/api/tickets/${ticketId}/messages`,
        {
          data: {
            from: 'test@example.com',
            to: 'support@helpdesk.com',
            subject: 'Test',
            body: 'This should fail.',
          },
          headers: { 'Content-Type': 'application/json' },
        }
      );

      expect(response.status()).toBe(401);
    });

    test('message with invalid data returns 400', async ({ request }) => {
      const response = await request.post(
        `${BACKEND_URL}/api/tickets/${ticketId}/messages`,
        {
          data: {
            from: 'not-an-email', // Invalid email
            to: 'support@helpdesk.com',
            subject: 'Test',
            body: '', // Empty body should fail
          },
          headers: {
            ...buildCookieHeader(authCookies),
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status()).toBe(400);
    });
  });
});
