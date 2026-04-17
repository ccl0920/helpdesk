import axios from 'axios';
import { z } from 'zod';
import { API_BASE_URL } from './config';

import { Role } from './role';
import { TicketStatus, TicketCategory, SenderType, listTicketsQuerySchema, type CreateMessageInput, type PolishReplyInput } from '@helpdesk/common';

/**
 * User interface matching backend Prisma schema
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  emailVerified: boolean | null;
  createdAt: string;
}

/**
 * Create user input data
 */
export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

/**
 * Update user input data (password is optional)
 */
export interface UpdateUserInput {
  name: string;
  email: string;
  password?: string;
  role: Role;
}

/**
 * Ticket message interface
 */
export interface TicketMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  bodyHtml: string | null;
  senderType: SenderType;
  createdAt: string;
}

/**
 * Ticket interface matching backend Prisma schema
 */
export interface Ticket {
  id: bigint;
  subject: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory | null;
  emailFrom: string;
  senderName: string;
  emailTo: string;
  assignedToId: string | null;
  summary?: string | null;
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated tickets response
 */
export interface PaginatedTickets {
  tickets: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query parameters for listing tickets (inferred from shared schema)
 */
export type TicketQueryParams = z.infer<typeof listTicketsQuerySchema>;

// Axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch all users (admin only)
 */
export async function fetchUsers(): Promise<User[]> {
  const response = await api.get<User[]>('/api/admin/users');
  return response.data;
}

/**
 * Create a new user (admin only)
 */
export async function createUser(data: CreateUserInput): Promise<User> {
  try {
    const response = await api.post<User>('/api/admin/users', data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Update a user (admin only)
 */
export async function updateUser(id: string, data: UpdateUserInput): Promise<User> {
  try {
    const response = await api.put<User>(`/api/admin/users/${id}`, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(id: string): Promise<{ message: string }> {
  try {
    const response = await api.delete<{ message: string }>(`/api/admin/users/${id}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Fetch tickets with pagination and filtering
 */
export async function fetchTickets(params: Partial<TicketQueryParams> = {}): Promise<PaginatedTickets> {
  const response = await api.get<PaginatedTickets>('/api/tickets', { params: { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc', ...params } });
  return response.data;
}

/**
 * Fetch a single ticket by ID
 */
export async function fetchTicketById(id: string): Promise<Ticket> {
  const response = await api.get<Ticket>(`/api/tickets/${id}`);
  return response.data;
}

/**
 * Update a ticket
 */
export async function updateTicket(id: string, data: { status?: TicketStatus; category?: TicketCategory | null; assignedToId?: string | null }): Promise<Ticket> {
  try {
    const response = await api.put<Ticket>(`/api/tickets/${id}`, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Fetch all users (for agent assignment)
 * Returns only users with AGENT or ADMIN role
 */
export async function fetchAgents(): Promise<User[]> {
  const response = await api.get<User[]>('/api/admin/users');
  return response.data;
}

/**
 * Add a message/reply to a ticket
 */
export async function addMessage(ticketId: string, data: CreateMessageInput): Promise<Ticket> {
  try {
    const response = await api.post<Ticket>(`/api/tickets/${ticketId}/messages`, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Polish an agent's reply using GLM AI
 */
export async function polishReply(data: PolishReplyInput): Promise<{ polishedText: string }> {
  try {
    const response = await api.post<{ polishedText: string }>('/api/tickets/polish', data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

/**
 * Summarize a ticket and its conversation history using GLM AI
 */
export async function summarizeTicket(ticketId: string): Promise<{ summary: string }> {
  try {
    const response = await api.post<{ summary: string }>(`/api/tickets/${ticketId}/summarize`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}
