import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import type { PaginatedTickets, Ticket } from '@/lib/api';

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
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export function TicketsTable({ data, isLoading, page, onPageChange, sortBy, sortOrder, onSortChange }: TicketsTableProps) {
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

  // Define columns with TanStack Table
  const columns: ColumnDef<Ticket>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-medium text-muted-foreground">
          {formatTicketId(row.getValue('id'))}
        </span>
      ),
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => (
        <span className="font-medium max-w-xs truncate block">
          {row.getValue('subject')}
        </span>
      ),
    },
    {
      accessorKey: 'emailFrom',
      header: 'From',
      cell: ({ row }) => {
        const ticket = row.original;
        return (
          <div className="flex flex-col">
            {ticket.senderName && (
              <span className="text-sm font-medium">{ticket.senderName}</span>
            )}
            <span className="text-sm text-muted-foreground">{ticket.emailFrom}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as TicketStatus;
        return (
          <Badge variant={STATUS_CONFIG[status].variant}>
            {STATUS_CONFIG[status].label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.getValue('category') as TicketCategory | null;
        return category ? (
          <Badge variant={CATEGORY_CONFIG[category].variant}>
            {CATEGORY_CONFIG[category].label}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDate(row.getValue('createdAt'))}
        </span>
      ),
    },
  ];

  // Create virtual data for loading state
  const loadingData = Array.from({ length: 5 }).map((_, i) => ({
    id: BigInt(i),
    subject: '',
    description: '',
    status: TicketStatus.OPEN,
    category: null,
    emailFrom: '',
    senderName: '',
    emailTo: '',
    assignedToId: null,
    assignedTo: null,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Use actual data or empty array
  const tableData = data?.tickets || [];

  // Setup TanStack Table
  const table = useReactTable({
    data: isLoading ? loadingData : tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true, // Server-side sorting
    initialState: {
      sorting: [{ id: sortBy, desc: sortOrder === 'desc' }],
    },
  });

  // Handle sort on column header click
  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      // Toggle sort order
      onSortChange(columnId, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending
      onSortChange(columnId, 'desc');
    }
  };

  // Get sort icon for column
  const getSortIcon = (columnId: string) => {
    if (sortBy !== columnId) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          ))}
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
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort(header.column.id)}
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                  >
                    {header.isPlaceholder
                      ? null
                      : header.column.columnDef.header as string}
                    {getSortIcon(header.column.id)}
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.original.id.toString()}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
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
