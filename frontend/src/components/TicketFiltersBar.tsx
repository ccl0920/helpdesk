import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { TicketStatus, TicketCategory } from '@helpdesk/common';

interface TicketFilters {
  search?: string;
  status?: TicketStatus;
  category?: TicketCategory;
  assignedToId?: string | null;
}

interface TicketFiltersBarProps {
  filters: TicketFilters;
  onFilterChange: (filters: TicketFilters) => void;
}

/**
 * Convert enum value (e.g., GENERAL_QUESTION) to display-friendly format (e.g., "General Question")
 */
function formatEnumValue(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = Object.values(TicketStatus)
  .filter((status) => status !== TicketStatus.NEW && status !== TicketStatus.PROCESSING)
  .map((status) => ({
    value: status,
    label: formatEnumValue(status),
  }));

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = Object.values(TicketCategory).map((category) => ({
  value: category,
  label: formatEnumValue(category),
}));

export function TicketFiltersBar({ filters, onFilterChange }: TicketFiltersBarProps) {
  const hasActiveFilters = filters.search || filters.status || filters.category || filters.assignedToId;

  const handleClearFilters = () => {
    onFilterChange({});
  };

  const handleSearchChange = (value: string) => {
    onFilterChange({
      ...filters,
      search: value || undefined,
    });
  };

  const handleStatusChange = (value: string | null) => {
    onFilterChange({
      ...filters,
      status: value === 'all' || value === null ? undefined : value as TicketStatus,
    });
  };

  const handleCategoryChange = (value: string | null) => {
    onFilterChange({
      ...filters,
      category: value === 'all' || value === null ? undefined : value as TicketCategory,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets by subject, email, or description..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 rounded-full bg-background border-border/60"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[180px] rounded-full bg-background border-border/60">
            {filters.status
              ? STATUS_OPTIONS.find((s) => s.value === filters.status)?.label
              : <span className="text-muted-foreground">All statuses</span>}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={filters.category || 'all'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-[200px] rounded-full bg-background border-border/60">
            {filters.category
              ? CATEGORY_OPTIONS.find((c) => c.value === filters.category)?.label
              : <span className="text-muted-foreground">All categories</span>}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2 rounded-full border-border/80"
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
