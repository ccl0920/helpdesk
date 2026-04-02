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
 * Fetch all users (admin only)
 */
export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Unauthorized');
    }
    if (res.status === 403) {
      throw new Error('Forbidden: Admin access required');
    }
    throw new Error('Failed to fetch users');
  }

  return res.json();
}
