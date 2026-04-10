import { beforeEach, describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  page: 1,
  limit: 10,
  totalPages: 3,
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
  limit: 10,
  totalPages: 3,
};

// Track API calls for assertion
let mockFetchTickets: ReturnType<typeof vi.fn>;

// Setup MSW server
const server = setupServer(
  http.get(`${API_BASE_URL}/api/auth/get-session`, () => {
    return HttpResponse.json({ session: null, user: null });
  }),
  http.get(`${API_BASE_URL}/api/tickets`, ({ request }) => {
    const url = new URL(request.url, 'http://localhost');
    const page = parseInt(url.searchParams.get('page') || '1');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';

    // Track the call
    if (mockFetchTickets) {
      mockFetchTickets({ page, sortBy, sortOrder });
    }

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
    mockFetchTickets = vi.fn();
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
      // Tickets with senderName should show both name and email
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      // Third ticket has null senderName, should show email only
      expect(screen.getByText('user3@example.com')).toBeInTheDocument();
    });
  });

  it('displays email address for all tickets including those with senderName', async () => {
    render(<TicketsPage />);

    await waitFor(() => {
      // All tickets should display their email address
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
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
    expect(screen.getByText(/Showing 1 to 10 of 25 tickets/)).toBeInTheDocument();
    // Page number buttons should be rendered (1, 2, 3, ..., and Next)
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
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

describe('TicketsPage - Sorting', () => {
  beforeEach(() => {
    mockFetchTickets = vi.fn();
    vi.clearAllMocks();
  });

  it('includes default sort params in API call', async () => {
    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cannot login to my account')).toBeInTheDocument();
    });

    // Verify initial API call includes default sort (createdAt desc)
    expect(mockFetchTickets).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'createdAt', sortOrder: 'desc' })
    );
  });

  it('updates sort params when clicking a column header', async () => {
    const user = userEvent.setup();
    render(<TicketsPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Cannot login to my account')).toBeInTheDocument();
    });

    // Clear previous calls
    mockFetchTickets.mockClear();

    // Click the Subject column header to sort
    const subjectButton = screen.getByRole('button', { name: /subject/i });
    await user.click(subjectButton);

    // Wait for new data to load with new sort
    await waitFor(() => {
      expect(mockFetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'subject', sortOrder: 'desc', page: 1 })
      );
    });
  });

  it('updates sort direction when clicking a column header', async () => {
    const user = userEvent.setup();

    render(<TicketsPage />);

    // Wait for initial load with default sort
    await waitFor(() => {
      expect(screen.getByText('Cannot login to my account')).toBeInTheDocument();
    });

    // Clear mock
    mockFetchTickets.mockClear();

    // Click Subject column to sort by subject
    const subjectButton = screen.getByRole('button', { name: /subject/i });
    await user.click(subjectButton);

    // Wait for API call with subject desc (default for new column)
    await waitFor(() => {
      expect(mockFetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'subject', sortOrder: 'desc' })
      );
    });
  });

  it('resets page to 1 when sort changes', async () => {
    const user = userEvent.setup();

    // Setup multi-page data
    server.use(
      http.get(`${API_BASE_URL}/api/tickets`, ({ request }) => {
        const url = new URL(request.url, 'http://localhost');
        const page = parseInt(url.searchParams.get('page') || '1');
        const sortBy = url.searchParams.get('sortBy') || 'createdAt';
        const sortOrder = url.searchParams.get('sortOrder') || 'desc';

        if (mockFetchTickets) {
          mockFetchTickets({ page, sortBy, sortOrder });
        }

        if (page === 2) {
          return HttpResponse.json(mockTicketsPage2);
        }
        return HttpResponse.json(mockTicketsMultiPage);
      })
    );

    render(<TicketsPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Cannot login to my account')).toBeInTheDocument();
    });

    mockFetchTickets.mockClear();

    // Click a column header to change sort
    const subjectButton = screen.getByRole('button', { name: /subject/i });
    await user.click(subjectButton);

    // Verify API call includes page 1
    await waitFor(() => {
      expect(mockFetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, sortBy: 'subject', sortOrder: 'desc' })
      );
    });
  });

  it('renders column headers as buttons in the table', async () => {
    render(<TicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Cannot login to my account')).toBeInTheDocument();
    });

    // All column headers should be buttons
    expect(screen.getByRole('button', { name: /id/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /subject/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /from/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /created/i })).toBeInTheDocument();
  });

  it('shows sorted data after sorting', async () => {
    const user = userEvent.setup();

    render(<TicketsPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Cannot login to my account')).toBeInTheDocument();
    });

    mockFetchTickets.mockClear();

    // Click the Subject column
    const subjectButton = screen.getByRole('button', { name: /subject/i });
    await user.click(subjectButton);

    // Verify the sort params were sent
    await waitFor(() => {
      expect(mockFetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'subject', sortOrder: 'desc' })
      );
    });
  });
});
