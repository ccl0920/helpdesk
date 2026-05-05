import * as Sentry from '@sentry/node';

/**
 * Custom Sentry transport using Bun's native fetch.
 * Works around issues with Sentry's default Node HTTP transport
 * when behind corporate proxies.
 */
function makeFetchTransport(options: { url: string; headers?: Record<string, string> }): any {
  return Sentry.createTransport({ recordDroppedEvent: () => undefined }, async (request: any) => {
    const body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);

    const response = await fetch(options.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        ...(options.headers || {}),
      },
      body,
    });

    return {
      statusCode: response.status,
      headers: {
        'x-sentry-rate-limits': response.headers.get('x-sentry-rate-limits'),
        'retry-after': response.headers.get('retry-after'),
      },
    };
  });
}

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '1.0'),
    transport: makeFetchTransport,
  });

  // // Verify transport by sending a test message on startup
  // const testEventId = Sentry.captureMessage('Sentry backend initialized', 'info');
  // console.log(`[Sentry] Initialized with DSN. Test event ID: ${testEventId}`);

  // // Flush to ensure the test message is sent immediately
  // Sentry.flush(2000).then(() => {
  //   console.log('[Sentry] Startup flush complete');
  // }).catch((err) => {
  //   console.error('[Sentry] Startup flush failed:', err);
  // });
} else {
  console.warn('[Sentry] SENTRY_DSN not set — error tracking disabled');
}
