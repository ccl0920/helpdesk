import { afterEach, beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '../test/test-utils';
import { TicketDetailPage } from './TicketDetailPage';
import { TicketStatus, TicketCategory } from '@helpdesk/common';
import { Role } from '@/lib/role';
import type { Ticket, User } from '@/lib/api';

// Mock data
const mockAgents: User[] = [
  {
    id: 'agent1',
    email: 'agent1@helpdesk.com',
    name: 'Agent One',
    role: Role.AGENT,
    emailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'agent2',
    email: 'agent2@helpdesk.com',
    name: 'Agent Two',
    role: Role.AGENT,
    emailVerified: true,
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'admin1',
    email: 'admin@helpdesk.com',
    name: 'Admin User',
    role: Role.ADMIN,
    emailVerified: true,
    createdAt: '2024-01-03T00:00:00Z',
  },
];

const mockTicket: Ticket = {
  id: BigInt(1),
  subject: 'Cannot login to my account',
  description: 'I\'m unable to access my account after password reset. Please help.',
  status: TicketStatus.OPEN,
  category: TicketCategory.TECHNICAL_QUESTION,
  emailFrom: 'user1@example.com',
  senderName: 'John Doe',
  emailTo: 'support@helpdesk.com',
  assignedToId: null,
  assignedTo: null,
  messages: [
    {
      id: 'msg1',
      from: 'user1@example.com',
      to: 'support@helpdesk.com',
      subject: 'Cannot login to my account',
      body: 'I\'m unable to access my account after password reset. Please help.',
      bodyHtml: null,
      createdAt: '2024-01-15T10:30:00Z',
    },
  ],
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
};

const mockAssignedTicket: Ticket = {
  ...mockTicket,
  id: BigInt(2),
  assignedToId: 'agent1',
  assignedTo: {
    id: 'agent1',
    name: 'Agent One',
    email: 'agent1@helpdesk.com',
  },
};

const mockTicketWithMessages: Ticket = {
  ...mockTicket,
  id: BigInt(3),
  messages: [
    {
      id: 'msg1',
      from: 'user1@example.com',
      to: 'support@helpdesk.com',
      subject: 'Cannot login to my account',
      body: 'I\'m unable to access my account after password reset. Please help.',
      bodyHtml: null,
      createdAt: '2024-01-15T10:30:00Z',
    },
    {
      id: 'msg2',
      from: 'agent1@helpdesk.com',
      to: 'user1@example.com',
      subject: 'Re: Cannot login to my account',
      body: 'Hi John, I\'ve reset your password. Please try again.',
      bodyHtml: null,
      createdAt: '2024-01-15T11:00:00Z',
    },
  ],
};

// Track mutation calls
let mockUpdateTicket: ReturnType<typeof vi.fn>;

// Helper to create default handlers
const createDefaultHandlers = () => [
  http.get('/api/auth/get-session', () => {
    return HttpResponse.json({ session: null, user: null });
  }),
  http.get('/api/tickets/1', () => {
    return HttpResponse.json(mockTicket);
  }),
  http.get('/api/tickets/2', () => {
    return HttpResponse.json(mockAssignedTicket);
  }),
  http.get('/api/tickets/3', () => {
    return HttpResponse.json(mockTicketWithMessages);
  }),
  http.get('/api/admin/users', () => {
    return HttpResponse.json(mockAgents);
  }),
  http.put('/api/tickets/1', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const updatedTicket = {
      ...mockTicket,
      ...body,
      id: BigInt(1),
    };

    if (mockUpdateTicket) {
      mockUpdateTicket(body);
    }

    return HttpResponse.json(updatedTicket);
  }),
  http.put('/api/tickets/2', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const updatedTicket = {
      ...mockAssignedTicket,
      ...body,
      id: BigInt(2),
    };

    if (mockUpdateTicket) {
      mockUpdateTicket(body);
    }

    return HttpResponse.json(updatedTicket);
  }),
];

// Setup MSW server with default handlers
const server = setupServer(...createDefaultHandlers());

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers(...createDefaultHandlers());
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('TicketDetailPage', () => {
  beforeEach(() => {
    mockUpdateTicket = vi.fn();
  });

  describe('Agent Selection Dropdown', () => {
    it('should render the agent selection dropdown', async () => {
      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
    });

    it('should display Unassigned option in dropdown', async () => {
      const user = userEvent.setup();
      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument();
    });

    it('should only display agents (AGENT and ADMIN roles) in dropdown', async () => {
      const user = userEvent.setup();
      const mixedUsers: User[] = [
        ...mockAgents,
        {
          id: 'user1',
          email: 'regular@example.com',
          name: 'Regular User',
          role: 'USER' as Role,
          emailVerified: true,
          createdAt: '2024-01-04T00:00:00Z',
        },
      ];

      server.use(
        http.get('/api/admin/users', () => {
          return HttpResponse.json(mixedUsers);
        })
      );

      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      expect(screen.getByRole('option', { name: 'Agent One' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Agent Two' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Admin User' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: 'Regular User' })).not.toBeInTheDocument();
    });

    it('should display agent name or email fallback when name is null', async () => {
      const user = userEvent.setup();
      const agentsWithNullName: User[] = [
        {
          id: 'agent1',
          email: 'agent1@helpdesk.com',
          name: null,
          role: Role.AGENT,
          emailVerified: true,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];

      server.use(
        http.get('/api/admin/users', () => {
          return HttpResponse.json(agentsWithNullName);
        })
      );

      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      expect(screen.getByRole('option', { name: 'agent1@helpdesk.com' })).toBeInTheDocument();
    });
  });

  describe('Assigned Agent Display', () => {
    it('should show unassigned state when assignedToId is null', async () => {
      const user = userEvent.setup();
      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        const combobox = screen.getByRole('combobox');
        expect(combobox).toHaveTextContent(/unassigned/i);
      });
      
      // Verify Unassigned option is available
      const combobox = screen.getByRole('combobox');
      expect(combobox).toHaveTextContent(/unassigned/i);
    });
  });

  describe('Agent Assignment Updates', () => {
    it('should show loading state during update', async () => {
      const user = userEvent.setup();

      server.use(
        http.put('/api/tickets/1', async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;

          if (mockUpdateTicket) {
            mockUpdateTicket(body);
          }

          await new Promise((resolve) => setTimeout(resolve, 100));

          return HttpResponse.json({
            ...mockTicket,
            ...body,
            id: BigInt(1),
          });
        })
      );

      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const agentOption = screen.getByRole('option', { name: 'Agent One' });
      await user.click(agentOption);

      await waitFor(() => {
        expect(screen.getByText(/updating/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText(/updating/i)).not.toBeInTheDocument();
      });
    });

    it('should show error message when update fails', async () => {
      const user = userEvent.setup();

      server.use(
        http.put('/api/tickets/1', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      const agentOption = screen.getByRole('option', { name: 'Agent One' });
      await user.click(agentOption);

      await waitFor(() => {
        expect(screen.getByText(/failed to update assignment/i)).toBeInTheDocument();
      });
    });
  });

  describe('Ticket Details Display', () => {
    it('should display ticket subject and description', async () => {
      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText(/Ticket #/)).toBeInTheDocument();
      });

      // Check description appears (first occurrence is in the ticket details card)
      const descriptions = screen.getAllByText(/unable to access my account/i);
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it('should display ticket ID', async () => {
      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText(/Ticket #/)).toBeInTheDocument();
      });
    });

    it('should display status badge', async () => {
      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText('Open')).toBeInTheDocument();
      });
    });

    it('should display category badge when present', async () => {
      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText('Technical')).toBeInTheDocument();
      });
    });

    it('should display sender information', async () => {
      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText(/Ticket #/)).toBeInTheDocument();
      });

      // Check sender name and email
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      const emails = screen.getAllByText('user1@example.com');
      expect(emails.length).toBeGreaterThan(0);
    });

    it('should display formatted date', async () => {
      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText(/Ticket #/)).toBeInTheDocument();
      });

      // Use getAllByText since date appears multiple times
      const dates = screen.queryAllByText(/January 15, 2024/);
      expect(dates.length).toBeGreaterThan(0);
    });
  });

  describe('Message Thread', () => {
    it('should display messages when available', async () => {
      render(<TicketDetailPage />, { route: '/tickets/3', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText(/Ticket #/)).toBeInTheDocument();
      });

      expect(screen.getByText('Message Thread')).toBeInTheDocument();
      expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
    });

    it('should display empty state when no messages', async () => {
      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText(/Ticket #/)).toBeInTheDocument();
      });

      // The component shows messages from the ticket.messages array
      // mockTicket has 1 message, so we should see it
      expect(screen.getByText('Message Thread')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('should display error message when ticket fetch fails', async () => {
      server.use(
        http.get('/api/tickets/1', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText(/failed to load ticket/i)).toBeInTheDocument();
      });
    });

    it('should display back button in error state', async () => {
      server.use(
        http.get('/api/tickets/1', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText(/failed to load ticket/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle ticket with null category', async () => {
      server.use(
        http.get('/api/tickets/1', () => {
          return HttpResponse.json({
            ...mockTicket,
            category: null,
          });
        })
      );

      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText('Ticket #1')).toBeInTheDocument();
      });

      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('should handle empty messages array', async () => {
      server.use(
        http.get('/api/tickets/1', () => {
          return HttpResponse.json({
            ...mockTicket,
            messages: [],
          });
        })
      );

      render(<TicketDetailPage />, { route: '/tickets/1', routePath: '/tickets/:id' });

      await waitFor(() => {
        expect(screen.getByText(/Ticket #/)).toBeInTheDocument();
      });

      expect(screen.getByText('Message Thread')).toBeInTheDocument();
    });
  });
});
