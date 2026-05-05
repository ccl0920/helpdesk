import { TicketStatus, TicketCategory } from './ticket';

export const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'teal' | 'coral' }> = {
  [TicketStatus.NEW]: { label: 'New', variant: 'teal' },
  [TicketStatus.PROCESSING]: { label: 'Processing', variant: 'secondary' },
  [TicketStatus.OPEN]: { label: 'Open', variant: 'default' },
  [TicketStatus.RESOLVED]: { label: 'Resolved', variant: 'outline' },
  [TicketStatus.CLOSED]: { label: 'Closed', variant: 'secondary' },
};

export const CATEGORY_CONFIG: Record<TicketCategory, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'teal' | 'coral' }> = {
  [TicketCategory.GENERAL_QUESTION]: { label: 'General Question', variant: 'outline' },
  [TicketCategory.TECHNICAL_QUESTION]: { label: 'Technical Question', variant: 'teal' },
  [TicketCategory.REFUND_REQUEST]: { label: 'Refund Request', variant: 'coral' },
};
