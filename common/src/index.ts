// Shared schemas for frontend and backend
export {
  Role,
  nameField,
  emailField,
  passwordField,
  roleField,
  createUserSchema,
  updateUserSchema,
  updateRoleSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UpdateRoleInput,
} from './schemas/user';

export {
  TicketStatus,
  TicketCategory,
  SenderType,
  ticketSubjectField,
  ticketDescriptionField,
  ticketEmailField,
  ticketSenderNameField,
  ticketStatusField,
  ticketCategoryField,
  createTicketSchema,
  createTicketFromEmailSchema,
  updateTicketSchema,
  createMessageSchema,
  VALID_SORT_COLUMNS,
  listTicketsQuerySchema,
  type CreateTicketInput,
  type CreateTicketFromEmailInput,
  type UpdateTicketInput,
  type CreateMessageInput,
  type SortColumn,
  type SortOrder,
  type ListTicketsQuery,
} from './schemas/ticket';

export {
  STATUS_CONFIG,
  CATEGORY_CONFIG,
} from './schemas/ticket-config';
