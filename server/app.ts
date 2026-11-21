import express, { type Express } from 'express';
import { apiRouter } from './routes/api';

export function createExpressApp(): Express {
  const app = express();
  app.set('trust proxy', 1);

  // Security headers: CSP, nosniff, Referrer-Policy, microphone permission restricted to self
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'microphone=(self), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob:",
        "media-src 'self' data: blob:",
        "connect-src 'self' ws: wss:",
        "object-src 'none'",
        "base-uri 'self'",
      ].join('; '),
    );

    // Explicit origin-aware CORS (never wildcard '*' on authenticated endpoints)
    const origin = req.headers.origin;
    const allowedOrigins = new Set<string>();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (host) {
      allowedOrigins.add(`http://${host}`);
      allowedOrigins.add(`https://${host}`);
    }
    if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
      try {
        allowedOrigins.add(new URL(process.env.APP_URL).origin);
      } catch {
        // Ignore invalid APP_URL
      }
    }

    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

  app.use(express.json({ limit: '15mb' }));
  app.use('/api', apiRouter);

  return app;
}
