import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTickets } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketsTable } from '@/components/TicketsTable';

export function TicketsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', page, limit],
    queryFn: () => fetchTickets({ page, limit }),
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
        />
      </CardContent>
    </Card>
  );
}
