/**
 * Application configuration
 * Uses environment variables with sensible defaults for development
 */

// In development, use the Vite dev server proxy (relative URL)
// In production, use the environment variable
export const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '')
  : '';

// Validate configuration in production
if (import.meta.env.PROD) {
  if (!import.meta.env.VITE_API_URL) {
    console.warn('VITE_API_URL is not set. Using default value.');
  }
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.startsWith('https://')) {
    console.error('SECURITY WARNING: VITE_API_URL should use HTTPS in production');
  }
}
