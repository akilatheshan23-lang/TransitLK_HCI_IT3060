import { MongoClient } from 'mongodb';
import dns from 'dns';

// Set public reliable DNS servers to prevent SRV resolution drops on local ISP/router DNS
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  console.warn('[MongoDB DNS] Could not override default DNS servers:', e.message);
}

// Bulletproof custom lookup that queries public DNS (8.8.8.8, 1.1.1.1)
// to prevent personal hotspot (172.20.10.1) and ISP DNS drops for MongoDB Atlas replica sets
export const customMongoLookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (!err && addresses && addresses.length > 0) {
      if (options && options.all) {
        return callback(null, addresses.map((addr) => ({ address: addr, family: 4 })));
      }
      return callback(null, addresses[0], 4);
    }
    dns.lookup(hostname, options, callback);
  });
};

let client = null;
let db = null;

export async function connectToDatabase() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  const dbName = process.env.MONGODB_DB || 'transitlk';

  client = new MongoClient(uri, {
    maxPoolSize: 10,
    lookup: customMongoLookup,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  await client.connect();
  db = client.db(dbName);
  console.log(`[MongoDB] Connected successfully to database: "${dbName}"`);

  // Ensure necessary indexes
  try {
    const users = db.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ role: 1 });

    const sessions = db.collection('sessions');
    await sessions.createIndex({ tokenHash: 1 }, { unique: true });
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    const buses = db.collection('buses');
    await buses.createIndex({ busRegNumber: 1 });
    await buses.createIndex({ routeNumber: 1 });
    await buses.createIndex({ ownerId: 1 });

    const routes = db.collection('routes');
    await routes.createIndex({ routeNumber: 1 }, { unique: true });

    console.log('[MongoDB] Indexes verified successfully.');
  } catch (indexError) {
    console.warn('[MongoDB] Index creation warning:', indexError.message);
  }

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return db;
}

export function getUsersCollection() {
  return getDb().collection('users');
}

export function getSessionsCollection() {
  return getDb().collection('sessions');
}

export function getBusesCollection() {
  return getDb().collection('buses');
}

export function getRoutesCollection() {
  return getDb().collection('routes');
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed.');
  }
}
