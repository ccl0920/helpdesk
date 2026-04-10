import { TicketStatus, TicketCategory } from './ticket';

export const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  [TicketStatus.OPEN]: { label: 'Open', variant: 'default' },
  [TicketStatus.RESOLVED]: { label: 'Resolved', variant: 'outline' },
  [TicketStatus.CLOSED]: { label: 'Closed', variant: 'secondary' },
};

export const CATEGORY_CONFIG: Record<TicketCategory, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  [TicketCategory.GENERAL_QUESTION]: { label: 'General', variant: 'outline' },
  [TicketCategory.TECHNICAL_QUESTION]: { label: 'Technical', variant: 'outline' },
  [TicketCategory.REFUND_REQUEST]: { label: 'Refund', variant: 'destructive' },
};
