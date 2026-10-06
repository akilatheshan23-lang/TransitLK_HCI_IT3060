import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectToDatabase, closeDatabase } from './db/connection.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

// Security and middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in dev
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Root & Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'TransitLK Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'connected',
    time: new Date().toISOString(),
  });
});

// Auth API Routes
app.use('/api/auth', authRouter);

// Admin Management API Routes
app.use('/api/admin', adminRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    await connectToDatabase();

    const server = app.listen(Number(PORT), HOST, () => {
      console.log(`🚀 TransitLK API Server running on http://${HOST}:${PORT}`);
      console.log(`📡 Local network: http://172.20.10.2:${PORT}`);
      console.log(`🔒 Connected to MongoDB database: ${process.env.MONGODB_DB || 'transitlk'}`);
    });

    const shutdown = async () => {
      console.log('\nStopping TransitLK API server...');
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
