import { MongoClient } from 'mongodb';

const email =
  process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error(
    'Usage: node --env-file=.env src/provision-officer.js user@example.com'
  );

  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  throw new Error(
    'Set MONGODB_URI in backend/.env'
  );
}

const client = new MongoClient(
  process.env.MONGODB_URI,
  {
    serverSelectionTimeoutMS: 10000
  }
);

try {
  await client.connect();

  const db = client.db(
    process.env.MONGODB_DB || 'transitlk'
  );

  const result = await db
    .collection('users')
    .updateOne(
      { email },
      {
        $set: {
          role: 'officer',
          updatedAt: new Date()
        }
      }
    );

  if (!result.matchedCount) {
    console.error(
      'No account found with that email.'
    );

    process.exitCode = 1;
  } else {
    console.log(
      'Authority Officer role granted successfully.'
    );
  }
} finally {
  await client.close();
}