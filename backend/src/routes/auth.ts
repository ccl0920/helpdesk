import { Router } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../auth.js';

const router = Router();

// Better Auth Express handler - catch-all for auth routes
// Express 5 uses *splat pattern for catch-all
router.all('/*splat', toNodeHandler(auth));

export default router;
