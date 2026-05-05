import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

interface TicketsPerDay {
  date: string;
  count: number;
}

interface DashboardStats {
  total: number;
  open: number;
  aiResolved: number;
  percentAiResolved: number;
  avgResolutionTimeHours: number | null;
  ticketsPerDay: TicketsPerDay[];
}

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics via stored function
 */
router.get('/dashboard/stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.$queryRaw<{ get_dashboard_stats: DashboardStats }[]>`
      SELECT get_dashboard_stats() as get_dashboard_stats
    `;

    const stats = result[0]?.get_dashboard_stats;

    if (!stats) {
      return next(new Error('Stored function returned empty result'));
    }

    res.json(stats);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    next(new Error(`Failed to fetch dashboard stats: ${msg}`, { cause: error }));
  }
});

export default router;
