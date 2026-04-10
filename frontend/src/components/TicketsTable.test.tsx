import { beforeEach, describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import { TicketsTable } from '@/components/TicketsTable';
import { TicketStatus, TicketCategory } from '@helpdesk/common';
import type { PaginatedTickets, Ticket } from '@/lib/api';

// Helper to create mock ticket data
function createMockTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: BigInt(overrides.id ?? 1),
    subject: overrides.subject ?? 'Test Ticket Subject',
    description: overrides.description ?? 'Test description',
    status: overrides.status ?? TicketStatus.OPEN,
    category: overrides.category ?? null,
    emailFrom: overrides.emailFrom ?? 'user@example.com',
    senderName: overrides.senderName ?? 'Test User',
    emailTo: overrides.emailTo ?? 'support@helpdesk.com',
    assignedToId: overrides.assignedToId ?? null,
    assignedTo: overrides.assignedTo ?? null,
    messages: overrides.messages ?? [],
    createdAt: overrides.createdAt ?? '2024-01-15T10:30:00Z',
    updatedAt: overrides.updatedAt ?? '2024-01-15T10:30:00Z',
  };
}

// Helper to create mock paginated tickets response
function createMockPaginatedTickets({
  tickets = [],
  total = 0,
  page = 1,
  limit = 10,
  totalPages = 0,
}: Partial<PaginatedTickets> = {}): PaginatedTickets {
  return {
    tickets,
    total,
    page,
    limit,
    totalPages,
  };
}

describe('TicketsTable Pagination', () => {
  const mockOnPageChange = vi.fn();
  const mockOnSortChange = vi.fn();

  const defaultProps = {
    page: 1,
    onPageChange: mockOnPageChange,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
    onSortChange: mockOnSortChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pagination Visibility', () => {
    it('should not render pagination when totalPages is 0', () => {
      const data = createMockPaginatedTickets({
        tickets: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('should not render pagination when totalPages is 1', () => {
      const tickets = Array.from({ length: 5 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 5,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('should render pagination when totalPages is greater than 1', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });
  });

  describe('Previous and Next Buttons', () => {
    it('should disable Previous button when on page 1', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('should enable Previous button when not on page 1', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 11), subject: `Ticket ${i + 11}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={2}
          data={data}
          isLoading={false}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).not.toBeDisabled();
    });

    it('should disable Next button when on last page', () => {
      const tickets = Array.from({ length: 5 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 21), subject: `Ticket ${i + 21}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 25,
        page: 3,
        limit: 10,
        totalPages: 3,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={3}
          data={data}
          isLoading={false}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when not on last page', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();
    });

    it('should call onPageChange with page - 1 when clicking Previous', async () => {
      const user = userEvent.setup();
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 11), subject: `Ticket ${i + 11}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={2}
          data={data}
          isLoading={false}
        />
      );

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('should call onPageChange with page + 1 when clicking Next', async () => {
      const user = userEvent.setup();
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Small Page Counts (≤ 7 pages)', () => {
    it('should show all page numbers when totalPages is 2', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });

    it('should show all page numbers when totalPages is 5', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 50,
        page: 1,
        limit: 10,
        totalPages: 5,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      for (let i = 1; i <= 5; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
      }
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });

    it('should show all page numbers when totalPages is exactly 7', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 70,
        page: 1,
        limit: 10,
        totalPages: 7,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      for (let i = 1; i <= 7; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
      }
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });
  });

  describe('Large Page Counts (> 7 pages) with Ellipsis', () => {
    it('should show ellipsis when totalPages is 8 and current page is in the middle', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 80,
        page: 4,
        limit: 10,
        totalPages: 8,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={4}
          data={data}
          isLoading={false}
        />
      );

      // Should show: 1 2 3 4 5 6 ... 8
      // rangeStart = max(2, 4-2) = 2, rangeEnd = min(7, 4+2) = 6
      // Since rangeStart (2) is not > 2, no ellipsis before range
      // Since rangeEnd (6) < 7, ellipsis after range
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();

      // Should have 1 ellipsis (after page 6, before page 8)
      const ellipsisElements = screen.getAllByText('...');
      expect(ellipsisElements.length).toBe(1);

      // Page 7 should NOT be shown (it's in the ellipsis gap)
      expect(screen.queryByRole('button', { name: '7' })).not.toBeInTheDocument();
    });

    it('should show ellipsis after first page when current page is near the end', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 100,
        page: 9,
        limit: 10,
        totalPages: 10,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={9}
          data={data}
          isLoading={false}
        />
      );

      // Should show: 1 ... 7 8 9 10
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();

      // Should have 1 ellipsis (before page 7)
      const ellipsisElements = screen.getAllByText('...');
      expect(ellipsisElements.length).toBe(1);
    });

    it('should show ellipsis before last page when current page is near the beginning', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 100,
        page: 2,
        limit: 10,
        totalPages: 10,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={2}
          data={data}
          isLoading={false}
        />
      );

      // Should show: 1 2 3 4 ... 10
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();

      // Should have 1 ellipsis (after page 4)
      const ellipsisElements = screen.getAllByText('...');
      expect(ellipsisElements.length).toBe(1);
    });

    it('should not show ellipsis before page 2 when on page 1', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 100,
        page: 1,
        limit: 10,
        totalPages: 10,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      // Should show: 1 2 3 ... 10
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();

      // The ellipsis should only appear once (between 3 and 10)
      const ellipsisElements = screen.getAllByText('...');
      expect(ellipsisElements.length).toBe(1);

      // Verify page 4 is NOT shown (it's in the ellipsis gap)
      expect(screen.queryByRole('button', { name: '4' })).not.toBeInTheDocument();
    });

    it('should not show ellipsis before last page when on last page', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 100,
        page: 10,
        limit: 10,
        totalPages: 10,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={10}
          data={data}
          isLoading={false}
        />
      );

      // Should show: 1 ... 8 9 10
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();

      // The ellipsis should only appear once (between 1 and 8)
      const ellipsisElements = screen.getAllByText('...');
      expect(ellipsisElements.length).toBe(1);

      // Verify page 7 is NOT shown (it's in the ellipsis gap)
      expect(screen.queryByRole('button', { name: '7' })).not.toBeInTheDocument();
    });
  });

  describe('Page Number Button Interactions', () => {
    it('should call onPageChange with correct page number when clicking a page button', async () => {
      const user = userEvent.setup();
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 50,
        page: 1,
        limit: 10,
        totalPages: 5,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      const page3Button = screen.getByRole('button', { name: '3' });
      await user.click(page3Button);

      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    it('should call onPageChange with first page when clicking page 1', async () => {
      const user = userEvent.setup();
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 100,
        page: 5,
        limit: 10,
        totalPages: 10,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={5}
          data={data}
          isLoading={false}
        />
      );

      const page1Button = screen.getByRole('button', { name: '1' });
      await user.click(page1Button);

      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('should call onPageChange with last page when clicking last page button', async () => {
      const user = userEvent.setup();
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 100,
        page: 5,
        limit: 10,
        totalPages: 10,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={5}
          data={data}
          isLoading={false}
        />
      );

      const page10Button = screen.getByRole('button', { name: '10' });
      await user.click(page10Button);

      expect(mockOnPageChange).toHaveBeenCalledWith(10);
    });
  });

  describe('Current Page Button Styling', () => {
    it('should highlight current page button with "default" variant', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={3}
          data={data}
          isLoading={false}
        />
      );

      const currentPageButton = screen.getByRole('button', { name: '3' });
      // shadcn/ui default variant has "bg-primary" class
      expect(currentPageButton).toHaveClass('bg-primary');
    });

    it('should use "outline" variant for non-current page buttons', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={3}
          data={data}
          isLoading={false}
        />
      );

      // Current page button should have bg-primary class (default variant)
      const currentPageButton = screen.getByRole('button', { name: '3' });
      expect(currentPageButton).toHaveClass('bg-primary');

      // Non-current pages should NOT have bg-primary (they use outline variant)
      const page1Button = screen.getByRole('button', { name: '1' });
      const page2Button = screen.getByRole('button', { name: '2' });
      const page4Button = screen.getByRole('button', { name: '4' });
      const page5Button = screen.getByRole('button', { name: '5' });

      [page1Button, page2Button, page4Button, page5Button].forEach((button) => {
        expect(button).not.toHaveClass('bg-primary');
      });
    });

    it('should highlight page 1 as current when on first page', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 50,
        page: 1,
        limit: 10,
        totalPages: 5,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      const page1Button = screen.getByRole('button', { name: '1' });
      expect(page1Button).toHaveClass('bg-primary');
    });

    it('should highlight last page as current when on last page', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 50,
        page: 5,
        limit: 10,
        totalPages: 5,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={5}
          data={data}
          isLoading={false}
        />
      );

      const page5Button = screen.getByRole('button', { name: '5' });
      expect(page5Button).toHaveClass('bg-primary');
    });
  });

  describe('Pagination Info Text', () => {
    it('should display correct range for first page', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      });

      render(
        <TicketsTable
          {...defaultProps}
          data={data}
          isLoading={false}
        />
      );

      expect(screen.getByText(/Showing 1 to 10 of 25 tickets/)).toBeInTheDocument();
    });

    it('should display correct range for middle page', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 11), subject: `Ticket ${i + 11}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={2}
          data={data}
          isLoading={false}
        />
      );

      expect(screen.getByText(/Showing 11 to 20 of 25 tickets/)).toBeInTheDocument();
    });

    it('should display correct range for last page with partial results', () => {
      const tickets = Array.from({ length: 5 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 21), subject: `Ticket ${i + 21}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 25,
        page: 3,
        limit: 10,
        totalPages: 3,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={3}
          data={data}
          isLoading={false}
        />
      );

      expect(screen.getByText(/Showing 21 to 25 of 25 tickets/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle page 2 edge case without left ellipsis when totalPages is 8', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 80,
        page: 2,
        limit: 10,
        totalPages: 8,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={2}
          data={data}
          isLoading={false}
        />
      );

      // Should show: 1 2 3 4 ... 8
      // rangeStart = max(2, 2-2) = 2, but we always show page 1 first
      // rangeEnd = min(7, 2+2) = 4
      // So: 1, then range 2-4, then ... if rangeEnd < 7, then 8
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();

      // Should have 1 ellipsis (after page 4)
      const ellipsisElements = screen.getAllByText('...');
      expect(ellipsisElements.length).toBe(1);
    });

    it('should handle page near end without right ellipsis', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 100,
        page: 8,
        limit: 10,
        totalPages: 10,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={8}
          data={data}
          isLoading={false}
        />
      );

      // Should show: 1 ... 6 7 8 9 10
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();

      // Should have 1 ellipsis (before page 6)
      const ellipsisElements = screen.getAllByText('...');
      expect(ellipsisElements.length).toBe(1);
    });

    it('should handle very large page counts correctly', () => {
      const tickets = Array.from({ length: 10 }, (_, i) =>
        createMockTicket({ id: BigInt(i + 1), subject: `Ticket ${i + 1}` })
      );
      const data = createMockPaginatedTickets({
        tickets,
        total: 1000,
        page: 50,
        limit: 10,
        totalPages: 100,
      });

      render(
        <TicketsTable
          {...defaultProps}
          page={50}
          data={data}
          isLoading={false}
        />
      );

      // Should show: 1 ... 48 49 50 51 52 ... 100
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '48' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '49' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '50' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '51' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '52' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '100' })).toBeInTheDocument();

      // Should have 2 ellipsis
      const ellipsisElements = screen.getAllByText('...');
      expect(ellipsisElements.length).toBe(2);
    });
  });
});
