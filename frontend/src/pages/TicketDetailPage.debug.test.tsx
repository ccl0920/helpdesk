import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '../test/test-utils';
import { TicketDetailPage } from './TicketDetailPage';
import { TicketStatus, TicketCategory } from '@helpdesk/common';
import type { Ticket } from '@/lib/api';

const mockTicket: Ticket = {
  id: BigInt(1),
  subject: 'Test Ticket',
  description: 'Test description',
  status: TicketStatus.OPEN,
  category: TicketCategory.TECHNICAL_QUESTION,
  emailFrom: 'test@example.com',
  senderName: 'Test User',
  emailTo: 'support@helpdesk.com',
  assignedToId: null,
  assignedTo: null,
  messages: [],
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
};

const server = setupServer(
  http.get('/api/auth/get-session', () => {
    console.log('MSW: /api/auth/get-session called');
    return HttpResponse.json({ session: null, user: null });
  }),
  http.get('/api/tickets/1', () => {
    console.log('MSW: /api/tickets/1 called');
    return HttpResponse.json(mockTicket);
  }),
  http.get('/api/admin/users', () => {
    console.log('MSW: /api/admin/users called');
    return HttpResponse.json([]);
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Debug TicketDetailPage', () => {
  it('should render ticket subject', async () => {
    render(<TicketDetailPage />, { route: '/tickets/1' });
    
    await waitFor(() => {
      console.log('Screen text content:', screen.queryByText('Test Ticket'));
      expect(screen.getByText('Test Ticket')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
