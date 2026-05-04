import { render, screen, waitFor } from '@/test/test-utils';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { HomePage } from './HomePage';

function generateTicketsPerDay() {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    data.push({ date: dateStr, count: i % 5 });
  }
  return data;
}

const server = setupServer(
  http.get('/api/dashboard/stats', () => {
    return HttpResponse.json({
      total: 150,
      open: 12,
      aiResolved: 45,
      percentAiResolved: 30.0,
      avgResolutionTimeHours: 4.5,
      ticketsPerDay: generateTicketsPerDay(),
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('HomePage', () => {
  it('renders dashboard title and welcome message', () => {
    render(<HomePage />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
  });

  it('displays stats cards after loading', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('4.5h')).toBeInTheDocument();
  });

  it('displays tickets per day chart after loading', async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText(/Tickets per Day \(Last 30 Days\)/i)).toBeInTheDocument();
    });
  });

  it('displays error message when stats fail to load', async () => {
    server.use(
      http.get('/api/dashboard/stats', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard stats/i)).toBeInTheDocument();
    });
  });
});
