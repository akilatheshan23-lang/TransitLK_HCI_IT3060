import { transitRouter } from './transit.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { hashPassword, verifyPassword, newToken, tokenHash, publicUser } from './auth.js';

const language = z.enum(['en', 'ta', 'si']);
const credentials = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(8).max(128) }).strict();
const registration = credentials.extend({ name: z.string().trim().min(2).max(80), language: language.default('en') });

export function createApp(store, { origins = ['http://localhost:8081'], limit = 20 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || origins.includes(origin)) }));
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', async (_req, res) => {
    try { await store.ping(); res.json({ status: 'ok', database: 'connected' }); }
    catch { res.status(503).json({ error: 'Service temporarily unavailable.' }); }
  });
  app.get('/api/home', (_req, res) => res.json({ name: 'TransitLK', languages: ['en', 'ta', 'si'], notifications: [] }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many attempts. Please try again in 15 minutes.' } }));

  async function issueSession(user, res, status = 200) {
    const token = newToken();
    await store.createSession({ tokenHash: tokenHash(token), userId: String(user._id), expiresAt: new Date(Date.now() + 7 * 86400000) });
    res.status(status).json({ token, user: publicUser(user) });
  }
  app.post('/api/auth/register', async (req, res) => {
    const result = registration.safeParse(req.body);
    if (!result.success) return res.status(400).json({ error: 'Enter a name, valid email and password of 8–128 characters.' });
    const { password, ...data } = result.data;
    try {
      const user = await store.createUser({ ...data, passwordHash: await hashPassword(password), role: 'passenger', createdAt: new Date() });
      await issueSession(user, res, 201);
    } catch (error) {
      if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      throw error;
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
