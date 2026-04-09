import { beforeEach, describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '../test/test-utils';
import { TicketsPage } from './TicketsPage';
import { API_BASE_URL } from '../lib/config';
import { TicketStatus, TicketCategory } from '@helpdesk/common';
import type { PaginatedTickets } from '@/lib/api';

// Mock tickets data
const mockTickets: PaginatedTickets = {
  tickets: [
    {
      id: BigInt(1),
      subject: 'Cannot login to my account',
      description: 'I\'m unable to access my account after password reset.',
      status: TicketStatus.OPEN,
      category: TicketCategory.TECHNICAL_QUESTION,
      emailFrom: 'user1@example.com',
      senderName: 'John Doe',
      emailTo: 'support@helpdesk.com',
      assignedToId: null,
      assignedTo: null,
      messages: [],
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
    },
    {
      id: BigInt(2),
      subject: 'Refund request for order #12345',
      description: 'I would like to request a refund for my recent purchase.',
      status: TicketStatus.RESOLVED,
      category: TicketCategory.REFUND_REQUEST,
      emailFrom: 'user2@example.com',
      senderName: 'Jane Smith',
      emailTo: 'support@helpdesk.com',
      assignedToId: 'agent1',
      assignedTo: {
        id: 'agent1',
        name: 'Agent One',
        email: 'agent1@helpdesk.com',
      },
      messages: [],
      createdAt: '2024-02-20T14:15:00Z',
      updatedAt: '2024-02-21T09:00:00Z',
    },
    {
      id: BigInt(3),
      subject: 'General question about pricing',
      description: 'What are your pricing plans?',
      status: TicketStatus.CLOSED,
      category: TicketCategory.GENERAL_QUESTION,
      emailFrom: 'user3@example.com',
      senderName: null,
      emailTo: 'support@helpdesk.com',
      assignedToId: null,
      assignedTo: null,
      messages: [],
      createdAt: '2024-03-10T16:45:00Z',
      updatedAt: '2024-03-11T11:30:00Z',
    },
  ],
  total: 3,
  page: 1,
  limit: 20,
  totalPages: 1,
};

// Mock tickets for pagination testing (with multiple pages)
const mockTicketsMultiPage: PaginatedTickets = {
  ...mockTickets,
  total: 25,
  totalPages: 2,
};

// Mock tickets for page 2 in pagination testing
const mockTicketsPage2: PaginatedTickets = {
  tickets: [
    {
      id: BigInt(4),
      subject: 'How to integrate with Slack?',
      description: 'I need help setting up the Slack integration.',
      status: TicketStatus.OPEN,
      category: null,
      emailFrom: 'user4@example.com',
      senderName: 'Alice Johnson',
      emailTo: 'support@helpdesk.com',
      assignedToId: null,
      assignedTo: null,
      messages: [],
      createdAt: '2024-04-05T08:00:00Z',
      updatedAt: '2024-04-05T08:00:00Z',
    },
  ],
  total: 25,
  page: 2,
  limit: 20,
  totalPages: 2,
};

// Setup MSW server
const server = setupServer(
  http.get(`${API_BASE_URL}/api/auth/get-session`, () => {
    return HttpResponse.json({ session: null, user: null });
  }),
  http.get(`${API_BASE_URL}/api/tickets`, ({ request }) => {
    const url = new URL(request.url, 'http://localhost');
    const page = parseInt(url.searchParams.get('page') || '1');

    if (page === 2) {
      return HttpResponse.json(mockTicketsPage2);
    }
    return HttpResponse.json(mockTickets);
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('TicketsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    render(<TicketsPage />);

    // Should show skeleton while loading
    const skeletons = screen.getAllByRole('row');
    expect(skeletons.length).toBeGreaterThan(1);
  });

  it('renders tickets data after successful fetch', async () => {
    render(<TicketsPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Cannot login to my account')).toBeInTheDocument();
    });

    // Check all tickets are rendered
    expect(screen.getByText('Refund request for order #12345')).toBeInTheDocument();
    expect(screen.getByText('General question about pricing')).toBeInTheDocument();
  });

  it('displays page title', () => {
    render(<TicketsPage />);

    expect(screen.getByText('Tickets')).toBeInTheDocument();
  });

  it('renders table headers correctly', async () => {
    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Subject')).toBeInTheDocument();
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
    });
  });

  it('displays ticket IDs correctly', async () => {
    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });
  });

  it('displays ticket statuses with correct labels', async () => {
    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('Closed')).toBeInTheDocument();
    });
  });

  it('displays ticket categories with correct labels', async () => {
    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.getByText('Refund')).toBeInTheDocument();
      expect(screen.getByText('General')).toBeInTheDocument();
    });
  });

  it('displays dash for missing category', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/tickets`, () => {
        return HttpResponse.json({
          ...mockTickets,
          tickets: mockTickets.tickets.map(t => ({ ...t, category: null })),
        });
      })
    );

    render(<TicketsPage />);

    await waitFor(() => {
      // The em dash character used in the component
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });
  });

  it('displays sender name when available, falls back to email', async () => {
    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      // Third ticket has null senderName, should show email
      expect(screen.getByText('user3@example.com')).toBeInTheDocument();
    });
  });

  it('displays formatted dates correctly', async () => {
    render(<TicketsPage />);

    await waitFor(() => {
      // Check that formatted dates appear (Jan 15, 2024 format)
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });
  });

  it('handles pagination correctly', async () => {
    // Use multi-page mock data
    server.use(
      http.get(`${API_BASE_URL}/api/tickets`, ({ request }) => {
        const url = new URL(request.url, 'http://localhost');
        const page = parseInt(url.searchParams.get('page') || '1');

        if (page === 2) {
          return HttpResponse.json(mockTicketsPage2);
        }
        return HttpResponse.json(mockTicketsMultiPage);
      })
    );

    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cannot login to my account')).toBeInTheDocument();
    });

    // Pagination info should be visible
    expect(screen.getByText(/Showing 1 to 20 of 25 tickets/)).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });
});

describe('TicketsPage - Error Handling', () => {
  it('displays error message when fetch fails', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/tickets`, () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tickets/)).toBeInTheDocument();
    });
  });

  it('displays unauthorized error message', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/tickets`, () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tickets/)).toBeInTheDocument();
    });
  });

  it('displays forbidden error message', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/tickets`, () => {
        return new HttpResponse(null, { status: 403 });
      })
    );

    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load tickets/)).toBeInTheDocument();
    });
  });
});

describe('TicketsPage - Empty State', () => {
  it('displays empty state when no tickets exist', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/tickets`, () => {
        return HttpResponse.json({
          tickets: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        });
      })
    );

    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('No tickets found')).toBeInTheDocument();
    });
  });
});
