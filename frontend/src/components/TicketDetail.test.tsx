import { afterEach, beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '@/test/test-utils';
import { TicketDetail } from './TicketDetail';
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

const mockTicketWithSenderName: Ticket = {
  ...mockTicket,
  id: BigInt(2),
  senderName: 'John Doe',
  emailFrom: 'john@example.com',
};

const mockTicketWithoutSenderName: Ticket = {
  ...mockTicket,
  id: BigInt(3),
  senderName: '',
  emailFrom: 'anon@example.com',
};

// Setup MSW server (component itself has no direct API calls, but UpdateTicket child does)
const server = setupServer(
  http.get('/api/auth/get-session', () => {
    return HttpResponse.json({ session: null, user: null });
  }),
  http.put('/api/tickets/1', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockTicket,
      ...body,
      id: BigInt(1),
    });
  }),
  http.put('/api/tickets/2', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockTicketWithSenderName,
      ...body,
      id: BigInt(2),
    });
  }),
  http.put('/api/tickets/3', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockTicketWithoutSenderName,
      ...body,
      id: BigInt(3),
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('TicketDetail', () => {
  describe('Ticket Subject Display', () => {
    it('should display the ticket subject as the card title', () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      expect(screen.getByText('Test Ticket Subject')).toBeInTheDocument();
    });

    it('should display subject with special characters', () => {
      const specialTicket: Ticket = {
        ...mockTicket,
        id: BigInt(10),
        subject: 'Issue with <script> & "quotes"',
      };

      render(<TicketDetail ticket={specialTicket} agents={mockAgents} />);

      expect(screen.getByText('Issue with <script> & "quotes"')).toBeInTheDocument();
    });
  });

  describe('Sender Information', () => {
    it('should display sender name when available', () => {
      render(<TicketDetail ticket={mockTicketWithSenderName} agents={mockAgents} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display sender email', () => {
      render(<TicketDetail ticket={mockTicketWithSenderName} agents={mockAgents} />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display both sender name and email together', () => {
      render(<TicketDetail ticket={mockTicketWithSenderName} agents={mockAgents} />);

      const fromSection = screen.getByText('From:').parentElement;
      expect(fromSection).toBeInTheDocument();
      expect(fromSection).toHaveTextContent('John Doe');
      expect(fromSection).toHaveTextContent('john@example.com');
    });

    it('should not display sender name when it is empty', () => {
      render(<TicketDetail ticket={mockTicketWithoutSenderName} agents={mockAgents} />);

      // Should only show email, not empty name
      expect(screen.getByText('anon@example.com')).toBeInTheDocument();
      // Empty senderName should not render a separate element
      const cardContent = screen.getByText('Description').closest('.space-y-6');
      expect(cardContent).not.toHaveTextContent('');
    });

    it('should display "From:" label', () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      expect(screen.getByText('From:')).toBeInTheDocument();
    });
  });

  describe('Created Date Display', () => {
    it('should display formatted created date', () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      // Date is formatted as "January 15, 2024, 10:00 AM"
      expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();
    });

    it('should display "Created:" label', () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      expect(screen.getByText('Created:')).toBeInTheDocument();
    });

    it('should display date with time', () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      // Should show date with time (format: "January 15, 2024 at HH:MM AM/PM")
      const createdDate = screen.getByText(/January 15, 2024/);
      expect(createdDate).toBeInTheDocument();
      // Time is included in the same element
      expect(createdDate.textContent).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('Description Display', () => {
    it('should display the ticket description', () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      expect(screen.getByText('Test description content')).toBeInTheDocument();
    });

    it('should display "Description" heading', () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should preserve whitespace in description', () => {
      const ticketWithNewlines: Ticket = {
        ...mockTicket,
        id: BigInt(11),
        description: 'Line 1\n\nLine 2\nLine 3',
      };

      const { container } = render(<TicketDetail ticket={ticketWithNewlines} agents={mockAgents} />);

      // Find the description paragraph element
      const descElement = container.querySelector('.whitespace-pre-wrap');
      expect(descElement).toBeInTheDocument();
      expect(descElement).toHaveTextContent(/Line 1/);
      expect(descElement).toHaveTextContent(/Line 2/);
      expect(descElement).toHaveTextContent(/Line 3/);
    });

    it('should display empty description gracefully', () => {
      const emptyTicket: Ticket = {
        ...mockTicket,
        id: BigInt(12),
        description: '',
      };

      render(<TicketDetail ticket={emptyTicket} agents={mockAgents} />);

      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  describe('UpdateTicket Component Integration', () => {
    it('should render UpdateTicket component with ticket and agents props', async () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      // Verify UpdateTicket renders by checking for status dropdown
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });
    });

    it('should render UpdateTicket with category dropdown', async () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update category/i })).toBeInTheDocument();
      });
    });

    it('should render UpdateTicket with agent selection dropdown', async () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toBeInTheDocument();
      });
    });

    it('should pass agents list to UpdateTicket for assignment', async () => {
      const user = userEvent.setup();
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toBeInTheDocument();
      });

      // Agents should be accessible in the dropdown
      const selectTrigger = screen.getByRole('combobox', { name: /select an agent/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Test Agent' })).toBeInTheDocument();
      });
      expect(screen.getByRole('option', { name: 'Test Admin' })).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should render as a card component', () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      // Card structure check - subject is in CardTitle
      const cardTitle = screen.getByText('Test Ticket Subject');
      expect(cardTitle.closest('.text-xl')).toBeInTheDocument();
    });

    it('should display sender info and created date in left column', () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      const fromLabel = screen.getByText('From:');
      const createdLabel = screen.getByText('Created:');

      // Both should be in the same space-y-6 container (left column)
      expect(fromLabel.parentElement?.parentElement).toHaveClass('space-y-6');
      expect(createdLabel.parentElement?.parentElement).toHaveClass('space-y-6');
    });

    it('should display UpdateTicket in right column', async () => {
      render(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle ticket with null senderName', () => {
      const ticketWithNullName: Ticket = {
        ...mockTicket,
        id: BigInt(20),
        senderName: null as unknown as string,
      };

      render(<TicketDetail ticket={ticketWithNullName} agents={mockAgents} />);

      // Should still show email
      expect(screen.getByText(ticketWithNullName.emailFrom)).toBeInTheDocument();
    });

    it('should handle ticket with long subject', () => {
      const longSubjectTicket: Ticket = {
        ...mockTicket,
        id: BigInt(21),
        subject: 'A'.repeat(200),
      };

      render(<TicketDetail ticket={longSubjectTicket} agents={mockAgents} />);

      expect(screen.getByText(longSubjectTicket.subject)).toBeInTheDocument();
    });

    it('should handle ticket with long description', () => {
      const longDescTicket: Ticket = {
        ...mockTicket,
        id: BigInt(22),
        description: 'B'.repeat(1000),
      };

      render(<TicketDetail ticket={longDescTicket} agents={mockAgents} />);

      expect(screen.getByText(longDescTicket.description)).toBeInTheDocument();
    });

    it('should handle empty agents list', async () => {
      const user = userEvent.setup();
      render(<TicketDetail ticket={mockTicket} agents={[]} />);

      // UpdateTicket should still render
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update status/i })).toBeInTheDocument();
      });

      // Agent dropdown should show Unassigned
      const selectTrigger = screen.getByRole('combobox', { name: /select an agent/i });
      await user.click(selectTrigger);

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Unassigned' })).toBeInTheDocument();
      });
    });

    it('should handle ticket with category already set', async () => {
      const ticketWithCategory: Ticket = {
        ...mockTicket,
        id: BigInt(23),
        category: TicketCategory.TECHNICAL_QUESTION,
      };

      render(<TicketDetail ticket={ticketWithCategory} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /update category/i })).toHaveTextContent(
          'Technical Question',
        );
      });
    });

    it('should handle ticket with assigned agent', async () => {
      const ticketWithAgent: Ticket = {
        ...mockTicket,
        id: BigInt(24),
        assignedToId: 'agent-1',
        assignedTo: {
          id: 'agent-1',
          name: 'Test Agent',
          email: 'agent@helpdesk.com',
        },
      };

      render(<TicketDetail ticket={ticketWithAgent} agents={mockAgents} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /select an agent/i })).toHaveTextContent(
          'Test Agent',
        );
      });
    });
  });
});
