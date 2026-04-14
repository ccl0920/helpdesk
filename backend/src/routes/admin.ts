import { Router, Request } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import prisma, { Role } from '../lib/prisma.js';
import { auth } from '../auth.js';
import bcrypt from 'bcrypt';
import { createUserSchema, updateUserSchema, updateRoleSchema } from '@helpdesk/common';

const router = Router();

// All admin routes are protected by requireAdmin middleware
router.use(requireAdmin);

/**
 * PUT /api/admin/users/:id
 * Update a user (admin only)
 */
router.put('/users/:id', validateRequest(updateUserSchema), async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { name, email, password, role } = req.body as { name: string; email: string; password?: string; role: Role };

    // Check if user exists and is not deleted
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingUser.deletedAt) {
      return res.status(400).json({ error: 'Cannot update a deleted user' });
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
router.post('/users', validateRequest(createUserSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.body as { name: string; email: string; password: string; role: Role };

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
      where: {
        deletedAt: null,
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
router.put('/users/:id/role', validateRequest(updateRoleSchema), async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { role } = req.body as { role: Role };

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
 * Soft delete a user (admin only)
 * Admin users cannot be deleted
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

    // Check if user exists and is not already deleted
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.deletedAt) {
      return res.status(400).json({ error: 'User is already deleted' });
    }

    // Prevent deleting admin users
    if (user.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot delete admin users' });
    }

    // Soft delete by setting deletedAt and revoke all sessions
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      // Unassign all tickets from the deleted user
      await tx.ticket.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      });

      // Revoke all sessions for the deleted user
      await tx.session.deleteMany({
        where: { userId: id },
      });
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
