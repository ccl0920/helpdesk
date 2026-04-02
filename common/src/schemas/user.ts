import { z } from 'zod';

/**
 * Zod schema for creating a user
 * Used by both frontend (form validation) and backend (request validation)
 */
export const createUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().trim().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['AGENT', 'ADMIN'], { message: 'Role must be AGENT or ADMIN' }),
});

/**
 * Zod schema for updating user role
 */
export const updateRoleSchema = z.object({
  role: z.enum(['AGENT', 'ADMIN'], { message: 'Role must be AGENT or ADMIN' }),
});

/**
 * Type inferred from createUserSchema
 */
export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Type inferred from updateRoleSchema
 */
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
