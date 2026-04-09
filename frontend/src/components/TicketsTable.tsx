import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TicketStatus, TicketCategory } from '@helpdesk/common';
import type { PaginatedTickets } from '@/lib/api';

const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  [TicketStatus.OPEN]: { label: 'Open', variant: 'default' },
  [TicketStatus.RESOLVED]: { label: 'Resolved', variant: 'outline' },
  [TicketStatus.CLOSED]: { label: 'Closed', variant: 'secondary' },
};

const CATEGORY_CONFIG: Record<TicketCategory, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  [TicketCategory.GENERAL_QUESTION]: { label: 'General', variant: 'outline' },
  [TicketCategory.TECHNICAL_QUESTION]: { label: 'Technical', variant: 'outline' },
  [TicketCategory.REFUND_REQUEST]: { label: 'Refund', variant: 'destructive' },
};

interface TicketsTableProps {
  data: PaginatedTickets | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

export function TicketsTable({ data, isLoading, page, onPageChange }: TicketsTableProps) {
  const limit = data?.limit ?? 20;

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatTicketId(id: bigint) {
    return `#${id.toString()}`;
  }

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">ID</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>From</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-6 w-16" /></TableCell>
              <TableCell><Skeleton className="h-6 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">ID</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>From</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.tickets && data.tickets.length > 0 ? (
            data.tickets.map((ticket) => (
              <TableRow key={ticket.id.toString()}>
                <TableCell className="font-medium text-muted-foreground">
                  {formatTicketId(ticket.id)}
                </TableCell>
                <TableCell className="font-medium max-w-xs truncate">
                  {ticket.subject}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {ticket.senderName || ticket.emailFrom}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_CONFIG[ticket.status].variant}>
                    {STATUS_CONFIG[ticket.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {ticket.category ? (
                    <Badge variant={CATEGORY_CONFIG[ticket.category].variant}>
                      {CATEGORY_CONFIG[ticket.category].label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(ticket.createdAt)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No tickets found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} tickets
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= data.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
