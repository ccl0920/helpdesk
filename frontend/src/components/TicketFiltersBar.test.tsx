import { beforeEach, describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../test/test-utils';
import { TicketFiltersBar } from '../components/TicketFiltersBar';
import { TicketStatus, TicketCategory } from '@helpdesk/common';

describe('TicketFiltersBar', () => {
  const mockOnFilterChange = vi.fn();

  const defaultFilters = {
    search: undefined,
    status: undefined,
    category: undefined,
    assignedToId: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('renders search input with correct placeholder', () => {
      render(
        <TicketFiltersBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(
        screen.getByPlaceholderText('Search tickets by subject, email, or description...')
      ).toBeInTheDocument();
    });

    it('renders search input with empty value when no search filter', () => {
      render(
        <TicketFiltersBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(
        'Search tickets by subject, email, or description...'
      );
      expect(searchInput).toHaveValue('');
    });

    it('renders search input with value when search filter is present', () => {
      const filtersWithSearch = { ...defaultFilters, search: 'login issue' };

      render(
        <TicketFiltersBar
          filters={filtersWithSearch}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(
        'Search tickets by subject, email, or description...'
      );
      expect(searchInput).toHaveValue('login issue');
    });

    it('renders status dropdown trigger with "All statuses" when no status filter', () => {
      render(
        <TicketFiltersBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('All statuses')).toBeInTheDocument();
    });

    it('renders category dropdown trigger with "All categories" when no category filter', () => {
      render(
        <TicketFiltersBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('All categories')).toBeInTheDocument();
    });

    it('does not show clear filters button when no filters are active', () => {
      render(
        <TicketFiltersBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    });
  });

  describe('Search Input', () => {
    it('calls onFilterChange with search value when typing', () => {
      render(
        <TicketFiltersBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(
        'Search tickets by subject, email, or description...'
      );

      // For controlled inputs, use fireEvent.change to simulate the final value
      fireEvent.change(searchInput, { target: { value: 'login' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        search: 'login',
      });
    });

    it('calls onFilterChange with undefined when search input is cleared', () => {
      const filtersWithSearch = { ...defaultFilters, search: 'existing search' };

      render(
        <TicketFiltersBar
          filters={filtersWithSearch}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(
        'Search tickets by subject, email, or description...'
      );
      fireEvent.change(searchInput, { target: { value: '' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithSearch,
        search: undefined,
      });
    });

    it('preserves other filters when updating search', () => {
      const filtersWithStatus = {
        ...defaultFilters,
        status: TicketStatus.OPEN,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(
        'Search tickets by subject, email, or description...'
      );
      fireEvent.change(searchInput, { target: { value: 'refund' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithStatus,
        search: 'refund',
      });
    });
  });

  describe('Status Dropdown', () => {
    it('displays formatted status value when status filter is active', () => {
      const filtersWithStatus = { ...defaultFilters, status: TicketStatus.OPEN };

      render(
        <TicketFiltersBar
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('displays "Resolved" status correctly', () => {
      const filtersWithStatus = { ...defaultFilters, status: TicketStatus.RESOLVED };

      render(
        <TicketFiltersBar
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });

    it('displays "Closed" status correctly', () => {
      const filtersWithStatus = { ...defaultFilters, status: TicketStatus.CLOSED };

      render(
        <TicketFiltersBar
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Closed')).toBeInTheDocument();
    });

    it('calls onFilterChange with correct status when selecting a status option', async () => {
      const user = userEvent.setup();

      render(
        <TicketFiltersBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open the status dropdown
      const statusTrigger = screen.getByText('All statuses');
      await user.click(statusTrigger);

      // Select "Open" from the dropdown
      const openOption = screen.getByRole('option', { name: 'Open' });
      await user.click(openOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        status: TicketStatus.OPEN,
      });
    });

    it('calls onFilterChange with undefined status when selecting "All statuses"', async () => {
      const user = userEvent.setup();
      const filtersWithStatus = { ...defaultFilters, status: TicketStatus.OPEN };

      render(
        <TicketFiltersBar
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open the status dropdown (shows "Open" since that's the current filter)
      const statusTrigger = screen.getByText('Open');
      await user.click(statusTrigger);

      // Wait for dropdown to open and options to render
      const allOption = await screen.findByRole('option', { name: 'All statuses' });
      await user.click(allOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithStatus,
        status: undefined,
      });
    });

    it('preserves other filters when changing status', async () => {
      const user = userEvent.setup();
      const filtersWithSearch = { ...defaultFilters, search: 'test query' };

      render(
        <TicketFiltersBar
          filters={filtersWithSearch}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open the status dropdown
      const statusTrigger = screen.getByText('All statuses');
      await user.click(statusTrigger);

      // Select "Resolved"
      const resolvedOption = screen.getByRole('option', { name: 'Resolved' });
      await user.click(resolvedOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithSearch,
        status: TicketStatus.RESOLVED,
      });
    });

    it('renders all status options in the dropdown', async () => {
      const user = userEvent.setup();

      render(
        <TicketFiltersBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open the status dropdown
      const statusTrigger = screen.getByText('All statuses');
      await user.click(statusTrigger);

      // Verify all options are present
      expect(screen.getByRole('option', { name: 'All statuses' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Resolved' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Closed' })).toBeInTheDocument();
    });
  });

  describe('Category Dropdown', () => {
    it('displays formatted category value when category filter is active', () => {
      const filtersWithCategory = {
        ...defaultFilters,
        category: TicketCategory.GENERAL_QUESTION,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithCategory}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('General Question')).toBeInTheDocument();
    });

    it('displays "Technical Question" category correctly', () => {
      const filtersWithCategory = {
        ...defaultFilters,
        category: TicketCategory.TECHNICAL_QUESTION,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithCategory}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Technical Question')).toBeInTheDocument();
    });

    it('displays "Refund Request" category correctly', () => {
      const filtersWithCategory = {
        ...defaultFilters,
        category: TicketCategory.REFUND_REQUEST,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithCategory}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Refund Request')).toBeInTheDocument();
    });

    it('calls onFilterChange with correct category when selecting a category option', async () => {
      const user = userEvent.setup();

      render(
        <TicketFiltersBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open the category dropdown
      const categoryTrigger = screen.getByText('All categories');
      await user.click(categoryTrigger);

      // Select "Technical Question" from the dropdown
      const techOption = screen.getByRole('option', { name: 'Technical Question' });
      await user.click(techOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        category: TicketCategory.TECHNICAL_QUESTION,
      });
    });

    it('calls onFilterChange with undefined category when selecting "All categories"', async () => {
      const user = userEvent.setup();
      const filtersWithCategory = {
        ...defaultFilters,
        category: TicketCategory.REFUND_REQUEST,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithCategory}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open the category dropdown
      const categoryTrigger = screen.getByText('Refund Request');
      await user.click(categoryTrigger);

      // Select "All categories"
      const allOption = screen.getByRole('option', { name: 'All categories' });
      await user.click(allOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithCategory,
        category: undefined,
      });
    });

    it('preserves other filters when changing category', async () => {
      const user = userEvent.setup();
      const filtersWithStatus = {
        ...defaultFilters,
        status: TicketStatus.OPEN,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open the category dropdown
      const categoryTrigger = screen.getByText('All categories');
      await user.click(categoryTrigger);

      // Select "Refund Request"
      const refundOption = screen.getByRole('option', { name: 'Refund Request' });
      await user.click(refundOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithStatus,
        category: TicketCategory.REFUND_REQUEST,
      });
    });

    it('renders all category options in the dropdown', async () => {
      const user = userEvent.setup();

      render(
        <TicketFiltersBar
          filters={defaultFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Open the category dropdown
      const categoryTrigger = screen.getByText('All categories');
      await user.click(categoryTrigger);

      // Verify all options are present
      expect(screen.getByRole('option', { name: 'All categories' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'General Question' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Technical Question' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Refund Request' })).toBeInTheDocument();
    });
  });

  describe('Clear Filters Button', () => {
    it('shows clear filters button when search filter is active', () => {
      const filtersWithSearch = { ...defaultFilters, search: 'test' };

      render(
        <TicketFiltersBar
          filters={filtersWithSearch}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('shows clear filters button when status filter is active', () => {
      const filtersWithStatus = { ...defaultFilters, status: TicketStatus.OPEN };

      render(
        <TicketFiltersBar
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('shows clear filters button when category filter is active', () => {
      const filtersWithCategory = {
        ...defaultFilters,
        category: TicketCategory.GENERAL_QUESTION,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithCategory}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('shows clear filters button when assignedToId filter is active', () => {
      const filtersWithAssignee = {
        ...defaultFilters,
        assignedToId: 'user-123',
      };

      render(
        <TicketFiltersBar
          filters={filtersWithAssignee}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('clear filters button calls onFilterChange with empty object', async () => {
      const user = userEvent.setup();
      const filtersWithMultiple = {
        ...defaultFilters,
        search: 'test query',
        status: TicketStatus.OPEN,
        category: TicketCategory.REFUND_REQUEST,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithMultiple}
          onFilterChange={mockOnFilterChange}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({});
    });

    it('clear filters button has X icon', () => {
      const filtersWithSearch = { ...defaultFilters, search: 'test' };

      render(
        <TicketFiltersBar
          filters={filtersWithSearch}
          onFilterChange={mockOnFilterChange}
        />
      );

      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      expect(clearButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Enum Value Formatting', () => {
    it('displays "General Question" for GENERAL_QUESTION enum', () => {
      const filtersWithCategory = {
        ...defaultFilters,
        category: TicketCategory.GENERAL_QUESTION,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithCategory}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Should display human-readable format, not enum value
      expect(screen.getByText('General Question')).toBeInTheDocument();
      expect(screen.queryByText('GENERAL_QUESTION')).not.toBeInTheDocument();
    });

    it('displays "Technical Question" for TECHNICAL_QUESTION enum', () => {
      const filtersWithCategory = {
        ...defaultFilters,
        category: TicketCategory.TECHNICAL_QUESTION,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithCategory}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Technical Question')).toBeInTheDocument();
      expect(screen.queryByText('TECHNICAL_QUESTION')).not.toBeInTheDocument();
    });

    it('displays "Refund Request" for REFUND_REQUEST enum', () => {
      const filtersWithCategory = {
        ...defaultFilters,
        category: TicketCategory.REFUND_REQUEST,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithCategory}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Refund Request')).toBeInTheDocument();
      expect(screen.queryByText('REFUND_REQUEST')).not.toBeInTheDocument();
    });

    it('displays "Open" for OPEN status enum', () => {
      const filtersWithStatus = { ...defaultFilters, status: TicketStatus.OPEN };

      render(
        <TicketFiltersBar
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.queryByText('OPEN')).not.toBeInTheDocument();
    });

    it('displays "Resolved" for RESOLVED status enum', () => {
      const filtersWithStatus = { ...defaultFilters, status: TicketStatus.RESOLVED };

      render(
        <TicketFiltersBar
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Resolved')).toBeInTheDocument();
      expect(screen.queryByText('RESOLVED')).not.toBeInTheDocument();
    });

    it('displays "Closed" for CLOSED status enum', () => {
      const filtersWithStatus = { ...defaultFilters, status: TicketStatus.CLOSED };

      render(
        <TicketFiltersBar
          filters={filtersWithStatus}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('Closed')).toBeInTheDocument();
      expect(screen.queryByText('CLOSED')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Active Filters', () => {
    it('displays all active filters correctly', () => {
      const filtersWithMultiple = {
        ...defaultFilters,
        search: 'password reset',
        status: TicketStatus.OPEN,
        category: TicketCategory.TECHNICAL_QUESTION,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithMultiple}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Search input should show the value
      const searchInput = screen.getByPlaceholderText(
        'Search tickets by subject, email, or description...'
      );
      expect(searchInput).toHaveValue('password reset');

      // Status should show formatted value
      expect(screen.getByText('Open')).toBeInTheDocument();

      // Category should show formatted value
      expect(screen.getByText('Technical Question')).toBeInTheDocument();

      // Clear button should be visible
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });

    it('updates search while preserving status and category filters', () => {
      const filtersWithMultiple = {
        ...defaultFilters,
        status: TicketStatus.OPEN,
        category: TicketCategory.GENERAL_QUESTION,
      };

      render(
        <TicketFiltersBar
          filters={filtersWithMultiple}
          onFilterChange={mockOnFilterChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(
        'Search tickets by subject, email, or description...'
      );
      fireEvent.change(searchInput, { target: { value: 'new query' } });

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        ...filtersWithMultiple,
        search: 'new query',
      });
    });
  });
});
