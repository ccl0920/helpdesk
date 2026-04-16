import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ReplyForm } from '@/components/ReplyForm';
import { AuthContext } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';
import { TicketStatus, Role } from '@helpdesk/common';

// Mock data
const mockTicket = {
  id: BigInt(1),
  subject: 'Test Ticket Subject',
  description: 'Test description',
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

const mockUser = {
  id: 'user-1',
  email: 'agent@helpdesk.com',
  name: 'Test Agent',
  image: null,
  role: Role.AGENT,
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
  }),
  http.post('/api/tickets/polish', async ({ request }) => {
    const body = (await request.json()) as { originalText: string };
    return HttpResponse.json({
      polishedText: `Hi ${mockTicket.senderName},\n\nThank you for reaching out. ${body.originalText}\n\nBest regards,\n${mockUser.name}`,
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

  it('displays error message when sending with empty subject', async () => {
    const user = userEvent.setup();
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    await user.type(bodyTextarea, 'Test reply body');

    const subjectInput = screen.getByPlaceholderText('Subject');
    await user.clear(subjectInput);

    const submitButton = screen.getByRole('button', { name: /send reply/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Subject is required')).toBeInTheDocument();
    });
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

  it('renders polish button', async () => {
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /polish/i })).toBeInTheDocument();
  });

  it('disables polish button when body is empty', async () => {
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const polishButton = screen.getByRole('button', { name: /polish/i });
    expect(polishButton).toBeDisabled();
  });

  it('enables polish button when body has content', async () => {
    const user = userEvent.setup();
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    await user.type(bodyTextarea, 'This is a test reply');

    const polishButton = screen.getByRole('button', { name: /polish/i });
    expect(polishButton).toBeEnabled();
  });

  it('polishes reply and updates textarea', async () => {
    const user = userEvent.setup();
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    await user.type(bodyTextarea, 'Help me with my account');

    const polishButton = screen.getByRole('button', { name: /polish/i });
    await user.click(polishButton);

    await waitFor(
      () => {
        expect(bodyTextarea).not.toHaveValue('Help me with my account');
      },
      { timeout: 3000 }
    );
  });

  it('disables polish button while polishing', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/tickets/polish', async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return HttpResponse.json({
          polishedText: 'Polished reply',
        });
      })
    );

    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    await user.type(bodyTextarea, 'Test reply');

    const polishButton = screen.getByRole('button', { name: /polish/i });
    await user.click(polishButton);

    await waitFor(() => {
      expect(screen.getByText(/polishing/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /polishing/i })).toBeDisabled();
  });

  it('displays error message on polish failure', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/tickets/polish', () => {
        return HttpResponse.json(
          { error: 'Failed to polish reply' },
          { status: 500 }
        );
      })
    );

    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    await user.type(bodyTextarea, 'Test reply');

    const polishButton = screen.getByRole('button', { name: /polish/i });
    await user.click(polishButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to polish reply/i)).toBeInTheDocument();
    });
  });

  it('displays rate limit error message', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/tickets/polish', () => {
        return HttpResponse.json(
          { error: 'Rate limit reached' },
          { status: 429 }
        );
      })
    );

    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    await user.type(bodyTextarea, 'Test reply');

    const polishButton = screen.getByRole('button', { name: /polish/i });
    await user.click(polishButton);

    await waitFor(() => {
      expect(screen.getByText(/rate limit/i)).toBeInTheDocument();
    });
  });

  it('disables send reply button when body is empty', async () => {
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const sendButton = screen.getByRole('button', { name: /send reply/i });
    expect(sendButton).toBeDisabled();
  });

  it('enables send reply button when body has content', async () => {
    const user = userEvent.setup();
    renderWithAuth(<ReplyForm {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reply to Customer')).toBeInTheDocument();
    });

    const bodyTextarea = screen.getByPlaceholderText('Type your reply...');
    await user.type(bodyTextarea, 'This is a test reply');

    const sendButton = screen.getByRole('button', { name: /send reply/i });
    expect(sendButton).toBeEnabled();
  });
});
