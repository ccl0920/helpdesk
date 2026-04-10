import { z } from 'zod';

/**
 * TicketStatus enum values (matches Prisma schema)
 */
export enum TicketStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/**
 * TicketCategory enum values (matches Prisma schema)
 */
export enum TicketCategory {
  GENERAL_QUESTION = 'GENERAL_QUESTION',
  TECHNICAL_QUESTION = 'TECHNICAL_QUESTION',
  REFUND_REQUEST = 'REFUND_REQUEST',
}

/**
 * Reusable field schemas for ticket validation
 */
export const ticketSubjectField = z.string().trim().min(1, 'Subject is required');
export const ticketDescriptionField = z.string().trim().min(1, 'Description is required');
export const ticketEmailField = z.string().email('Invalid email format');
export const ticketSenderNameField = z.string().trim().min(1, 'Sender name is required');
export const ticketStatusField = z.nativeEnum(TicketStatus, { message: 'Status must be OPEN, RESOLVED, or CLOSED' });
export const ticketCategoryField = z.nativeEnum(TicketCategory, { message: 'Invalid category' }).nullable().optional();

/**
 * Zod schema for creating a ticket
 * Used by both frontend (form validation) and backend (request validation)
 */
export const createTicketSchema = z.object({
  subject: ticketSubjectField,
  description: ticketDescriptionField,
  emailFrom: ticketEmailField,
  senderName: ticketSenderNameField,
  emailTo: ticketEmailField,
  category: ticketCategoryField,
});

/**
 * Zod schema for creating a ticket from email
 * Simpler schema for email ingestion (category is auto-assigned later)
 */
export const createTicketFromEmailSchema = z.object({
  subject: ticketSubjectField,
  description: ticketDescriptionField,
  emailFrom: ticketEmailField,
  senderName: ticketSenderNameField,
  emailTo: ticketEmailField,
});

/**
 * Zod schema for updating a ticket
 * All fields are optional for updates
 */
export const updateTicketSchema = z.object({
  status: ticketStatusField.optional(),
  category: ticketCategoryField,
  assignedToId: z.string().nullable().optional(),
});

/**
 * Zod schema for adding a message to a ticket
 */
export const createMessageSchema = z.object({
  from: ticketEmailField,
  to: ticketEmailField,
  subject: ticketSubjectField,
  body: z.string().trim().min(1, 'Message body is required'),
  bodyHtml: z.string().trim().optional(),
});

/**
 * Types inferred from schemas
 */
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateTicketFromEmailInput = z.infer<typeof createTicketFromEmailSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

/**
 * Valid columns that can be sorted (shared between frontend and backend)
 */
export const VALID_SORT_COLUMNS = ['id', 'subject', 'emailFrom', 'status', 'category', 'createdAt'] as const;
export type SortColumn = typeof VALID_SORT_COLUMNS[number];
export type SortOrder = 'asc' | 'desc';

/**
 * Zod schema for listing tickets query parameters
 * Used by both frontend (type inference) and backend (request validation)
 */
export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(TicketCategory).optional(),
  assignedToId: z.string().optional().nullable(),
  sortBy: z.enum(VALID_SORT_COLUMNS).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
