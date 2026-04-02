import axios from 'axios';
import { API_BASE_URL } from './config';

/**
 * User interface matching backend Prisma schema
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'AGENT' | 'ADMIN';
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
  role: 'AGENT' | 'ADMIN';
}

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
