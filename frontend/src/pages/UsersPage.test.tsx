import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { UsersPage } from '../pages/UsersPage';
import { render } from '../test/test-utils';
import { API_BASE_URL } from '../lib/config';

// Mock users data
const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN' as const,
    emailVerified: true,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    email: 'agent@example.com',
    name: 'Agent User',
    role: 'AGENT' as const,
    emailVerified: true,
    createdAt: '2024-02-20T14:30:00Z',
  },
  {
    id: '3',
    email: 'newuser@example.com',
    name: null,
    role: 'AGENT' as const,
    emailVerified: false,
    createdAt: '2024-03-10T09:15:00Z',
  },
];

// Setup MSW server
const server = setupServer(
  // Mock auth session endpoint (used by AuthContext)
  http.get(`${API_BASE_URL}/api/auth/get-session`, () => {
    return HttpResponse.json({ session: null, user: null });
  }),
  // Mock users endpoint
  http.get(`${API_BASE_URL}/api/admin/users`, () => {
    return HttpResponse.json(mockUsers);
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    render(<UsersPage />);

    // Should show skeletons while loading (using data-slot attribute)
    const skeletons = screen.getAllByRole('row');
    expect(skeletons.length).toBeGreaterThan(1);
  });

  it('renders users data after successful fetch', async () => {
    render(<UsersPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    // Check all users are rendered
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('agent@example.com')).toBeInTheDocument();
    expect(screen.getByText('newuser@example.com')).toBeInTheDocument();
  });

  it('displays user roles correctly', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    // Should have 1 ADMIN and 2 AGENT badges
    const adminBadges = screen.getAllByText('ADMIN');
    const agentBadges = screen.getAllByText('AGENT');
    expect(adminBadges.length).toBe(1);
    expect(agentBadges.length).toBe(2);
  });

  it('displays verification status correctly', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    // Count badges in the table body (excludes header)
    const tableBody = screen.getByRole('table').querySelector('tbody');
    const verifiedBadges = within(tableBody!).getAllByText('Verified');
    const pendingBadges = within(tableBody!).getAllByText('Pending');
    expect(verifiedBadges.length).toBe(2);
    expect(pendingBadges.length).toBe(1);
  });

  it('displays formatted dates correctly', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
    });
  });

  it('displays null name as dash', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      // The third user has name: null, should show '-'
      const tableRows = screen.getAllByRole('row');
      // Find the row with newuser@example.com
      const rowWithNewUser = tableRows.find(row =>
        row.textContent?.includes('newuser@example.com')
      );
      expect(rowWithNewUser).toBeInTheDocument();
    });
  });

  it('renders table headers correctly', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
    });
  });

  it('displays page title and create button', () => {
    render(<UsersPage />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });
});

describe('UsersPage - Error Handling', () => {
  it('displays error message when fetch fails', async () => {
    // Override handler to return error
    server.use(
      http.get(`${API_BASE_URL}/api/admin/users`, () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<UsersPage />);

    await waitFor(() => {
      // Axios error message includes status code
      expect(screen.getByText(/Request failed with status code 500/)).toBeInTheDocument();
    });
  });

  it('displays unauthorized error message', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/admin/users`, () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    render(<UsersPage />);

    await waitFor(() => {
      // Axios error message includes status code
      expect(screen.getByText(/Request failed with status code 401/)).toBeInTheDocument();
    });
  });

  it('displays forbidden error message', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/admin/users`, () => {
        return new HttpResponse(null, { status: 403 });
      })
    );

    render(<UsersPage />);

    await waitFor(() => {
      // Axios error message includes status code
      expect(screen.getByText(/Request failed with status code 403/)).toBeInTheDocument();
    });
  });
});

describe('UsersPage - Empty State', () => {
  it('displays empty table body when no users exist', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/admin/users`, () => {
        return HttpResponse.json([]);
      })
    );

    render(<UsersPage />);

    await waitFor(() => {
      const tableBody = screen.getByRole('table').querySelector('tbody');
      expect(tableBody?.children.length).toBe(0);
    });
  });
});
