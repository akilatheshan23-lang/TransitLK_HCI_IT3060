import { MongoClient } from 'mongodb';

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
    serverSelectionTimeoutMS: 8000,
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

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] Connection closed.');
  }
}
