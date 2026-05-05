import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTickets } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorMessage } from '@/components/ui/error-message';
import { TicketsTable } from '@/components/TicketsTable';
import { TicketFiltersBar } from '@/components/TicketFiltersBar';
import { TicketStatus, TicketCategory, type SortColumn, type SortOrder } from '@helpdesk/common';
import { Ticket } from 'lucide-react';

interface TicketFilters {
  search?: string;
  status?: TicketStatus;
  category?: TicketCategory;
  assignedToId?: string | null;
}

export function TicketsPage() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortColumn>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<TicketFilters>({});
  const [debouncedFilters, setDebouncedFilters] = useState<TicketFilters>({});
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters]);

  const handleSortChange = (newSortBy: SortColumn, newSortOrder: SortOrder) => {
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
      <Card className="border-0 shadow-soft">
        <CardContent className="pt-8 pb-8">
          <ErrorMessage message="Failed to load tickets. Please try again." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Tickets
        </h1>
        <p className="mt-1 text-muted-foreground font-body">
          Manage and respond to customer support requests
        </p>
      </div>

      <Card className="border-0 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-xl bg-teal-50">
              <Ticket className="h-4 w-4 text-teal-600" />
            </div>
            <CardTitle className="text-lg font-heading">All Tickets</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
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
    </div>
  );
}
