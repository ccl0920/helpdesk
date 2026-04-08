import { z } from 'zod';

/**
 * Role enum values (matches Prisma schema)
 */
export enum Role {
  AGENT = 'AGENT',
  ADMIN = 'ADMIN',
}

/**
 * Reusable field schemas for common validation patterns
 */
export const nameField = z.string().trim().min(3, 'Name must be at least 3 characters');
export const emailField = z.string().email('Invalid email format');
export const passwordField = z.string().trim().min(8, 'Password must be at least 8 characters');
export const roleField = z.nativeEnum(Role, { message: 'Role must be AGENT or ADMIN' });

/**
 * Zod schema for creating a user
 * Used by both frontend (form validation) and backend (request validation)
 */
export const createUserSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  role: roleField,
});

/**
 * Zod schema for updating a user
 * Password is optional for updates (can be empty string or omitted)
 */
export const updateUserSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField.optional().or(z.literal('')),
  role: roleField,
});

/**
 * Zod schema for updating user role
 */
export const updateRoleSchema = z.object({
  role: roleField,
});

/**
 * Type inferred from createUserSchema
 */
export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Type inferred from updateUserSchema
 */
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Type inferred from updateRoleSchema
 */
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
