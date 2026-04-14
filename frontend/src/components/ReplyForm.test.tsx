import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '@/test/test-utils';
import { ReplyForm } from '@/components/ReplyForm';
import { SenderType } from '@helpdesk/common';
import { AuthContext } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';

// Mock data
const mockTicket = {
  id: BigInt(1),
  subject: 'Test Ticket Subject',
  description: 'Test description',
  status: 'OPEN' as const,
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

const mockUser = {
  id: 'user-1',
  email: 'agent@helpdesk.com',
  name: 'Test Agent',
  role: 'AGENT' as const,
  emailVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
};

const mockAuthContext = {
  user: mockUser,
  session: { user: mockUser, expiresAt: new Date() },
  isAuthenticated: true,
  isLoading: false,
  isAdmin: false,
  login: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
};

// Custom render with mocked auth
function renderWithAuth(ui: React.ReactElement, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <AuthContext.Provider value={mockAuthContext}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </AuthContext.Provider>
    ),
    ...options,
  });
}

// Setup MSW server
const server = setupServer(
  http.post('/api/tickets/1/messages', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ...mockTicket,
      messages: [
        ...mockTicket.messages,
        {
          id: 'msg-new',
          from: (body as any).from,
          to: (body as any).to,
          subject: (body as any).subject,
          body: (body as any).body,
          bodyHtml: (body as any).bodyHtml || null,
          senderType: (body as any).senderType,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

interface ReplyFormTestProps {
  ticket: typeof mockTicket;
}

describe('ReplyForm', () => {
  const defaultProps: ReplyFormTestProps = {
    ticket: mockTicket,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default values', async () => {
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    // Check form fields are present
    expect(screen.getByPlaceholderText('Subject')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your reply...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();

    // Check default values
    const subjectInput = screen.getByPlaceholderText('Subject');
    expect(subjectInput).toHaveValue(`Re: ${mockTicket.subject}`);

    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    expect(bodyTextarea).toHaveValue('');
  });

  it('displays validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    // Clear the subject field to trigger validation
    const subjectInput = screen.getByPlaceholderText('Subject');
    await user.clear(subjectInput);

    // Submit form
    const submitButton = screen.getByRole('button', { name: /send reply/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Subject is required')).toBeInTheDocument();
    });

    expect(screen.getByText('Message body is required')).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    // Fill in the form
    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    await user.type(bodyTextarea, 'This is a test reply');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /send reply/i });
    await user.click(submitButton);

    // Wait for successful submission (form resets)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type your reply...')).toHaveValue('');
    });
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();

    // Mock a slow API response
    server.use(
      http.post('/api/tickets/1/messages', async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return HttpResponse.json(mockTicket);
      })
    );

    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    // Fill in the form
    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    await user.type(bodyTextarea, 'This is a test reply');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /send reply/i });
    await user.click(submitButton);

    // Check button shows loading state
    await waitFor(() => {
      expect(screen.getByText(/sending/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
  });

  it('displays error message on submission failure', async () => {
    const user = userEvent.setup();

    // Mock API error
    server.use(
      http.post('/api/tickets/1/messages', () => {
        return HttpResponse.json(
          { error: 'Failed to send reply' },
          { status: 500 }
        );
      })
    );

    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    // Fill in the form
    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    await user.type(bodyTextarea, 'This is a test reply');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /send reply/i });
    await user.click(submitButton);

    // Check error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/failed to send reply/i)).toBeInTheDocument();
    });
  });

  it('auto-populates subject with ticket subject', async () => {
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const subjectInput = screen.getByPlaceholderText('Subject');
    expect(subjectInput).toHaveValue(`Re: ${mockTicket.subject}`);
  });

  it('renders with different ticket subjects', async () => {
    renderWithAuth(
      <ReplyForm
        ticket={{
          ...mockTicket,
          id: BigInt(2),
          subject: 'Another Test Ticket',
          emailFrom: 'another@example.com',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const subjectInput = screen.getByPlaceholderText('Subject');
    expect(subjectInput).toHaveValue('Re: Another Test Ticket');
  });
});
