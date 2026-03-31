import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import prisma from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import { authLimiter, generalLimiter } from './middleware/rateLimiter.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Parse trusted origins from environment variable
const trustedOrigins = (process.env.TRUSTED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

// CORS middleware (must be first)
app.use(cors({
  origin: trustedOrigins,
  credentials: true
}));

// Security headers (must be before other middleware)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.VITE_API_URL || 'http://localhost:3001'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Auth routes with rate limiting (must be before express.json())
app.use('/api/auth', authLimiter, authRoutes);

// Admin routes (protected by requireAdmin middleware)
app.use('/api/admin', adminRoutes);

// Other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check (rate limited)
app.get('/api/health', generalLimiter, async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (error) {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'disconnected' });
  }
});

// API base (rate limited)
app.get('/api', generalLimiter, (req, res) => {
  res.json({ message: 'Helpdesk API v1' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log full error for debugging
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  // Return generic error in production, details in development
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({
    error: 'Internal server error',
    ...(isProduction ? {} : { details: err.message }),
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  try {
    await prisma.$connect();
    console.log('📦 Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
});

export default app;
