import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '@/test/test-utils';
import { UserFormModal } from './UserFormModal';
import { API_BASE_URL } from '@/lib/config';
import type { User } from '@/lib/api';

// Mock user data for edit mode
const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
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

// Setup MSW server
const server = setupServer(
  http.get(`${API_BASE_URL}/api/auth/get-session`, () => {
    return HttpResponse.json({ session: null, user: null });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Helper to get the role combobox (Select doesn't have accessible name from label)
const getRoleCombobox = () => {
  const comboboxes = screen.getAllByRole('combobox');
  // The role combobox is the one that's not a button
  return comboboxes.find((c) => !c.hasAttribute('type')) || comboboxes[comboboxes.length - 1];
};

describe('UserFormModal - Create Mode', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show "Create New User" title when no user is provided', () => {
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Create New User')).toBeInTheDocument();
  });

  it('should show "Enter password" placeholder in create mode', () => {
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    const passwordInput = screen.getByPlaceholderText('Enter password');
    expect(passwordInput).toBeInTheDocument();
  });

  it('should show "Create User" on submit button', () => {
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it('should submit form with empty password in create mode', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    // Fill in required fields except password
    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');

    // Select role
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    // Submit form
    await user.click(screen.getByRole('button', { name: /create user/i }));

    // Password is optional with .or(z.literal('')), so form should submit with empty password
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          password: '',
          role: 'AGENT',
        })
      );
    });
  });
});

describe('UserFormModal - Edit Mode', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show "Edit User" title when user is provided', () => {
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Edit User')).toBeInTheDocument();
  });

  it('should pre-populate form with user data', () => {
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSubmit={mockOnSubmit}
      />
    );

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

    expect(nameInput.value).toBe('Test User');
    expect(emailInput.value).toBe('test@example.com');
  });

  it('should show "(leave blank to keep current)" label for password in edit mode', () => {
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText(/leave blank to keep current/i)).toBeInTheDocument();
  });

  it('should show "Enter new password (optional)" placeholder in edit mode', () => {
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSubmit={mockOnSubmit}
      />
    );

    const passwordInput = screen.getByPlaceholderText('Enter new password (optional)');
    expect(passwordInput).toBeInTheDocument();
  });

  it('should show "Update User" on submit button', () => {
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByRole('button', { name: /update user/i })).toBeInTheDocument();
  });

  it('should allow submission with empty password in edit mode', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSubmit={mockOnSubmit}
      />
    );

    // Form is already populated with user data from mockUser
    // Submit without changing password
    await user.click(screen.getByRole('button', { name: /update user/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          password: '',
          role: 'AGENT',
        })
      );
    });
  });
});

describe('UserFormModal - Form Validation', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show validation error when name is less than 3 characters', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Ab');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');

    // Select role
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show validation error for invalid email format', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');

    // Select role
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should allow valid role selection (AGENT)', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');

    // Select role (default is AGENT)
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'AGENT',
        })
      );
    });
  });

  it('should allow valid role selection (ADMIN)', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');

    // Change role to ADMIN
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Admin' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'ADMIN',
        })
      );
    });
  });
});

describe('UserFormModal - Form Submission', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onSubmit with correct data in create mode', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'New User');
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');

    // Select role
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'AGENT',
      });
    });
  });

  it('should call onSubmit with correct data in edit mode', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSubmit={mockOnSubmit}
      />
    );

    // Update name
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated User');

    await user.click(screen.getByRole('button', { name: /update user/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated User',
          email: 'test@example.com',
          password: '',
          role: 'AGENT',
        })
      );
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Mock onSubmit to take some time
    mockOnSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');

    // Select role
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    // Should show "Creating..." during submission
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
    });

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
    });
  });

  it('should reset form and close modal after successful submission', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValueOnce(undefined);

    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');

    // Select role
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});

describe('UserFormModal - Error Handling', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display field-specific validation errors for name', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    // Type short name
    await user.type(screen.getByLabelText(/name/i), 'Ab');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');

    // Select role
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('should display field-specific validation errors for email', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'invalid');

    // Select role
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  it('should display "Email already exists" error on email field', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockRejectedValueOnce(new Error('Email already exists'));

    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');

    // Select role
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  it('should display general error for other server errors', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockRejectedValueOnce(new Error('Internal server error'));

    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');

    // Select role
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    await waitFor(() => {
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
    });
  });
});

describe('UserFormModal - Modal Behavior', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should open when open prop is true', () => {
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('Create New User')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  it('should call onOpenChange(false) when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should reset form when modal is closed and reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockUser}
        onSubmit={mockOnSubmit}
      />
    );

    // Verify form is populated with user data
    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Test User');

    // Close modal
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Reopen modal without user (create mode)
    rerender(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    // Form should be reset to empty values
    await waitFor(() => {
      expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('');
    });
  });

  it('should disable inputs during submission', async () => {
    const user = userEvent.setup();
    
    // Mock onSubmit to delay
    mockOnSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={null}
        onSubmit={mockOnSubmit}
      />
    );

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');

    // Select role
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Agent' }));

    await user.click(screen.getByRole('button', { name: /create user/i }));

    // Inputs should be disabled during submission
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeDisabled();
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
    });
  });

  it('should pre-populate form with ADMIN user data', () => {
    render(
      <UserFormModal
        open={true}
        onOpenChange={mockOnOpenChange}
        user={mockAdminUser}
        onSubmit={mockOnSubmit}
      />
    );

    expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Admin User');
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('admin@example.com');
  });
});
