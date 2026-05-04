import { render, screen } from '@/test/test-utils';
import { TicketsPerDayChart } from './TicketsPerDayChart';

describe('TicketsPerDayChart', () => {
  it('renders loading skeleton when isLoading is true', () => {
    render(<TicketsPerDayChart data={[]} isLoading />);
    expect(screen.getByText(/Tickets per Day \(Last 30 Days\)/i)).toBeInTheDocument();
  });

  it('renders empty message when data is empty', () => {
    render(<TicketsPerDayChart data={[]} />);
    expect(screen.getByText('No ticket data available.')).toBeInTheDocument();
  });

  it('renders chart when data is provided', () => {
    const data = [
      { date: '2026-05-01', count: 5 },
      { date: '2026-05-02', count: 3 },
      { date: '2026-05-03', count: 8 },
    ];

    render(<TicketsPerDayChart data={data} />);
    expect(screen.getByText(/Tickets per Day \(Last 30 Days\)/i)).toBeInTheDocument();
  });
});
