import { Router, Request } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { auth } from '../auth.js';

const router = Router();

// All admin routes are protected by requireAdmin middleware
router.use(requireAdmin);

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
