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

const defaultTableProps = {
  sortBy: 'createdAt',
  sortOrder: 'desc' as const,
  onSortChange: vi.fn(),
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
          {...defaultTableProps}
        />
      );

      // Should show skeleton rows (header + 5 loading rows)
      const skeletons = screen.getAllByRole('row');
      expect(skeletons.length).toBe(6); // 1 header + 5 skeleton rows
    });

    it('shows skeleton in all cells during loading', () => {
      render(
        <TicketsTable
          data={undefined}
          isLoading={true}
          page={1}
          onPageChange={vi.fn()}
          {...defaultTableProps}
        />
      );

      const table = screen.getByRole('table');
      const cells = within(table).getAllByRole('cell');
      // 5 rows x 6 columns = 30 cells, each with a skeleton
      expect(cells.length).toBe(30);
    });

    it('shows skeleton in header cells during loading', () => {
      render(
        <TicketsTable
          data={undefined}
          isLoading={true}
          page={1}
          onPageChange={vi.fn()}
          {...defaultTableProps}
        />
      );

      const table = screen.getByRole('table');
      const headerRow = within(table).getAllByRole('row')[0];
      const headers = within(headerRow).getAllByRole('columnheader');
      expect(headers.length).toBe(6);

      // Each header should contain a skeleton
      headers.forEach((header) => {
        expect(header.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
      });
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays both sender name and email when senderName is available', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          {...defaultTableProps}
        />
      );

      // First ticket should show both name and email
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();

      // Second ticket should show both name and email
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('falls back to email when senderName is null', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          {...defaultTableProps}
        />
      );

      // Third ticket has null senderName, should show email
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    it('does not display sender name when senderName is null', () => {
      const ticketsWithNullSender: PaginatedTickets = {
        tickets: [
          createMockTicket({
            id: BigInt(1),
            senderName: null,
            emailFrom: 'noname@example.com',
          }),
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      render(
        <TicketsTable
          data={ticketsWithNullSender}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          {...defaultTableProps}
        />
      );

      // Should show email
      expect(screen.getByText('noname@example.com')).toBeInTheDocument();
      // Should not show any name (only the email should be present in the From column)
      const fromCells = screen.getAllByText('noname@example.com');
      expect(fromCells.length).toBe(1);
    });

    it('displays all status types correctly', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
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
          {...defaultTableProps}
        />
      );

      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      // 1 header row + 3 data rows
      expect(rows.length).toBe(4);
    });
  });

  describe('Sorting', () => {
    it('renders column headers as clickable buttons', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          {...defaultTableProps}
        />
      );

      // All column headers should be buttons
      const columnButtons = screen.getAllByRole('button');
      expect(columnButtons.length).toBe(6);

      // Verify each button has the correct label
      expect(screen.getByRole('button', { name: /id/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /subject/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /from/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /category/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /created/i })).toBeInTheDocument();
    });

    it('displays ArrowUpDown icon for unsorted columns', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          sortBy="createdAt"
          sortOrder="desc"
          onSortChange={vi.fn()}
        />
      );

      // Subject column should have ArrowUpDown (not currently sorted)
      const subjectButton = screen.getByRole('button', { name: /subject/i });
      // The unsorted column should have the ArrowUpDown icon
      expect(subjectButton).toBeInTheDocument();
    });

    it('displays ArrowDown icon for currently sorted column (desc)', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          sortBy="createdAt"
          sortOrder="desc"
          onSortChange={vi.fn()}
        />
      );

      // Created column should have ArrowDown icon
      const createdButton = screen.getByRole('button', { name: /created/i });
      expect(createdButton).toBeInTheDocument();
    });

    it('displays ArrowUp icon for currently sorted column (asc)', () => {
      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          sortBy="subject"
          sortOrder="asc"
          onSortChange={vi.fn()}
        />
      );

      // Subject column should have ArrowUp icon
      const subjectButton = screen.getByRole('button', { name: /subject/i });
      expect(subjectButton).toBeInTheDocument();
    });

    it('calls onSortChange with desc when clicking an unsorted column', async () => {
      const user = userEvent.setup();
      const handleSortChange = vi.fn();

      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          sortBy="createdAt"
          sortOrder="desc"
          onSortChange={handleSortChange}
        />
      );

      // Click the Subject column header
      const subjectButton = screen.getByRole('button', { name: /subject/i });
      await user.click(subjectButton);

      expect(handleSortChange).toHaveBeenCalledWith('subject', 'desc');
    });

    it('toggles sort order to desc when clicking the same column that is sorted asc', async () => {
      const user = userEvent.setup();
      const handleSortChange = vi.fn();

      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          sortBy="subject"
          sortOrder="asc"
          onSortChange={handleSortChange}
        />
      );

      // Click the Subject column header (currently sorted asc)
      const subjectButton = screen.getByRole('button', { name: /subject/i });
      await user.click(subjectButton);

      expect(handleSortChange).toHaveBeenCalledWith('subject', 'desc');
    });

    it('toggles sort order to asc when clicking the same column that is sorted desc', async () => {
      const user = userEvent.setup();
      const handleSortChange = vi.fn();

      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          sortBy="createdAt"
          sortOrder="desc"
          onSortChange={handleSortChange}
        />
      );

      // Click the Created column header (currently sorted desc)
      const createdButton = screen.getByRole('button', { name: /created/i });
      await user.click(createdButton);

      expect(handleSortChange).toHaveBeenCalledWith('createdAt', 'asc');
    });

    it('calls onSortChange for each sortable column', async () => {
      const user = userEvent.setup();
      const handleSortChange = vi.fn();

      render(
        <TicketsTable
          data={mockPaginatedTickets}
          isLoading={false}
          page={1}
          onPageChange={vi.fn()}
          sortBy="createdAt"
          sortOrder="desc"
          onSortChange={handleSortChange}
        />
      );

      // Click ID column
      await user.click(screen.getByRole('button', { name: /id/i }));
      expect(handleSortChange).toHaveBeenLastCalledWith('id', 'desc');

      // Click From column
      await user.click(screen.getByRole('button', { name: /from/i }));
      expect(handleSortChange).toHaveBeenLastCalledWith('emailFrom', 'desc');

      // Click Status column
      await user.click(screen.getByRole('button', { name: /status/i }));
      expect(handleSortChange).toHaveBeenLastCalledWith('status', 'desc');

      // Click Category column
      await user.click(screen.getByRole('button', { name: /category/i }));
      expect(handleSortChange).toHaveBeenLastCalledWith('category', 'desc');
    });

    it('does not call onSortChange during loading state', () => {
      const handleSortChange = vi.fn();

      render(
        <TicketsTable
          data={undefined}
          isLoading={true}
          page={1}
          onPageChange={vi.fn()}
          sortBy="createdAt"
          sortOrder="desc"
          onSortChange={handleSortChange}
        />
      );

      // During loading, no buttons should trigger sort
      expect(handleSortChange).not.toHaveBeenCalled();
    });
  });
});
