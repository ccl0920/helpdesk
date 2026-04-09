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
  type CreateTicketInput,
  type CreateTicketFromEmailInput,
  type UpdateTicketInput,
  type CreateMessageInput,
} from './schemas/ticket';
