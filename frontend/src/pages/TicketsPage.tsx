import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTickets } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketsTable } from '@/components/TicketsTable';

export function TicketsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const limit = 20;

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1); // Reset to first page when sorting changes
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', page, limit, sortBy, sortOrder],
    queryFn: () => fetchTickets({ page, limit, sortBy, sortOrder }),
  });

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load tickets. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <TicketsTable
          data={data}
          isLoading={isLoading}
          page={page}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      </CardContent>
    </Card>
  );
}
