import { transitRouter } from './transit.js';
import { lostFoundRouter } from './lostFound.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { busesRouter } from './routes/buses.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { hashPassword, verifyPassword, newToken, tokenHash, publicUser } from './auth.js';

const ownerPortalFile = fileURLToPath(new URL('owner-portal.html', import.meta.url));
const language = z.enum(['en', 'ta', 'si']);
const credentials = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(8).max(128) }).strict();
const registration = credentials.extend({ name: z.string().trim().min(2).max(80), language: language.default('en') });

export function createApp(store, { origins = ['http://localhost:8081', 'http://127.0.0.1:8081', 'http://localhost:3001', 'http://127.0.0.1:3001'], limit = 20 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || origins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) }));
  app.use(express.json({ limit: '16kb' }));
  app.get('/', (_req, res) => res.json({
    status: 'online',
    service: 'TransitLK Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }));
  app.get(['/owner', '/owner-portal'], async (_req, res) => {
    const html = await readFile(ownerPortalFile, 'utf8');
    const key = JSON.stringify(process.env.GEOAPIFY_API_KEY || '').replaceAll('<', '\\u003c');
    res.type('html').send(html.replace("const GEOAPIFY_API_KEY = '';", 'const GEOAPIFY_API_KEY = ' + key + ';'));
  });
  app.get('/api/owner/overview', (_req, res) => res.json({
    operator: 'Lanka Ashok Leyland Fleet #LK-BUS-4029',
    ownerName: 'Bandara Silva',
    todayRevenue: 45800,
    yesterdayRevenue: 40890,
    revenueChangePercent: 12,
    activeBuses: 24,
    totalBuses: 28,
    inMaintenance: 4,
    delayedTrips: 3,
    avgDelayMinutes: 12,
    routes: [
      { route: '177', from: 'Kaduwela', to: 'Kollupitiya', busNumber: 'NA-4402', status: 'On-time', etaMinutes: 5, revenue: 8420 },
      { route: '179', from: 'Maharagama', to: 'Bambalapitiya', busNumber: 'NB-8891', status: 'Delayed', etaMinutes: 12, revenue: 6350 },
      { route: '185', from: 'Pettah', to: 'Nugegoda', busNumber: 'NC-1204', status: 'On-time', etaMinutes: 8, revenue: 9120 },
      { route: '187', from: 'Colombo Fort', to: 'Katunayake Airport', busNumber: 'ND-5541', status: 'On-time', etaMinutes: 3, revenue: 7890 },
      { route: '189', from: 'Moratuwa', to: 'Rajagiriya', busNumber: 'NE-7721', status: 'Delayed', etaMinutes: 18, revenue: 5230 }
    ]
  }));
  app.get('/api/health', async (_req, res) => {
    try { await store.ping(); res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() }); }
    catch { res.status(503).json({ error: 'Service temporarily unavailable.' }); }
  });
  app.get('/api/home', (_req, res) => res.json({ name: 'TransitLK', languages: ['en', 'ta', 'si'], notifications: [] }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many attempts. Please try again in 15 minutes.' } }));

  async function issueSession(user, res, status = 200) {
    const token = newToken();
    await store.createSession({ tokenHash: tokenHash(token), userId: String(user._id), expiresAt: new Date(Date.now() + 7 * 86400000) });
    res.status(status).json({ token, user: publicUser(user) });
  }
  app.post('/api/auth/register', async (req, res, next) => {
    const result = registration.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: 'Enter a name, valid email and password of 8–128 characters.' });
    const { password, ...data } = result.data;
    try {
      const user = await store.createUser({ ...data, passwordHash: await hashPassword(password), role: 'passenger', createdAt: new Date() });
      await issueSession(user, res, 201);
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      next(error);
    }
  });
  app.post('/api/auth/login', async (req, res) => {
    const result = credentials.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
    const user = await store.findEmail(result.data.email);
    // Run the same expensive hash check even when the address does not exist.
    const dummy = '00000000000000000000000000000000:' + '00'.repeat(64);
    const valid = await verifyPassword(result.data.password, user?.passwordHash || dummy);
    if (!user || !valid) return res.status(401).json({ error: 'Email or password is incorrect.' });
    await issueSession(user, res);
  });
  async function authenticate(req, res, next) {
    const raw = req.get('authorization') || '';
    if (!/^Bearer [a-f0-9]{64}$/.test(raw)) return res.status(401).json({ error: 'Please sign in again.' });
    req.sessionHash = tokenHash(raw.slice(7));
    const session = await store.findSession(req.sessionHash);
    req.user = session && await store.findUser(session.userId);
    if (!req.user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    next();
  }
  app.get('/api/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));
  app.patch('/api/me/preferences', authenticate, async (req, res) => {
    const result = z.object({ language }).strict().safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: 'Choose English, Tamil or Sinhala.' });
    const user = await store.updateLanguage(req.user._id, result.data.language);
    res.json({ user: publicUser(user) });
  });
  app.post('/api/auth/logout', authenticate, async (req, res) => {
    await store.deleteSession(req.sessionHash);
    res.status(204).end();
  });
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/buses', busesRouter);
  app.use('/api', lostFoundRouter(store, authenticate));
  app.use('/api', transitRouter(store, authenticate));
  app.use((_req, res) => res.status(404).json({ error: 'This endpoint does not exist.' }));
  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
    // Never log request bodies, passwords, authorization headers or connection strings.
    console.error('API request failed:', error.name);
    res.status(503).json({ error: 'We could not connect right now. Please try again.' });
  });
  return app;
}
