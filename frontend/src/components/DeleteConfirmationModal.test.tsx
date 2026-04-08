import { describe, it, expect, beforeEach, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '@/test/test-utils';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { API_BASE_URL } from '@/lib/config';
import type { User } from '@/lib/api';

// Mock user data
const mockUser: User = {
  id: '1',
  email: 'agent@example.com',
  name: 'Test Agent',
  role: 'AGENT',
  emailVerified: true,
  createdAt: '2024-01-15T10:00:00Z',
};

const mockAdminUser: User = {
  id: '2',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'ADMIN',
  emailVerified: true,
  createdAt: '2024-02-20T14:30:00Z',
};

const mockUserWithNullName: User = {
  id: '3',
  email: 'noname@example.com',
  name: null,
  role: 'AGENT',
  emailVerified: false,
  createdAt: '2024-03-10T09:15:00Z',
};

// Setup MSW server
const server = setupServer(
  http.get(`${API_BASE_URL}/api/auth/get-session`, () => {
    return HttpResponse.json({ session: null, user: null });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('DeleteConfirmationModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render nothing when user is null', () => {
      const { container } = render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={null}
          onConfirm={mockOnConfirm}
        />
      );

      // Dialog should not render when user is null
      expect(container.firstChild).toBeNull();
    });

    it('should show "Delete User" title with warning icon when open', () => {
      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      // Use getAllByText since both title and button contain "Delete User"
      const deleteUserElements = screen.getAllByText('Delete User');
      expect(deleteUserElements.length).toBeGreaterThanOrEqual(1);
      // Warning icon is rendered (AlertTriangleIcon)
      const warningIcon = document.querySelector('svg.lucide-triangle-alert');
      expect(warningIcon).toBeInTheDocument();
    });

    it('should show warning message "This action cannot be undone"', () => {
      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('should show confirmation alert message', () => {
      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Are you sure you want to delete this user?')).toBeInTheDocument();
    });

    it('should show user name, email, and role', () => {
      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText(/name:/i)).toBeInTheDocument();
      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText(/email:/i)).toBeInTheDocument();
      expect(screen.getByText('agent@example.com')).toBeInTheDocument();
      expect(screen.getByText(/role:/i)).toBeInTheDocument();
      expect(screen.getByText('AGENT')).toBeInTheDocument();
    });

    it('should show dash for user with null name', () => {
      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUserWithNullName}
          onConfirm={mockOnConfirm}
        />
      );

      // User has name: null, should display '-'
      expect(screen.getByText('-')).toBeInTheDocument();
      expect(screen.getByText('noname@example.com')).toBeInTheDocument();
      expect(screen.getByText('AGENT')).toBeInTheDocument();
    });

    it('should show ADMIN role correctly', () => {
      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockAdminUser}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    it('should show Cancel and Delete User buttons', () => {
      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete user/i })).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      render(
        <DeleteConfirmationModal
          open={false}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      // Dialog content should not be visible
      expect(screen.queryByText('Delete User')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onConfirm when Delete User button is clicked', async () => {
      const user = userEvent.setup();
      mockOnConfirm.mockResolvedValueOnce(undefined);

      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      await user.click(screen.getByRole('button', { name: /delete user/i }));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onOpenChange(false) when Cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should call onOpenChange(false) when clicking outside (backdrop)', async () => {
      const user = userEvent.setup();

      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      // Find the overlay/backdrop and click it
      // Base UI renders the backdrop with data-slot="dialog-overlay"
      const backdrop = document.querySelector('[data-slot="dialog-overlay"]');
      expect(backdrop).toBeInTheDocument();

      if (backdrop) {
        await user.click(backdrop);
      }

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('should call onOpenChange(false) when pressing Escape', async () => {
      const user = userEvent.setup();

      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Modal State', () => {
    it('should render with correct initial state', () => {
      render(
        <DeleteConfirmationModal
          open={true}
          onOpenChange={mockOnOpenChange}
          user={mockUser}
          onConfirm={mockOnConfirm}
        />
      );

      // Both buttons should be enabled
      expect(screen.getByRole('button', { name: /cancel/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /delete user/i })).toBeEnabled();
    });
  });
});
