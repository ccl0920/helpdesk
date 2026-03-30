import { Request, Response, NextFunction } from 'express';
import { auth } from '../auth.js';

// Extend Express Request type to include session
declare module 'express' {
  interface Request {
    session?: typeof auth.$Infer.Session;
  }
}

/**
 * Middleware to protect routes that require authentication
 * Attaches session to req.session if authenticated
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.session = session;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Optional auth middleware - attaches session if available but doesn't block
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    req.session = session ?? undefined;
  } catch (error) {
    // Ignore errors, continue without session
  }
  next();
}
