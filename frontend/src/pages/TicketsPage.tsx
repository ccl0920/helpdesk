import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTickets } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketsTable } from '@/components/TicketsTable';
import { TicketFiltersBar } from '@/components/TicketFiltersBar';
import { TicketStatus, TicketCategory } from '@helpdesk/common';

interface TicketFilters {
  search?: string;
  status?: TicketStatus;
  category?: TicketCategory;
  assignedToId?: string | null;
}

export function TicketsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<TicketFilters>({});
  const [debouncedFilters, setDebouncedFilters] = useState<TicketFilters>({});
  const limit = 20;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1); // Reset to first page when sorting changes
  };

  const handleFilterChange = useCallback((newFilters: TicketFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets', page, limit, sortBy, sortOrder, debouncedFilters],
    queryFn: () => fetchTickets({ page, limit, sortBy, sortOrder, ...debouncedFilters }),
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
      <CardContent className="space-y-4">
        <TicketFiltersBar
          filters={filters}
          onFilterChange={handleFilterChange}
        />
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
