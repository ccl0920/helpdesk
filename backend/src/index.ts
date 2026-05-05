import './instrument.js';
import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import prisma from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import ticketRoutes from './routes/tickets.js';
import dashboardRoutes from './routes/dashboard.js';
import { authLimiter, generalLimiter } from './middleware/rateLimiter.js';
import { startImapPolling, stopImapPolling } from './services/emailProviders/imapProvider.js';
import { initWebhookProvider } from './services/emailProviders/webhookProvider.js';
import { startQueue, stopQueue } from './lib/queue.js';
import { registerClassificationWorker } from './lib/classification.js';
import { registerAutoResolutionWorker } from './lib/autoResolution.js';

// Add BigInt serialization support for JSON.stringify
// This prevents "Do not know how to serialize a BigInt" errors
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

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

// Body parsing middleware (must be before routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize email services
const emailProvider = process.env.EMAIL_PROVIDER || 'none';

if (emailProvider === 'imap' || emailProvider === 'both') {
  // Validate IMAP configuration
  if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
    console.warn('⚠️  IMAP configuration incomplete. Email polling disabled.');
  } else {
    startImapPolling({
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT || '993'),
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      tls: process.env.IMAP_TLS !== 'false',
      mailbox: process.env.IMAP_MAILBOX || 'INBOX',
      pollingInterval: parseInt(process.env.EMAIL_POLLING_INTERVAL || '30000'),
    });
  }
}

if (emailProvider === 'webhook' || emailProvider === 'both') {
  initWebhookProvider({
    secret: process.env.WEBHOOK_SECRET,
  });
}

if (emailProvider === 'none') {
  console.log('📭 Email ingestion disabled (set EMAIL_PROVIDER=imap, webhook, or both)');
}

// Auth routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes);

// Admin routes (protected by requireAdmin middleware)
app.use('/api/admin', adminRoutes);

// Ticket routes (protected by requireAuth middleware)
app.use('/api', ticketRoutes);

// Dashboard routes (protected by requireAuth middleware)
app.use('/api', dashboardRoutes);

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
app.use(async (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Send to Sentry and flush to ensure delivery
  let eventId: string | undefined;
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      scope.setContext('request', {
        url: req.url,
        method: req.method,
        headers: req.headers,
      });
      eventId = Sentry.captureException(err);
    });

    try {
      await Sentry.flush(2000);
    } catch (flushErr: any) {
      Sentry.captureMessage('Sentry flush failed in error handler', 'error');
    }
  }

  // Return generic error in production, details in development
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    error: 'Internal server error',
    sentryEventId: eventId,
    ...(isProduction ? {} : { details: err.message }),
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down...');
  await stopQueue();
  await stopImapPolling();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down...');
  await stopQueue();
  await stopImapPolling();
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  try {
    await prisma.$connect();
    console.log('📦 Database connected');
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'database' },
      extra: { phase: 'startup' },
    });
  }

  try {
    await startQueue();
    registerClassificationWorker();
    registerAutoResolutionWorker();
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'job-queue' },
      extra: { phase: 'startup' },
    });
  }
});

export default app;
