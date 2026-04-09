import { beforeEach, describe, it, expect, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/test-utils';
import { TicketsTable } from '../components/TicketsTable';
import { TicketStatus, TicketCategory } from '@helpdesk/common';
import type { PaginatedTickets, Ticket } from '@/lib/api';

// Mock tickets data
const createMockTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: BigInt(overrides.id ?? 1),
  subject: overrides.subject ?? 'Test Ticket Subject',
  description: overrides.description ?? 'Test description',
  status: overrides.status ?? TicketStatus.OPEN,
  category: overrides.category ?? TicketCategory.GENERAL_QUESTION,
  emailFrom: overrides.emailFrom ?? 'test@example.com',
  senderName: 'senderName' in overrides ? overrides.senderName : 'Test User',
  emailTo: overrides.emailTo ?? 'support@helpdesk.com',
  assignedToId: overrides.assignedToId ?? null,
  assignedTo: overrides.assignedTo ?? null,
  messages: overrides.messages ?? [],
  createdAt: overrides.createdAt ?? '2024-01-15T10:30:00Z',
  updatedAt: overrides.updatedAt ?? '2024-01-15T10:30:00Z',
});

const mockPaginatedTickets: PaginatedTickets = {
  tickets: [
    createMockTicket({
      id: BigInt(1),
      subject: 'Cannot login to my account',
      status: TicketStatus.OPEN,
      category: TicketCategory.TECHNICAL_QUESTION,
      senderName: 'John Doe',
      emailFrom: 'john@example.com',
      createdAt: '2024-01-15T12:30:00Z',
    }),
    createMockTicket({
      id: BigInt(2),
      subject: 'Refund request for order #12345',
      status: TicketStatus.RESOLVED,
      category: TicketCategory.REFUND_REQUEST,
      senderName: 'Jane Smith',
      emailFrom: 'jane@example.com',
      createdAt: '2024-02-20T14:15:00Z',
    }),
    createMockTicket({
      id: BigInt(3),
      subject: 'General question about pricing',
      status: TicketStatus.CLOSED,
      category: TicketCategory.GENERAL_QUESTION,
      senderName: null,
      emailFrom: 'alice@example.com',
      createdAt: '2024-03-10T12:45:00Z',
    }),
  ],
  total: 3,
  page: 1,
  limit: 20,
  totalPages: 1,
};

describe('TicketsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders skeleton loaders when isLoading is true', () => {
      render(
        <TicketsTable
          data={undefined}
          isLoading={true}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      // Should show 5 skeleton rows
      const skeletons = screen.getAllByRole('row');
      expect(skeletons.length).toBe(6); // 1 header + 5 skeleton rows

      // Header should contain the column titles
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Subject')).toBeInTheDocument();
      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
    });
  });

  describe('Data Rendering', () => {
    it('renders tickets data correctly', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      // Check ticket subjects
      expect(screen.getByText('Cannot login to my account')).toBeInTheDocument();
      expect(screen.getByText('Refund request for order #12345')).toBeInTheDocument();
      expect(screen.getByText('General question about pricing')).toBeInTheDocument();
    });

    it('displays ticket IDs correctly', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });

    it('displays sender name when available', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('falls back to email when senderName is null', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      // Third ticket has null senderName, should show email
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    it('displays all status types correctly', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.getByText('Closed')).toBeInTheDocument();
    });

    it('displays all category types correctly', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.getByText('Refund')).toBeInTheDocument();
      expect(screen.getByText('General')).toBeInTheDocument();
    });

    it('displays dash for missing category', () => {
      const ticketsWithoutCategory: PaginatedTickets = {
        ...mockPaginatedTickets,
        tickets: mockPaginatedTickets.tickets.map(t => ({ ...t, category: null })),
      };

      render(
        <TicketsTable
          data={ticketsWithoutCategory}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      // Should show em dash for all tickets without category
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBe(3);
    });

    it('displays formatted dates correctly', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      // Check that dates are formatted (Jan 15, 2024 format with time)
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Feb 20, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Mar 10, 2024/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty message when no tickets exist', () => {
      const emptyTickets: PaginatedTickets = {
        tickets: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      render(
        <TicketsTable
          data={emptyTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByText('No tickets found')).toBeInTheDocument();
    });

    it('does not show pagination when no tickets', () => {
      const emptyTickets: PaginatedTickets = {
        tickets: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      render(
        <TicketsTable
          data={emptyTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('shows pagination when multiple pages exist', () => {
      const paginatedTickets: PaginatedTickets = {
        tickets: mockPaginatedTickets.tickets,
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3,
      };

      render(
        <TicketsTable
          data={paginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByText(/Showing 1 to 20 of 50 tickets/)).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('disables Previous button on first page', () => {
      const paginatedTickets: PaginatedTickets = {
        tickets: mockPaginatedTickets.tickets,
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3,
      };

      render(
        <TicketsTable
          data={paginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('disables Next button on last page', () => {
      const paginatedTickets: PaginatedTickets = {
        tickets: mockPaginatedTickets.tickets.slice(0, 1),
        total: 50,
        page: 3,
        limit: 20,
        totalPages: 3,
      };

      render(
        <TicketsTable
          data={paginatedTickets}
          isLoading={false}
          page={3}
          onPageChange={vi.fn()}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('calls onPageChange when Next button is clicked', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const paginatedTickets: PaginatedTickets = {
        tickets: mockPaginatedTickets.tickets,
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3,
      };

      render(
        <TicketsTable
          data={paginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={onPageChange}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('calls onPageChange when Previous button is clicked', async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const paginatedTickets: PaginatedTickets = {
        tickets: mockPaginatedTickets.tickets,
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
      };

      render(
        <TicketsTable
          data={paginatedTickets}
          isLoading={false}
          page={2}
          onPageChange={onPageChange}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('displays correct pagination info', () => {
      const paginatedTickets: PaginatedTickets = {
        tickets: mockPaginatedTickets.tickets,
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
      };

      render(
        <TicketsTable
          data={paginatedTickets}
          isLoading={false}
          page={2}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByText(/Showing 21 to 40 of 45 tickets/)).toBeInTheDocument();
    });

    it('does not show pagination when only one page', () => {
      const singlePageTickets: PaginatedTickets = {
        tickets: mockPaginatedTickets.tickets,
        total: 3,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      render(
        <TicketsTable
          data={singlePageTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });
  });

  describe('Table Structure', () => {
    it('renders table with correct number of columns', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      const table = screen.getByRole('table');
      const headerRow = within(table).getAllByRole('row')[0];
      const headers = within(headerRow).getAllByRole('columnheader');

      expect(headers.length).toBe(6);
      expect(headers[0]).toHaveTextContent('ID');
      expect(headers[1]).toHaveTextContent('Subject');
      expect(headers[2]).toHaveTextContent('From');
      expect(headers[3]).toHaveTextContent('Status');
      expect(headers[4]).toHaveTextContent('Category');
      expect(headers[5]).toHaveTextContent('Created');
    });

    it('renders correct number of data rows', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
        />
      );

      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      // 1 header row + 3 data rows
      expect(rows.length).toBe(4);
    });
  });
});
