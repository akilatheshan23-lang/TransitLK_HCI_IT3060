import { connectToDatabase, closeDatabase } from './db/connection.js';
import { createMongoStore } from './store.js';
import { createApp } from './app.js';
import { seedDefaultRoutesAndBuses } from './routes/buses.js';

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

let connectedStore = null;

// Proxy store that delegates calls to connectedStore once DB is connected
const store = new Proxy({}, {
  get: (_target, method) => async (...args) => {
    if (!connectedStore) throw new Error('Database unavailable');
    return connectedStore[method](...args);
  }
});

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081,http://localhost:3001,http://127.0.0.1:3001').split(',');

const app = createApp(store, { origins: corsOrigins });

let server = null;

async function start() {
  try {
    const db = await connectToDatabase();
    connectedStore = await createMongoStore(db);
    console.log('MongoDB connected.');

    // Seed default Colombo bus routes and master fleet if needed
    try {
      await seedDefaultRoutesAndBuses();
    } catch (seedErr) {
      console.warn('Bus seeding warning:', seedErr.message);
    }

    server = app.listen(PORT, HOST, () => {
      console.log(`TransitLK API listening on port ${PORT}`);
      console.log(`Web / Admin access on http://${HOST}:${PORT}`);
    });
  } catch (error) {
    const authFailure = (error.code === 8000 || error.code === 18) && /auth|credential/i.test(error.message);
    console.error(authFailure
      ? 'MongoDB authentication rejected. Correct the Atlas database-user credentials in backend/.env and restart Backend. Retrying in 30 seconds.'
      : 'MongoDB unavailable (' + error.name + '). Check Atlas network access, cluster availability and credentials. Retrying in 30 seconds.');

    // Start listening so tests and endpoints work with graceful 503 if DB is offline
    server = app.listen(PORT, HOST, () => {
      console.log(`TransitLK API listening (offline mode) on port ${PORT}`);
    });

    // Retry connection in background every 30 seconds
    const retry = setInterval(async () => {
      try {
        const db = await connectToDatabase();
        connectedStore = await createMongoStore(db);
        console.log('MongoDB reconnected.');
        clearInterval(retry);
      } catch (e) {
        console.error('MongoDB retry failed:', e.name);
      }
    }, 30000);
  }
}

const stop = async () => {
  if (server) {
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', stop);
process.on('SIGINT', stop);

void start();
