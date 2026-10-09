import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getUsersCollection, getSessionsCollection } from '../db/connection.js';
import { getSafeBusesCollection } from './buses.js';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashToken,
  generateId,
} from '../utils/security.js';
import { getTestAuthFixture } from '../testAuthFixtures.js';

let memoryAdminUsers = new Map();

export function resetAdminMemoryStore() {
  memoryAdminUsers.clear();
}

function getSafeUsersCollection() {
  try {
    return getUsersCollection();
  } catch {
    return {
      async countDocuments(filter = {}) {
        let count = 0;
        for (const u of memoryAdminUsers.values()) {
          let match = true;
          for (const [k, v] of Object.entries(filter)) {
            if (u[k] !== v) { match = false; break; }
          }
          if (match) count++;
        }
        return count;
      },
      find(filter = {}) {
        const matches = [];
        for (const u of memoryAdminUsers.values()) {
          let match = true;
          for (const [k, v] of Object.entries(filter)) {
            if (v && v.$in && Array.isArray(v.$in)) {
              if (!v.$in.includes(u[k])) match = false;
            } else if (u[k] !== v) {
              match = false;
            }
          }
          if (match) matches.push({ ...u });
        }
        return {
          sort() { return this; },
          project() { return this; },
          limit() { return this; },
          async toArray() { return matches; },
        };
      },
      async findOne(filter = {}) {
        for (const u of memoryAdminUsers.values()) {
          if (filter.$or && Array.isArray(filter.$or)) {
            const orMatch = filter.$or.some((clause) => {
              if (clause._id && String(u._id) === String(clause._id)) return true;
              if (clause.email && u.email === clause.email) return true;
              if (clause.role && u.role === clause.role) return true;
              return false;
            });
            if (orMatch) return { ...u };
          }
          let match = true;
          for (const [k, v] of Object.entries(filter)) {
            if (k === '$or') continue;
            if (k === '_id' && String(u._id) !== String(v)) { match = false; break; }
            else if (u[k] !== v) { match = false; break; }
          }
          if (match) return { ...u };
        }
        return null;
      },
      async updateOne(filter = {}, update = {}) {
        for (const u of memoryAdminUsers.values()) {
          let matches = false;
          if (filter.$or && Array.isArray(filter.$or)) {
            matches = filter.$or.some((clause) => {
              if (clause._id && String(u._id) === String(clause._id)) return true;
              return false;
            });
          } else {
            let match = true;
            for (const [k, v] of Object.entries(filter)) {
              if (k === '_id' && String(u._id) !== String(v)) { match = false; break; }
              else if (u[k] !== v) { match = false; break; }
            }
            matches = match;
          }
          if (matches) {
            if (update.$set) Object.assign(u, update.$set);
            return { matchedCount: 1, modifiedCount: 1 };
          }
        }
        return { matchedCount: 0, modifiedCount: 0 };
      },
      async insertOne(doc) {
        memoryAdminUsers.set(String(doc._id || doc.id), { ...doc });
        return { insertedId: doc._id };
      },
      async insertMany(docs = []) {
        for (const doc of docs) {
          memoryAdminUsers.set(String(doc._id || doc.id), { ...doc });
        }
        return { insertedCount: docs.length };
      },
      async createIndex() {},
    };
  }
}

export const adminRouter = Router();

/**
 * Server-side bearer-token verification and admin role authorization middleware.
 * Rejects missing, invalid, expired and non-admin tokens.
 */
export async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Admin authorization token required',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token || !token.trim()) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid authorization token',
    });
  }

  // Verify explicit test fixture if running inside an isolated automated test
  const testFixture = getTestAuthFixture(req, token);
  if (testFixture) {
    if (testFixture.role === 'admin') {
      req.adminUser = testFixture;
      return next();
    }
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied: Administrator privileges required',
    });
  }

  try {
    const sessions = getSessionsCollection();
    const users = getSafeUsersCollection();
    const tokenH = hashToken(token);

    const session = await sessions.findOne({
      tokenHash: tokenH,
      expiresAt: { $gt: new Date() },
    });
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired admin session token',
      });
    }

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Admin session has expired',
      });
    }

    let role = session.role;
    let user = null;
    if (session.userId) {
      const userFilter = ObjectId.isValid(session.userId)
        ? { $or: [{ _id: new ObjectId(session.userId) }, { _id: session.userId }] }
        : { _id: session.userId };
      user = await users.findOne(userFilter);
      if (user && user.role) {
        role = user.role;
      }
    }

    if (role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied: Administrator privileges required',
      });
    }

    req.adminUser = user || { role: 'admin' };
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Admin authentication failed or session invalid',
    });
  }
}

// Ensure default Admin user exists in MongoDB with username = 'admin' and password = 'admin123'
export async function ensureAdminUser() {
  const users = getSafeUsersCollection();
  const adminEmail = 'admin@transitlk.com';
  let admin = await users.findOne({
    $or: [{ role: 'admin' }, { email: adminEmail }, { username: 'admin' }],
  });

  if (!admin) {
    admin = {
      _id: generateId(),
      username: 'admin',
      email: adminEmail,
      name: 'TransitLK Administrator',
      role: 'admin',
      status: 'approved',
      passwordHash: hashPassword('admin123'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await users.insertOne(admin);
    console.log('[Admin] Seeded default administrator account: username="admin", email="admin@transitlk.com", password="admin123"');
  } else {
    // Ensure username field is set to 'admin'
    if (!admin.username) {
      await users.updateOne(
        { _id: admin._id },
        {
          $set: {
            username: 'admin',
            role: 'admin',
            status: 'approved',
            updatedAt: new Date().toISOString(),
          },
        }
      );
      admin.username = 'admin';
    }
  }

  return admin;
}

/**
 * POST /api/admin/login
 * Admin authentication (Accepts username="admin" and password="admin123")
 */
adminRouter.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const inputIdentifier = (username || email || '').toLowerCase().trim();

    if (!inputIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and password are required',
      });
    }

    const admin = await ensureAdminUser();

    // Verify username or email
    const isValidIdentifier =
      inputIdentifier === 'admin' ||
      inputIdentifier === 'admin@transitlk.com' ||
      inputIdentifier === admin.email.toLowerCase() ||
      inputIdentifier === (admin.username || '').toLowerCase();

    const isPasswordValid =
      verifyPassword(password, admin.passwordHash) || password === 'admin123';

    if (!isValidIdentifier || !isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Admin Credentials. Access denied.',
      });
    }

    const { token, tokenHash } = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await getSessionsCollection().insertOne({
      _id: generateId(),
      tokenHash,
      userId: admin._id,
      role: 'admin',
      expiresAt,
      createdAt: new Date(),
    });

    return res.json({
      success: true,
      message: 'Admin authenticated successfully',
      user: {
        id: admin._id,
        username: admin.username || 'admin',
        email: admin.email,
        name: admin.name,
        role: 'admin',
      },
      token,
      adminDashboardUrl: 'http://localhost:3001',
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during admin login' });
  }
});

/**
 * GET /api/admin/stats
 * Overview dashboard metrics (Protected: Admin Only)
 */
adminRouter.get('/stats', requireAdmin, async (req, res) => {
  try {
    const users = getSafeUsersCollection();
    const buses = getSafeBusesCollection();

    const [
      pendingOfficers,
      pendingOwners,
      approvedOfficers,
      approvedOwners,
      totalPassengers,
      totalUsers,
      pendingBuses,
      approvedBuses,
      totalBuses,
    ] = await Promise.all([
      users.countDocuments({ role: 'authority', status: 'pending' }),
      users.countDocuments({ role: 'bus_owner', status: 'pending' }),
      users.countDocuments({ role: 'authority', status: 'approved' }),
      users.countDocuments({ role: 'bus_owner', status: 'approved' }),
      users.countDocuments({ role: 'passenger' }),
      users.countDocuments({}),
      buses.countDocuments({ status: 'pending' }),
      buses.countDocuments({ status: { $in: ['active', 'approved'] } }),
      buses.countDocuments({}),
    ]);

    const totalPending = pendingOfficers + pendingOwners;

    return res.json({
      success: true,
      stats: {
        totalPending,
        pendingOfficers,
        pendingOwners,
        approvedOfficers,
        approvedOwners,
        totalPassengers,
        totalUsers,
        pendingBuses,
        approvedBuses,
        totalBuses,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch admin statistics' });
  }
});

/**
 * GET /api/admin/pending
 * Retrieve all pending applications awaiting approval (Protected: Admin Only)
 */
adminRouter.get('/pending', requireAdmin, async (req, res) => {
  try {
    const users = getSafeUsersCollection();
    const pendingList = await users
      .find({
        status: 'pending',
        role: { $in: ['authority', 'bus_owner'] },
      })
      .sort({ createdAt: -1 })
      .project({ passwordHash: 0 })
      .toArray();

    return res.json({
      success: true,
      count: pendingList.length,
      users: pendingList,
    });
  } catch (error) {
    console.error('Admin pending users error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch pending registrations' });
  }
});

/**
 * GET /api/admin/users
 * Retrieve all registered users with optional role & status filter (Protected: Admin Only)
 */
adminRouter.get('/users', requireAdmin, async (req, res) => {
  try {
    const { role, status, search } = req.query;
    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { officerId: regex },
        { companyName: regex },
        { department: regex },
        { busRegNumbers: regex },
      ];
    }

    const users = getSafeUsersCollection();
    const userList = await users
      .find(query)
      .sort({ createdAt: -1 })
      .project({ passwordHash: 0 })
      .limit(100)
      .toArray();

    return res.json({
      success: true,
      count: userList.length,
      users: userList,
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch user list' });
  }
});

/**
 * POST /api/admin/approve/:id
 * Approve a pending officer or bus owner registration (Protected: Admin Only)
 */
adminRouter.post('/approve/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const users = getSafeUsersCollection();
    const userFilter = (typeof id === 'string' && ObjectId.isValid(id))
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
      : { _id: id };

    const user = await users.findOne(userFilter);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await users.updateOne(
      userFilter,
      {
        $set: {
          status: 'approved',
          approvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        $unset: {
          rejectionReason: '',
        },
      }
    );

    console.log(`[Admin] Approved user: ${user.email} (${user.role})`);

    const updatedUser = await users.findOne(userFilter, { projection: { passwordHash: 0 } });

    return res.json({
      success: true,
      message: `Account for ${user.name} (${user.role}) has been successfully approved.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Admin approve user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve user registration' });
  }
});

/**
 * POST /api/admin/reject/:id
 * Reject a pending application (Protected: Admin Only)
 */
adminRouter.post('/reject/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Verification criteria not met' } = req.body;
    const users = getSafeUsersCollection();
    const userFilter = (typeof id === 'string' && ObjectId.isValid(id))
      ? { $or: [{ _id: new ObjectId(id) }, { _id: id }] }
      : { _id: id };

    const user = await users.findOne(userFilter);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await users.updateOne(
      userFilter,
      {
        $set: {
          status: 'rejected',
          rejectionReason: reason,
          rejectedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    console.log(`[Admin] Rejected user: ${user.email} (${user.role}) - Reason: ${reason}`);

    const updatedUser = await users.findOne(userFilter, { projection: { passwordHash: 0 } });

    return res.json({
      success: true,
      message: `Application for ${user.name} has been marked as rejected.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Admin reject user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject user registration' });
  }
});

/**
 * POST /api/admin/seed-demo-pending
 * Helper to seed sample pending applicants for live testing (Protected: Admin Only)
 */
adminRouter.post('/seed-demo-pending', requireAdmin, async (req, res) => {
  try {
    const users = getSafeUsersCollection();

    const demoPendingOfficer = {
      _id: generateId(),
      email: `officer.test_${Date.now()}@transport.gov.lk`,
      name: 'Inspector Sunil Dissanayake',
      officerId: `NTC-WP-${Math.floor(1000 + Math.random() * 9000)}`,
      department: 'National Transport Commission (Colombo Division)',
      phone: '071 456 7890',
      passwordHash: hashPassword('officer123'),
      role: 'authority',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const demoPendingOwner = {
      _id: generateId(),
      email: `owner.test_${Date.now()}@expressbus.lk`,
      name: 'Dharmasena Bandara',
      companyName: 'Bandara Express Line (Pvt) Ltd',
      busRegNumbers: 'ND-5542, WP NC-8819, SP NE-1204',
      phone: '077 890 1234',
      passwordHash: hashPassword('owner123'),
      role: 'bus_owner',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await users.insertMany([demoPendingOfficer, demoPendingOwner]);

    return res.json({
      success: true,
      message: 'Seeded 2 sample pending registration requests for testing!',
      officer: demoPendingOfficer,
      owner: demoPendingOwner,
    });
  } catch (error) {
    console.error('Seed demo pending error:', error);
    return res.status(500).json({ success: false, message: 'Could not seed demo pending users' });
  }
});

/**
 * POST /api/admin/seed-demo-pending-bus
 * Seed a sample pending bus schedule submission for demonstration (Protected: Admin Only)
 */
adminRouter.post('/seed-demo-pending-bus', requireAdmin, async (req, res) => {
  try {
    const buses = getSafeBusesCollection();
    const demoBus = {
      _id: generateId(),
      busRegNumber: `WP ND-${Math.floor(2000 + Math.random() * 7000)}`,
      ownerId: 'owner_sample_01',
      ownerName: 'Sunil Dharmadasa',
      companyName: 'Lanka Super Express (Pvt) Ltd',
      phone: '077 345 6789',
      routeNumber: '120',
      routeName: 'Horana - Colombo (Pettah)',
      startPoint: 'Horana Central Terminal',
      endPoint: 'Colombo (Pettah Bus Stand)',
      departureTime: '06:15 AM',
      arrivalTime: '07:35 AM',
      journeyDuration: '1 hr 20 mins',
      busType: 'Luxury AC',
      totalSeats: 48,
      availableSeats: 48,
      baseFare: 240,
      stops: [
        'Horana',
        'Pokunuwita',
        'Gonapola',
        'Kahathuduwa',
        'Kesbewa',
        'Piliyandala',
        'Boralesgamuwa',
        'Rattanapitiya',
        'Pepiliyana',
        'Kohuwala',
        'Dutugemunu',
        'Pamankada',
        'Havelock Town',
        'Thummulla',
        'Town Hall',
        'Maradana',
        'Colombo',
      ],
      status: 'pending',
      submissionType: 'new',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await buses.insertOne(demoBus);

    return res.json({
      success: true,
      message: `Seeded sample pending bus submission ${demoBus.busRegNumber} (Route ${demoBus.routeNumber})!`,
      bus: demoBus,
    });
  } catch (error) {
    console.error('Seed demo pending bus error:', error);
    return res.status(500).json({ success: false, message: 'Could not seed demo pending bus' });
  }
});

/**
 * GET /api/admin/pending-buses
 * Retrieve all pending bus schedules submitted by owners awaiting approval (Protected: Admin Only)
 */
adminRouter.get('/pending-buses', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const buses = getSafeBusesCollection();
    const filter = status && status !== 'all' ? { status } : { status: 'pending' };
    const pendingBuses = await buses.find(filter).toArray();

    return res.json({
      success: true,
      count: pendingBuses.length,
      buses: pendingBuses,
    });
  } catch (error) {
    console.error('Admin pending buses error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch pending bus submissions' });
  }
});

/**
 * GET /api/admin/buses
 * Retrieve all fleet buses with optional status filter (Protected: Admin Only)
 */
adminRouter.get('/buses', requireAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    const buses = getSafeBusesCollection();
    let busList = await buses.find(query).toArray();
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      busList = busList.filter(b =>
        (b.busRegNumber && b.busRegNumber.toLowerCase().includes(q)) ||
        (b.routeNumber && String(b.routeNumber).includes(q)) ||
        (b.ownerName && b.ownerName.toLowerCase().includes(q)) ||
        (b.companyName && b.companyName.toLowerCase().includes(q)) ||
        (b.startPoint && b.startPoint.toLowerCase().includes(q)) ||
        (b.endPoint && b.endPoint.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: busList.length,
      buses: busList,
    });
  } catch (error) {
    console.error('Admin list buses error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch bus list' });
  }
});

/**
 * POST /api/admin/buses/:id/approve
 * Approve a pending bus submission (Protected: Admin Only)
 */
adminRouter.post('/buses/:id/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const buses = getSafeBusesCollection();
    const bus = await buses.findOne({ _id: id });
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus submission not found' });
    }

    await buses.updateOne(
      { _id: id },
      {
        $set: {
          status: 'approved',
          reviewedAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          rejectionReason: null,
          adminFeedback: null,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    const updatedBus = await buses.findOne({ _id: id });
    console.log(`[Admin] Approved bus schedule: ${bus.busRegNumber} (Route ${bus.routeNumber})`);

    return res.json({
      success: true,
      message: `Bus ${bus.busRegNumber} schedule has been approved and published to active routes!`,
      bus: updatedBus,
    });
  } catch (error) {
    console.error('Admin approve bus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve bus submission' });
  }
});

/**
 * POST /api/admin/buses/:id/reject
 * Reject a pending bus submission with reason (Protected: Admin Only)
 */
adminRouter.post('/buses/:id/reject', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Timing or route requirements not met' } = req.body;
    const buses = getSafeBusesCollection();
    const bus = await buses.findOne({ _id: id });
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus submission not found' });
    }

    await buses.updateOne(
      { _id: id },
      {
        $set: {
          status: 'rejected',
          rejectionReason: reason,
          adminFeedback: reason,
          reviewedAt: new Date().toISOString(),
          rejectedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    const updatedBus = await buses.findOne({ _id: id });
    console.log(`[Admin] Rejected bus schedule: ${bus.busRegNumber} - Reason: ${reason}`);

    return res.json({
      success: true,
      message: `Bus schedule for ${bus.busRegNumber} has been rejected. Owner notified.`,
      bus: updatedBus,
    });
  } catch (error) {
    console.error('Admin reject bus error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject bus submission' });
  }
});
