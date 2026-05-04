import { Router, Request, Response } from 'express';
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
router.get('/dashboard/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await prisma.$queryRaw<{ get_dashboard_stats: DashboardStats }[]>`
      SELECT get_dashboard_stats() as get_dashboard_stats
    `;

    const stats = result[0]?.get_dashboard_stats;

    if (!stats) {
      return res.status(500).json({
        error: 'Failed to fetch dashboard stats',
        details: 'Stored function returned empty result',
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
