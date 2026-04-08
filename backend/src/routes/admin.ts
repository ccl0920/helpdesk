import { Router, Request } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import prisma, { Role } from '../lib/prisma.js';
import { auth } from '../auth.js';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { createUserSchema } from '@helpdesk/common';

const router = Router();

// All admin routes are protected by requireAdmin middleware
router.use(requireAdmin);

/**
 * Zod schema for updating a user
 */
const updateUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  role: z.enum(['AGENT', 'ADMIN'], { message: 'Role must be AGENT or ADMIN' }),
});

/**
 * PUT /api/admin/users/:id
 * Update a user (admin only)
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate request body with Zod
    const validationResult = updateUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || 'Invalid request data';
      return res.status(400).json({ error: errorMessage });
    }

    const { name, email, password, role } = validationResult.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is taken by another user
    const emailTaken = await prisma.user.findUnique({
      where: { email },
    });

    if (emailTaken && emailTaken.id !== id) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Update user and optionally password
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user details
      const user = await tx.user.update({
        where: { id },
        data: {
          email,
          name,
          role: role as Role,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      // Update password if provided
      if (password && password.length > 0) {
        const hashedPassword = await bcrypt.hash(password, 12);
        await tx.account.updateMany({
          where: {
            userId: id,
            providerId: 'credential',
          },
          data: {
            password: hashedPassword,
          },
        });
      }

      return user;
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 */
router.post('/users', async (req, res) => {
  try {
    // Validate request body with Zod schema from common package
    const validationResult = createUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || 'Invalid request data';
      return res.status(400).json({ error: errorMessage });
    }

    const { name, email, password, role } = validationResult.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password using same method as auth config
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user directly in database using transaction
    const newUser = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          email,
          name,
          role: role as Role,
          emailVerified: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      // Create the account for email/password authentication
      await tx.account.create({
        data: {
          userId: user.id,
          providerId: 'credential',
          accountId: user.id,
          accountType: 'email',
          password: hashedPassword,
        },
      });

      return user;
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user role (admin only)
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['AGENT', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be AGENT or ADMIN' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user (admin only)
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Type assertion: session is guaranteed by requireAdmin middleware
    const session = (req as Request & { session?: typeof auth.$Infer.Session }).session;

    // Prevent self-deletion
    if (session?.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
