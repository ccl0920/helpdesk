import { afterEach, beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '@/test/test-utils';
import { UpdateTicket } from './UpdateTicket';
import { TicketStatus, TicketCategory } from '@helpdesk/common';
import { Role } from '@/lib/role';
import type { Ticket, User } from '@/lib/api';

// Mock data
const mockAgent: User = {
  id: 'agent-1',
  email: 'agent@helpdesk.com',
  name: 'Test Agent',
  role: Role.AGENT,
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
};

const mockAdmin: User = {
  id: 'admin-1',
  email: 'admin@helpdesk.com',
  name: 'Test Admin',
  role: Role.ADMIN,
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
};

const mockAgents: User[] = [mockAgent, mockAdmin];

const mockTicket: Ticket = {
  id: BigInt(1),
  subject: 'Test Ticket Subject',
  description: 'Test description content',
  status: TicketStatus.OPEN,
  category: null,
  emailFrom: 'customer@example.com',
  senderName: 'Test Customer',
  emailTo: 'support@helpdesk.com',
  assignedToId: null,
  assignedTo: null,
  messages: [],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
};

const mockAssignedTicket: Ticket = {
  ...mockTicket,
  id: BigInt(2),
  assignedToId: 'agent-1',
  assignedTo: {
    id: 'agent-1',
    name: 'Test Agent',
    email: 'agent@helpdesk.com',
  },
};

// Track mutation calls
let mockUpdateTicketCalls: Array<Record<string, unknown>> = [];

// Helper to create default handlers
const createDefaultHandlers = () => [
  http.get('/api/auth/get-session', () => {
    return HttpResponse.json({ session: null, user: null });
  }),
  http.put('/api/tickets/1', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    mockUpdateTicketCalls.push(body);

    const updatedTicket = {
      ...mockTicket,
      ...body,
      id: BigInt(1),
    };

    return HttpResponse.json(updatedTicket);
  }),
  http.put('/api/tickets/2', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    mockUpdateTicketCalls.push(body);

    const updatedTicket = {
      ...mockAssignedTicket,
      ...body,
      id: BigInt(2),
    };

    return HttpResponse.json(updatedTicket);
  }),
];

// Setup MSW server
const server = setupServer(...createDefaultHandlers());

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers(...createDefaultHandlers());
  mockUpdateTicketCalls = [];
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('UpdateTicket', () => {
  beforeEach(() => {
    mockUpdateTicketCalls = [];
  });

  describe('Status Dropdown', () => {
    it('should render the status dropdown', async () => {
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });
    });

    it('should display current ticket status as selected value', async () => {
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        const statusCombobox = screen.getByRole('combobox', { name: /update status/i });
        expect(statusCombobox).toHaveTextContent('Open');
      });
    });

    it('should open status dropdown and show all status options', async () => {
      const user = userEvent.setup();
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /update status/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument();
      });
      expect(screen.getByRole('option', { name: 'Resolved' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Closed' })).toBeInTheDocument();
    });

    it('should update ticket status when a new status is selected', async () => {
      const user = userEvent.setup();
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /update status/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Resolved' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Resolved' }));

      await waitFor(() => {
        expect(mockUpdateTicketCalls.length).toBe(1);
        expect(mockUpdateTicketCalls[0]).toHaveProperty('status', TicketStatus.RESOLVED);
      });
    });

    it('should show updated status after selection', async () => {
      const user = userEvent.setup();
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /update status/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Closed' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Closed' }));

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toHaveTextContent('Closed');
      });
    });
  });

  describe('Category Dropdown', () => {
    it('should render the category dropdown', async () => {
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update category/i })).toBeInTheDocument();
      });
    });

    it('should display "No Category" when ticket category is null', async () => {
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        const categoryCombobox = screen.getByRole('combobox', { name: /update category/i });
        expect(categoryCombobox).toHaveTextContent('No Category');
      });
    });

    it('should display current category when ticket has one', async () => {
      const ticketWithCategory: Ticket = {
        ...mockTicket,
        id: BigInt(3),
        category: TicketCategory.TECHNICAL_QUESTION,
      };

      render(<UpdateTicket ticket={ticketWithCategory} agents={mockAgents} />);

      await waitFor(() => {
        const categoryCombobox = screen.getByRole('combobox', { name: /update category/i });
        expect(categoryCombobox).toHaveTextContent('Technical Question');
      });
    });

    it('should open category dropdown and show all options', async () => {
      const user = userEvent.setup();
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update category/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /update category/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'No Category' })).toBeInTheDocument();
      });
      expect(screen.getByRole('option', { name: 'General Question' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Technical Question' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Refund Request' })).toBeInTheDocument();
    });

    it('should update ticket category when a new category is selected', async () => {
      const user = userEvent.setup();
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update category/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /update category/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'General Question' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'General Question' }));

      await waitFor(() => {
        expect(mockUpdateTicketCalls.length).toBe(1);
        expect(mockUpdateTicketCalls[0]).toHaveProperty('category', TicketCategory.GENERAL_QUESTION);
      });
    });

    it('should set category to null when "No Category" is selected', async () => {
      const user = userEvent.setup();
      const ticketWithCategory: Ticket = {
        ...mockTicket,
        category: TicketCategory.REFUND_REQUEST,
      };

      render(<UpdateTicket ticket={ticketWithCategory} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update category/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /update category/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'No Category' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'No Category' }));

      await waitFor(() => {
        expect(mockUpdateTicketCalls.length).toBe(1);
        expect(mockUpdateTicketCalls[0]).toHaveProperty('category', null);
      });
    });
  });

  describe('Assigned To Dropdown', () => {
    it('should render the assigned to dropdown', async () => {
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toBeInTheDocument();
      });
    });

    it('should display "Unassigned" when ticket has no assignee', async () => {
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        const assignedCombobox = screen.getByRole('combobox', { name: /select an agent/i });
        expect(assignedCombobox).toHaveTextContent('Unassigned');
      });
    });

    it('should display assigned agent name when ticket is assigned', async () => {
      render(<UpdateTicket ticket={mockAssignedTicket} agents={mockAgents} />);

      await waitFor(() => {
        const assignedCombobox = screen.getByRole('combobox', { name: /select an agent/i });
        expect(assignedCombobox).toHaveTextContent('Test Agent');
      });
    });

    it('should open dropdown and show unassigned option and all agents', async () => {
      const user = userEvent.setup();
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /select an agent/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument();
      });
      expect(screen.getByRole('option', { name: 'Test Agent' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Test Admin' })).toBeInTheDocument();
    });

    it('should assign agent when selected from dropdown', async () => {
      const user = userEvent.setup();
      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /select an agent/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Test Agent' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Test Agent' }));

      await waitFor(() => {
        expect(mockUpdateTicketCalls.length).toBe(1);
        expect(mockUpdateTicketCalls[0]).toHaveProperty('assignedToId', 'agent-1');
      });
    });

    it('should unassign ticket when "Unassigned" is selected', async () => {
      const user = userEvent.setup();
      render(<UpdateTicket ticket={mockAssignedTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /select an agent/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Unassigned' }));

      await waitFor(() => {
        expect(mockUpdateTicketCalls.length).toBe(1);
        expect(mockUpdateTicketCalls[0]).toHaveProperty('assignedToId', null);
      });
    });

    it('should show assigned agent name when agent is not in agents list but assignedTo exists', async () => {
      const ticketWithExternalAgent: Ticket = {
        ...mockTicket,
        id: BigInt(4),
        assignedToId: 'external-agent',
        assignedTo: {
          id: 'external-agent',
          name: 'External Agent',
          email: 'external@helpdesk.com',
        },
      };

      render(<UpdateTicket ticket={ticketWithExternalAgent} agents={mockAgents} />);

      await waitFor(() => {
        const assignedCombobox = screen.getByRole('combobox', { name: /select an agent/i });
        expect(assignedCombobox).toHaveTextContent('External Agent');
      });
    });
  });

  describe('Loading State', () => {
    it('should show "Updating..." text during status update', async () => {
      const user = userEvent.setup();

      server.use(
        http.put('/api/tickets/1', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({ ...mockTicket, status: TicketStatus.RESOLVED });
        }),
      );

      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /update status/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Resolved' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Resolved' }));

      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });
    });

    it('should show "Updating..." text during agent assignment', async () => {
      const user = userEvent.setup();

      server.use(
        http.put('/api/tickets/1', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({ ...mockTicket, assignedToId: 'agent-1' });
        }),
      );

      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /select an agent/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Test Agent' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Test Agent' }));

      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });
    });

    it('should hide "Updating..." text after update completes', async () => {
      const user = userEvent.setup();

      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /update status/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Resolved' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Resolved' }));

      await waitFor(() => {
        expect(screen.queryByText('Updating...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('should show error message when status update fails', async () => {
      const user = userEvent.setup();

      server.use(
        http.put('/api/tickets/1', () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /update status/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Resolved' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Resolved' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to update')).toBeInTheDocument();
      });
    });

    it('should show error message when agent assignment fails', async () => {
      const user = userEvent.setup();

      server.use(
        http.put('/api/tickets/1', () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /select an agent/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Test Agent' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Test Agent' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to update')).toBeInTheDocument();
      });
    });

    it('should show error message when category update fails', async () => {
      const user = userEvent.setup();

      server.use(
        http.put('/api/tickets/1', () => {
          return new HttpResponse(null, { status: 500 });
        }),
      );

      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update category/i })).toBeInTheDocument();
      });

      const selectTrigger = screen.getByRole('combobox', { name: /update category/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'General Question' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'General Question' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to update')).toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable dropdowns while update is pending', async () => {
      const user = userEvent.setup();

      server.use(
        http.put('/api/tickets/1', async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return HttpResponse.json({ ...mockTicket, status: TicketStatus.RESOLVED });
        }),
      );

      render(<UpdateTicket ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });

      const statusTrigger = screen.getByRole('combobox', { name: /update status/i });
      await user.click(statusTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Resolved' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Resolved' }));

      // Wait for pending state
      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });

      // Check that other dropdowns are disabled
      const categoryTrigger = screen.getByRole('combobox', { name: /update category/i });
      const agentTrigger = screen.getByRole('combobox', { name: /select an agent/i });

      expect(categoryTrigger).toBeDisabled();
      expect(agentTrigger).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty agents list', async () => {
      const user = userEvent.setup();
      render(<UpdateTicket ticket={mockTicket} agents={[]} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toBeInTheDocument();
      });

      // Should still show Unassigned option
      const selectTrigger = screen.getByRole('combobox', { name: /select an agent/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument();
      });
    });

    it('should handle ticket with all fields populated', async () => {
      const fullTicket: Ticket = {
        ...mockTicket,
        status: TicketStatus.RESOLVED,
        category: TicketCategory.TECHNICAL_QUESTION,
        assignedToId: 'agent-1',
        assignedTo: {
          id: 'agent-1',
          name: 'Test Agent',
          email: 'agent@helpdesk.com',
        },
      };

      render(<UpdateTicket ticket={fullTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toHaveTextContent('Resolved');
        expect(screen.getByRole('combobox', { name: /update category/i })).toHaveTextContent('Technical Question');
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toHaveTextContent('Test Agent');
      });
    });

    it('should handle agent with null name (email fallback)', async () => {
      const agentWithNullName: User = {
        id: 'agent-null-name',
        email: 'noname@helpdesk.com',
        name: null,
        role: Role.AGENT,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00Z',
      };

      render(<UpdateTicket ticket={mockTicket} agents={[agentWithNullName]} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const selectTrigger = screen.getByRole('combobox', { name: /select an agent/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'noname@helpdesk.com' })).toBeInTheDocument();
      });
    });
  });
});
