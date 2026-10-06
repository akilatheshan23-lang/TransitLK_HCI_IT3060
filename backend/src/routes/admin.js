import { Router } from 'express';
import { getUsersCollection, getSessionsCollection } from '../db/connection.js';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  generateId,
} from '../utils/security.js';

export const adminRouter = Router();

// Ensure default Admin user exists in MongoDB with username = 'admin' and password = 'admin123'
export async function ensureAdminUser() {
  const users = getUsersCollection();
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
      expiresAt: expiresAt.toISOString(),
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
 * Overview dashboard metrics
 */
adminRouter.get('/stats', async (req, res) => {
  try {
    const users = getUsersCollection();

    const [
      pendingOfficers,
      pendingOwners,
      approvedOfficers,
      approvedOwners,
      totalPassengers,
      totalUsers,
    ] = await Promise.all([
      users.countDocuments({ role: 'authority', status: 'pending' }),
      users.countDocuments({ role: 'bus_owner', status: 'pending' }),
      users.countDocuments({ role: 'authority', status: 'approved' }),
      users.countDocuments({ role: 'bus_owner', status: 'approved' }),
      users.countDocuments({ role: 'passenger' }),
      users.countDocuments({}),
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
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch admin statistics' });
  }
});

/**
 * GET /api/admin/pending
 * Retrieve all pending applications awaiting approval
 */
adminRouter.get('/pending', async (req, res) => {
  try {
    const users = getUsersCollection();
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
 * Retrieve all registered users with optional role & status filter
 */
adminRouter.get('/users', async (req, res) => {
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

    const users = getUsersCollection();
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
 * Approve a pending officer or bus owner registration
 */
adminRouter.post('/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const users = getUsersCollection();

    const user = await users.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updateResult = await users.updateOne(
      { _id: id },
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

    const updatedUser = await users.findOne({ _id: id }, { projection: { passwordHash: 0 } });

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
 * Reject a pending application
 */
adminRouter.post('/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Verification criteria not met' } = req.body;
    const users = getUsersCollection();

    const user = await users.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await users.updateOne(
      { _id: id },
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

    const updatedUser = await users.findOne({ _id: id }, { projection: { passwordHash: 0 } });

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
 * Helper to seed sample pending applicants for live testing
 */
adminRouter.post('/seed-demo-pending', async (req, res) => {
  try {
    const users = getUsersCollection();

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
