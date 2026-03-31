import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Rate limiter for authentication endpoints
 * Only applies in production
 * Only applies to POST requests (sign-in, sign-up, password reset)
 * Allows 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Only rate limit POST requests (sign-in, sign-up, password reset)
  // GET requests (get-session) should not count against the limit
  skip: (req) => !isProduction || req.method !== 'POST',
});

/**
 * Rate limiter for general API endpoints
 * Only applies in production
 * Allows 100 requests per 15 minutes per IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});
