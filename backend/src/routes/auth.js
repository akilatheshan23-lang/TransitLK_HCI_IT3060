import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getUsersCollection, getSessionsCollection } from '../db/connection.js';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashToken,
  generateId,
} from '../utils/security.js';

export const authRouter = Router();

// Helper to create and store session
async function createSession(userId) {
  const { token, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await getSessionsCollection().insertOne({
    _id: generateId(),
    tokenHash,
    userId,
    expiresAt: expiresAt.toISOString(),
  });

  return token;
}

// Ensure demo accounts for Authority Officer, Bus Owner, and Admin exist
async function ensureSeedAccount({ email, name, role, defaultPassword, extra = {} }) {
  const users = getUsersCollection();
  let user = await users.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    user = {
      _id: generateId(),
      email: email.toLowerCase().trim(),
      name,
      language: 'en',
      passwordHash: hashPassword(defaultPassword),
      role,
      status: 'approved',
      ...extra,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await users.insertOne(user);
    console.log(`[Seed] Created demo account: ${email} (${role})`);
  }
  return user;
}

/**
 * POST /api/auth/register
 * Passenger / General user account registration
 */
authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, language = 'en', role = 'passenger' } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = getUsersCollection();

    // Check if user already exists
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: 'An account with this email already exists' });
    }

    const newUser = {
      _id: generateId(),
      email: normalizedEmail,
      name: name.trim(),
      language: language || 'en',
      passwordHash: hashPassword(password),
      role: role || 'passenger',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await users.insertOne(newUser);

    // Create session
    const token = await createSession(newUser._id);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        language: newUser.language,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * User (Passenger) Sign In
 */
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = getUsersCollection();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid email address or password' });
    }

    const token = await createSession(user._id);

    return res.json({
      success: true,
      message: 'Signed in successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || 'passenger',
        language: user.language || 'en',
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/auth/google
 * Google Sign-In & Single Sign-On (SSO)
 */
authRouter.post('/google', async (req, res) => {
  try {
    const { email, name, googleId, avatarUrl } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid Google email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = getUsersCollection();

    let user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      // Auto-provision user account from Google profile
      user = {
        _id: generateId(),
        email: normalizedEmail,
        name: (name && name.trim()) || normalizedEmail.split('@')[0],
        googleId: googleId || generateId(),
        avatarUrl: avatarUrl || null,
        authProvider: 'google',
        role: 'passenger',
        language: 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await users.insertOne(user);
      console.log(`[Google Auth] Created new user via Google: ${user.email}`);
    } else {
      if (!user.googleId && googleId) {
        await users.updateOne(
          { _id: user._id },
          {
            $set: {
              googleId,
              authProvider: user.authProvider || 'google',
              updatedAt: new Date().toISOString(),
            },
          }
        );
      }
      console.log(`[Google Auth] Authenticated user via Google: ${user.email}`);
    }

    const token = await createSession(user._id);

    return res.json({
      success: true,
      message: 'Google Sign-In successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || 'passenger',
        language: user.language || 'en',
        authProvider: 'google',
      },
      token,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during Google sign-in' });
  }
});

/**
 * POST /api/auth/register-officer
 * Authority Officer Registration (Requires Admin Approval)
 */
authRouter.post('/register-officer', async (req, res) => {
  try {
    const { name, email, officerId, department, phone, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid official email address is required' });
    }
    if (!officerId || typeof officerId !== 'string' || !officerId.trim()) {
      return res.status(400).json({ success: false, message: 'Officer ID / Badge number is required' });
    }
    if (!department || typeof department !== 'string' || !department.trim()) {
      return res.status(400).json({ success: false, message: 'Department or Authority Division is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedOfficerId = officerId.trim();
    const users = getUsersCollection();

    const existing = await users.findOne({
      $or: [{ email: normalizedEmail }, { officerId: normalizedOfficerId }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          existing.email === normalizedEmail
            ? 'An account with this official email already exists'
            : 'An officer with this Officer ID is already registered',
      });
    }

    const newOfficer = {
      _id: generateId(),
      email: normalizedEmail,
      name: name.trim(),
      officerId: normalizedOfficerId,
      department: department.trim(),
      phone: (phone && phone.trim()) || null,
      passwordHash: hashPassword(password),
      role: 'authority',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await users.insertOne(newOfficer);
    console.log(`[Officer Register] Registered pending officer: ${newOfficer.email} (${newOfficer.officerId})`);

    return res.status(201).json({
      success: true,
      status: 'pending',
      message: 'Officer registration submitted successfully! Your account is pending administrator approval.',
      user: {
        id: newOfficer._id,
        email: newOfficer.email,
        name: newOfficer.name,
        officerId: newOfficer.officerId,
        department: newOfficer.department,
        role: 'authority',
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Officer registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during officer registration' });
  }
});

/**
 * POST /api/auth/register-owner
 * Bus Owner Registration (Requires Admin Approval)
 */
authRouter.post('/register-owner', async (req, res) => {
  try {
    const { name, email, companyName, busRegNumbers, phone, password } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Owner full name is required' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required' });
    }
    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return res.status(400).json({ success: false, message: 'Fleet / Company name is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const users = getUsersCollection();

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    const newOwner = {
      _id: generateId(),
      email: normalizedEmail,
      name: name.trim(),
      companyName: companyName.trim(),
      busRegNumbers: (busRegNumbers && busRegNumbers.trim()) || null,
      phone: (phone && phone.trim()) || null,
      passwordHash: hashPassword(password),
      role: 'bus_owner',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await users.insertOne(newOwner);
    console.log(`[Bus Owner Register] Registered pending bus owner: ${newOwner.email} (${newOwner.companyName})`);

    return res.status(201).json({
      success: true,
      status: 'pending',
      message: 'Bus owner registration submitted successfully! Your account is pending administrator approval.',
      user: {
        id: newOwner._id,
        email: newOwner.email,
        name: newOwner.name,
        companyName: newOwner.companyName,
        busRegNumbers: newOwner.busRegNumbers,
        role: 'bus_owner',
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Bus owner registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during bus owner registration' });
  }
});

/**
 * POST /api/auth/officer-login
 * Authority Officer Login
 */
authRouter.post('/officer-login', async (req, res) => {
  try {
    const { officerId, password } = req.body;

    if (!officerId || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Official email or Officer ID and password are required' });
    }

    const normalizedId = officerId.toLowerCase().trim();
    const users = getUsersCollection();

    // Look up or auto-seed demo officer if using demo credentials
    let user = await users.findOne({
      $or: [{ email: normalizedId }, { officerId: officerId.trim() }],
    });

    if (!user && (normalizedId === 'officer@transport.lk' || normalizedId === 'officer')) {
      user = await ensureSeedAccount({
        email: 'officer@transport.lk',
        name: 'Officer Wickramasinghe',
        role: 'authority',
        defaultPassword: 'password123',
        extra: {
          officerId: 'NTC-001',
          department: 'Western Province Transport Authority',
          status: 'approved',
        },
      });
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid official credentials or password',
      });
    }

    if (user.role && user.role !== 'authority' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Account is not authorized as Authority Officer',
      });
    }

    // Verify admin approval status
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        status: 'pending',
        message: 'Your account is pending administrator approval. Please wait until your credentials are verified.',
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        status: 'rejected',
        message: `Your registration request was rejected by the administrator.${user.rejectionReason ? ` Reason: ${user.rejectionReason}` : ''}`,
      });
    }

    const token = await createSession(user._id);

    return res.json({
      success: true,
      message: 'Authority Officer authenticated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        officerId: user.officerId,
        department: user.department,
        role: 'authority',
        status: user.status || 'approved',
      },
      token,
    });
  } catch (error) {
    console.error('Officer login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/auth/owner-login
 * Bus Owner Login
 */
authRouter.post('/owner-login', async (req, res) => {
  try {
    const { ownerId, password } = req.body;

    if (!ownerId || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Registered email or Owner ID and password are required' });
    }

    const normalizedId = ownerId.toLowerCase().trim();
    const users = getUsersCollection();

    // Look up or auto-seed demo bus owner if using demo credentials
    let user = await users.findOne({
      $or: [{ email: normalizedId }, { ownerId: ownerId.trim() }],
    });

    if (!user && (normalizedId === 'owner@transitlk.com' || normalizedId === 'owner')) {
      user = await ensureSeedAccount({
        email: 'owner@transitlk.com',
        name: 'Fleet Owner Silva',
        role: 'bus_owner',
        defaultPassword: 'password123',
        extra: {
          companyName: 'Silva Express Transport Ltd',
          busRegNumbers: 'ND-3204, ND-4521',
          status: 'approved',
        },
      });
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid owner credentials or password',
      });
    }

    if (user.role && user.role !== 'bus_owner' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Account is not authorized as Bus Fleet Owner',
      });
    }

    // Verify admin approval status
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        status: 'pending',
        message: 'Your account is pending administrator approval. Please wait until your fleet credentials are verified.',
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        status: 'rejected',
        message: `Your registration request was rejected by the administrator.${user.rejectionReason ? ` Reason: ${user.rejectionReason}` : ''}`,
      });
    }

    const token = await createSession(user._id);

    return res.json({
      success: true,
      message: 'Bus Owner authenticated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        busRegNumbers: user.busRegNumbers,
        role: 'bus_owner',
        status: user.status || 'approved',
      },
      token,
    });
  } catch (error) {
    console.error('Bus owner login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Retrieve currently logged in user profile using Bearer token
 */
authRouter.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No bearer token provided' });
    }

    const token = authHeader.split(' ')[1];
    const tokenHash = hashToken(token);

    const session = await getSessionsCollection().findOne({
      tokenHash,
      expiresAt: { $gt: new Date().toISOString() },
    });

    if (!session) {
      return res.status(401).json({ success: false, message: 'Session expired or invalid' });
    }

    const userIdFilter = (typeof session.userId === 'string' && ObjectId.isValid(session.userId))
      ? { $or: [{ _id: new ObjectId(session.userId) }, { _id: session.userId }] }
      : { _id: session.userId };
    const user = await getUsersCollection().findOne(userIdFilter);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || 'passenger',
        language: user.language || 'en',
        companyName: user.companyName || null,
        officerId: user.officerId || null,
        department: user.department || null,
        phone: user.phone || null,
        status: user.status || 'approved',
      },
    });
  } catch (error) {
    console.error('Auth/me error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate session token
 */
authRouter.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const tokenHash = hashToken(token);
      await getSessionsCollection().deleteOne({ tokenHash });
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/auth/seed
 * Seed / verify demo accounts exist with default password "password123"
 */
authRouter.post('/seed', async (req, res) => {
  try {
    const accounts = [
      {
        email: 'officer@transport.lk',
        name: 'Officer Wickramasinghe',
        role: 'authority',
        defaultPassword: 'password123',
      },
      {
        email: 'owner@transitlk.com',
        name: 'Fleet Owner Silva',
        role: 'bus_owner',
        defaultPassword: 'password123',
      },
      {
        email: 'passenger@transitlk.com',
        name: 'Kamal Perera',
        role: 'passenger',
        defaultPassword: 'password123',
      },
    ];

    const results = [];
    for (const acc of accounts) {
      const u = await ensureSeedAccount(acc);
      results.push({ email: u.email, role: u.role });
    }

    return res.json({ success: true, message: 'Demo accounts verified', accounts: results });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
