import { Router } from 'express';
import crypto from 'node:crypto';
import { ObjectId } from 'mongodb';
import {
  getDb,
  getUsersCollection,
  getSessionsCollection,
} from '../db/connection.js';
import { generateId, hashToken } from '../utils/security.js';
import { getTestAuthFixture } from '../testAuthFixtures.js';
import { DEFAULT_COLOMBO_ROUTES } from './buses.js';

export const paymentsRouter = Router();

// In-memory fallbacks for unit tests when MongoDB is not connected
const memoryPayments = new Map();
const memoryTickets = new Map();
const memoryIdempotency = new Map();

export function resetPaymentMemoryStore() {
  memoryPayments.clear();
  memoryTickets.clear();
  memoryIdempotency.clear();
}

/**
 * Trusted server-side fare resolution.
 * Matches against server-owned master routes (DEFAULT_COLOMBO_ROUTES)
 * and server-owned demo transit catalog (transit.js).
 * Does NOT accept arbitrary client fares.
 */
export function resolveTrustedFare(routeData = {}, candidateUnitFare = null) {
  if (!routeData || typeof routeData !== 'object') {
    return null;
  }

  const rawRoute = String(
    routeData.routeNumber || routeData.route || routeData.bus || routeData.id || ''
  ).trim();

  const from = typeof routeData.from === 'string' ? routeData.from.trim().toLowerCase() : '';
  const to = typeof routeData.to === 'string' ? routeData.to.trim().toLowerCase() : '';
  const mode = String(routeData.mode || (rawRoute.toLowerCase().includes('train') ? 'train' : 'bus')).toLowerCase();

  // 1. Check demo transit catalog (transit.js)
  const tripId = String(routeData.id || routeData.tripId || '').toLowerCase();
  if (tripId.startsWith('demo-train') || mode === 'train' || rawRoute.toLowerCase().includes('coastal')) {
    if (from.includes('panadura') || to.includes('panadura') || from.includes('colombo') || to.includes('colombo')) {
      return {
        unitFare: 180,
        routeNumber: 'Coastal',
        routeName: 'Panadura - Colombo Train Service',
        source: 'server_demo_train',
      };
    }
  }

  if (tripId.startsWith('demo-bus') || (rawRoute.includes('125') && (from.includes('horana') || to.includes('horana')))) {
    return {
      unitFare: 250,
      routeNumber: '125',
      routeName: 'Horana - Colombo Express Service',
      source: 'server_demo_bus',
    };
  }

  // 2. Check server-owned master Colombo bus routes (DEFAULT_COLOMBO_ROUTES)
  const routeNumMatch = rawRoute.match(/\b(100|120|122|125|138|177|255)\b/);
  const routeNumber = routeNumMatch ? routeNumMatch[1] : null;

  if (routeNumber) {
    const masterRoute = DEFAULT_COLOMBO_ROUTES.find((r) => r.routeNumber === routeNumber);
    if (masterRoute) {
      const baseFare = masterRoute.baseFare;
      let segmentFare = baseFare;
      const stops = masterRoute.stops || [];

      if (from && to && stops.length > 1) {
        const fromIdx = stops.findIndex((s) => s.toLowerCase() === from || s.toLowerCase().includes(from));
        const toIdx = stops.findIndex((s) => s.toLowerCase() === to || s.toLowerCase().includes(to));

        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          const stopCount = Math.abs(toIdx - fromIdx);
          const totalStops = stops.length;
          const fareRatio = Math.max(0.3, Math.min(1.0, stopCount / Math.max(1, totalStops - 1)));
          segmentFare = Math.round(baseFare * fareRatio);
        }
      }

      // If candidate matches calculated segment fare, accept segment fare; otherwise enforce baseFare
      let chosenUnitFare = baseFare;
      if (candidateUnitFare !== null && Math.round(candidateUnitFare) === Math.round(segmentFare)) {
        chosenUnitFare = segmentFare;
      }

      return {
        unitFare: chosenUnitFare,
        baseFare,
        segmentFare,
        routeNumber: masterRoute.routeNumber,
        routeName: masterRoute.routeName,
        source: 'server_master_route',
      };
    }
  }

  // 3. Fallback: match by known endpoints in master routes if routeNumber was omitted
  if (from && to) {
    const matchedRoute = DEFAULT_COLOMBO_ROUTES.find((r) => {
      const stops = r.stops.map((s) => s.toLowerCase());
      return stops.some((s) => s.includes(from) || from.includes(s)) &&
             stops.some((s) => s.includes(to) || to.includes(s));
    });

    if (matchedRoute) {
      return {
        unitFare: matchedRoute.baseFare,
        routeNumber: matchedRoute.routeNumber,
        routeName: matchedRoute.routeName,
        source: 'server_master_route',
      };
    }
  }

  // Unknown or unsupported route
  return null;
}


export function getIdempotencyCollection() {
  try {
    const col = getDb().collection('payment_idempotency');
    col.createIndex({ userId: 1, idempotencyKey: 1 }, { unique: true }).catch(() => {});
    return col;
  } catch {
    return {
      async insertOne(doc) {
        const compositeKey = `${doc.userId}::${doc.idempotencyKey}`;
        if (memoryIdempotency.has(compositeKey)) {
          const err = new Error('Duplicate key');
          err.code = 11000;
          throw err;
        }
        memoryIdempotency.set(compositeKey, { ...doc });
        return { insertedId: doc._id };
      },
      async findOne(filter) {
        const compositeKey = `${filter.userId}::${filter.idempotencyKey}`;
        const item = memoryIdempotency.get(compositeKey);
        return item ? { ...item } : null;
      },
      async findOneAndUpdate(filter, update) {
        const compositeKey = `${filter.userId}::${filter.idempotencyKey}`;
        const item = memoryIdempotency.get(compositeKey);
        if (!item) return null;
        if (update.$set) Object.assign(item, update.$set);
        return { ...item };
      },
      async deleteOne(filter) {
        const compositeKey = `${filter.userId}::${filter.idempotencyKey}`;
        const had = memoryIdempotency.delete(compositeKey);
        return { deletedCount: had ? 1 : 0 };
      },
    };
  }
}

export function getPaymentsCollection() {
  try {
    return getDb().collection('payments');
  } catch {
    return {
      async insertOne(doc) {
        memoryPayments.set(String(doc._id), { ...doc });
        return { insertedId: doc._id };
      },
      async findOne(filter) {
        return [...memoryPayments.values()].find(p => {
          if (filter._id) {
            const fId = String(filter._id);
            return String(p._id) === fId;
          }
          if (filter.ticketId) return p.ticketId === filter.ticketId;
          return true;
        }) || null;
      },
      find() {
        return {
          sort() {
            return {
              async toArray() {
                return [...memoryPayments.values()].reverse();
              },
            };
          },
        };
      },
      async findOneAndUpdate(filter, update) {
        const item = [...memoryPayments.values()].find(p => {
          if (filter._id) return String(p._id) === String(filter._id);
          return false;
        });
        if (!item) return null;
        if (update.$set) Object.assign(item, update.$set);
        return { ...item };
      },
      async deleteOne(filter) {
        const target = [...memoryPayments.entries()].find(([k, v]) => {
          if (filter._id) return String(v._id) === String(filter._id) || k === String(filter._id);
          return false;
        });
        if (target) {
          memoryPayments.delete(target[0]);
          return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
      },
    };
  }
}

export function getTicketsCollection() {
  try {
    return getDb().collection('tickets');
  } catch {
    return {
      async insertOne(doc) {
        memoryTickets.set(doc.ticketId, { ...doc });
        return { insertedId: doc._id };
      },
      async findOne(filter) {
        if (filter.ticketId) return memoryTickets.get(filter.ticketId) || null;
        return null;
      },
      async findOneAndUpdate(filter, update) {
        const ticket = memoryTickets.get(filter.ticketId);
        if (!ticket) return null;
        if (filter.status && ticket.status !== filter.status) return null;
        if (update.$set) Object.assign(ticket, update.$set);
        return { ...ticket };
      },
    };
  }
}

/**
 * Role-based authorization middleware for conductor and admin endpoints
 */
export async function requireConductorOrAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Conductor or Admin authorization token required',
    });
  }

  const token = authHeader.split(' ')[1];

  // Verify explicit test fixture if running inside an isolated automated test
  const testFixture = getTestAuthFixture(req, token);
  if (testFixture) {
    if (['conductor', 'admin'].includes(testFixture.role)) {
      req.conductorUser = testFixture;
      return next();
    }
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied: conductor or admin privileges required',
    });
  }

  try {
    const sessions = getSessionsCollection();
    const users = getUsersCollection();
    const tokenH = hashToken(token);

    const session = await sessions.findOne({
      tokenHash: tokenH,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired session token',
      });
    }

    let userFilter = { _id: session.userId };
    if (typeof session.userId === 'string' && ObjectId.isValid(session.userId)) {
      userFilter = { $or: [{ _id: new ObjectId(session.userId) }, { _id: session.userId }] };
    }

    const user = await users.findOne(userFilter);
    if (!user || !['conductor', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied: conductor or admin privileges required',
      });
    }

    req.conductorUser = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired session token',
    });
  }
}

/**
 * Role-based authorization middleware for transport authority and admin inspection
 */
export async function requireAuthorityOrAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authority or Admin authorization token required',
    });
  }

  const token = authHeader.split(' ')[1];

  const testFixture = getTestAuthFixture(req, token);
  if (testFixture) {
    if (['authority', 'admin'].includes(testFixture.role)) {
      req.authorityUser = testFixture;
      return next();
    }
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Access denied: authority or admin privileges required',
    });
  }

  try {
    const sessions = getSessionsCollection();
    const users = getUsersCollection();
    const tokenH = hashToken(token);

    const session = await sessions.findOne({
      tokenHash: tokenH,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired session token',
      });
    }

    let userFilter = { _id: session.userId };
    if (typeof session.userId === 'string' && ObjectId.isValid(session.userId)) {
      userFilter = { $or: [{ _id: new ObjectId(session.userId) }, { _id: session.userId }] };
    }

    const user = await users.findOne(userFilter);
    if (!user || !['authority', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied: authority or admin privileges required',
      });
    }

    req.authorityUser = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired session token',
    });
  }
}

/**
 * 1. POST /api/payments/process
 * Simulated Demo Payment & Server-Side Ticket Issuance
 * Never stores real credit card numbers, CVVs, or cardholder credentials.
 */
paymentsRouter.post('/process', async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
  let scopedUserId = 'guest_user';

  // Extract user identity for idempotency key scoping
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const fixture = getTestAuthFixture(req, token);
    if (fixture && (fixture.id || fixture.email || fixture.username)) {
      scopedUserId = String(fixture.id || fixture.email || fixture.username);
    } else {
      try {
        const sessions = getSessionsCollection();
        const session = await sessions.findOne({
          tokenHash: hashToken(token),
          expiresAt: { $gt: new Date() },
        });
        if (session && session.userId) {
          scopedUserId = String(session.userId);
        }
      } catch {}
    }
  } else if (req.body.userId) {
    scopedUserId = String(req.body.userId);
  }

  // 1. Validate ticketCount bounds (strict integer between 1 and 10)
  const rawTicketCount = req.body.ticketCount ?? 1;
  const parsedTicketCount = Number(rawTicketCount);
  if (!Number.isInteger(parsedTicketCount) || parsedTicketCount < 1 || parsedTicketCount > 10) {
    return res.status(400).json({
      success: false,
      code: 'InvalidTicketCount',
      message: 'Ticket count must be an integer between 1 and 10',
    });
  }

  // 2. Resolve trusted server-owned fare record
  const routeData = req.body.routeData || {};
  const clientAmount = Number(req.body.amount);
  const candidateUnitFare = !isNaN(clientAmount) && parsedTicketCount > 0 ? clientAmount / parsedTicketCount : null;
  const fareResolution = resolveTrustedFare(routeData, candidateUnitFare);

  if (!fareResolution) {
    return res.status(400).json({
      success: false,
      code: 'UnknownRouteFare',
      message: 'Cannot validate fare: Unknown or unsupported route. Trusted server fare record not found.',
    });
  }

  const trustedUnitFare = fareResolution.unitFare;
  const serverCalculatedFare = trustedUnitFare * parsedTicketCount;

  // 3. Validate client amount against server-calculated fare
  if (isNaN(clientAmount) || Math.round(clientAmount) !== Math.round(serverCalculatedFare)) {
    return res.status(400).json({
      success: false,
      code: 'FareMismatch',
      message: `Fare amount mismatch: client amount ${req.body.amount} does not match trusted server fare ${serverCalculatedFare} (${trustedUnitFare} x ${parsedTicketCount})`,
    });
  }

  const { method = 'card', details = {} } = req.body;

  // Sanitization: Never store raw credit card numbers or CVVs
  const sanitizedDetails = {
    cardType: details.cardType || 'VISA',
    last4: typeof details.cardNumber === 'string' ? details.cardNumber.slice(-4) : '3456',
    cardholderName: details.cardholderName || details.cardName || 'PASSENGER',
    isDemoSimulation: true,
  };

  const payloadHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        amount: serverCalculatedFare,
        method: method === 'wallet' ? 'wallet' : 'card',
        ticketCount: parsedTicketCount,
        unitFare: trustedUnitFare,
        routeNumber: fareResolution.routeNumber,
        routeData: {
          bus: routeData.bus || `BUS ${fareResolution.routeNumber}`,
          from: routeData.from || 'Origin',
          to: routeData.to || 'Destination',
          date: routeData.date || new Date().toLocaleDateString('en-GB'),
        },
        cardType: sanitizedDetails.cardType,
        last4: sanitizedDetails.last4,
      })
    )
    .digest('hex');

  const idempotencyCol = getIdempotencyCollection();

  if (idempotencyKey) {
    const existing = await idempotencyCol.findOne({ userId: scopedUserId, idempotencyKey });
    if (existing) {
      if (existing.payloadHash !== payloadHash) {
        return res.status(409).json({
          success: false,
          code: 'IdempotencyConflict',
          error: 'IdempotencyConflict',
          message: 'Payment request with the same idempotency key was already submitted with a different payload',
        });
      }
      if (existing.status === 'completed' && existing.response) {
        return res.status(existing.response.statusCode || 201).json(existing.response.body);
      }
      if (existing.status === 'processing') {
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 100));
          const current = await idempotencyCol.findOne({ userId: scopedUserId, idempotencyKey });
          if (current && current.status === 'completed' && current.response) {
            return res.status(current.response.statusCode || 201).json(current.response.body);
          }
        }
        return res.status(409).json({
          success: false,
          code: 'IdempotencyConflict',
          error: 'IdempotencyConflict',
          message: 'Concurrent payment request is currently being processed with this idempotency key',
        });
      }
    }

    try {
      await idempotencyCol.insertOne({
        _id: generateId(),
        userId: scopedUserId,
        idempotencyKey,
        payloadHash,
        status: 'processing',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err.code === 11000) {
        const collision = await idempotencyCol.findOne({ userId: scopedUserId, idempotencyKey });
        if (collision && collision.payloadHash !== payloadHash) {
          return res.status(409).json({
            success: false,
            code: 'IdempotencyConflict',
            error: 'IdempotencyConflict',
            message: 'Payment request with the same idempotency key was already submitted with a different payload',
          });
        }
        if (collision && collision.status === 'completed' && collision.response) {
          return res.status(collision.response.statusCode || 201).json(collision.response.body);
        }
        return res.status(409).json({
          success: false,
          code: 'IdempotencyConflict',
          error: 'IdempotencyConflict',
          message: 'Concurrent payment request is currently being processed',
        });
      }
      throw err;
    }
  }

  try {
    // Server-side unpredictable ticket ID & verification code
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const ticketId = `TKT-${randomHex}`;
    const transactionId = `TXN-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const verificationCode = String(crypto.randomInt(10000, 99999));
    const nowIso = new Date().toISOString();

    const paymentRecord = {
      _id: generateId(),
      transactionId,
      ticketId,
      amount: serverCalculatedFare,
      unitFare: trustedUnitFare,
      method: method === 'wallet' ? 'wallet' : 'card',
      details: sanitizedDetails,
      status: 'Completed',
      isDemo: true,
      createdAt: nowIso,
    };

    const ticketRecord = {
      _id: generateId(),
      ticketId,
      verificationCode,
      transactionId,
      amount: serverCalculatedFare,
      unitFare: trustedUnitFare,
      status: 'valid', // 'valid' | 'redeemed' | 'cancelled'
      numberOfTickets: parsedTicketCount,
      ticketCount: parsedTicketCount,
      route: {
        bus: routeData.bus || `BUS ${fareResolution.routeNumber}`,
        routeNumber: fareResolution.routeNumber,
        routeName: fareResolution.routeName,
        type: routeData.type || 'Direct service',
        from: routeData.from || 'Origin',
        to: routeData.to || 'Destination',
        departureTime: routeData.fromTime || routeData.departureTime || '08:30 AM',
        date: routeData.date || new Date().toLocaleDateString('en-GB'),
      },
      routeData: {
        bus: routeData.bus || `BUS ${fareResolution.routeNumber}`,
        routeNumber: fareResolution.routeNumber,
        from: routeData.from || 'Origin',
        to: routeData.to || 'Destination',
        date: routeData.date || new Date().toLocaleDateString('en-GB'),
      },
      isDemo: true,
      issuedAt: nowIso,
      redeemedAt: null,
      redeemedBy: null,
    };

    const payments = getPaymentsCollection();
    const tickets = getTicketsCollection();
    await payments.insertOne(paymentRecord);
    await tickets.insertOne(ticketRecord);

    const qrPayload = JSON.stringify({
      ticketId,
      verificationCode,
      amount: serverCalculatedFare,
      route: fareResolution.routeNumber,
      date: ticketRecord.route.date,
      from: ticketRecord.route.from,
      to: ticketRecord.route.to,
      bus: ticketRecord.route.bus,
      isValid: true,
      isDemo: true,
    });

    const responseBody = {
      success: true,
      mode: 'DEMO',
      message: 'Simulated payment processed successfully (DEMO)',
      data: paymentRecord,
      ticket: ticketRecord,
      qrData: qrPayload,
    };

    if (idempotencyKey) {
      await idempotencyCol.findOneAndUpdate(
        { userId: scopedUserId, idempotencyKey },
        {
          $set: {
            status: 'completed',
            response: {
              statusCode: 201,
              body: responseBody,
            },
            completedAt: new Date().toISOString(),
          },
        }
      );
    }

    return res.status(201).json(responseBody);
  } catch (error) {
    if (idempotencyKey) {
      await idempotencyCol.deleteOne({ userId: scopedUserId, idempotencyKey, status: 'processing' }).catch(() => {});
    }
    console.error('Payment processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing simulated payment',
      error: error.message,
    });
  }
});

/**
 * 2. POST /api/payments/tickets/verify
 * Atomic ticket verification and redemption
 * Enforces role authorization (Conductor / Admin / Authority)
 * Atomic update prevents duplicate scans across multiple conductor devices
 */
paymentsRouter.post('/tickets/verify', requireConductorOrAdmin, async (req, res) => {
  try {
    const { qrData, ticketId, verificationCode } = req.body;

    let targetTicketId = ticketId;
    let targetCode = verificationCode;

    // Parse untrusted client qrData if provided
    if (!targetTicketId && qrData) {
      try {
        const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        targetTicketId = parsed.ticketId || parsed.id;
        targetCode = parsed.verificationCode;
      } catch {
        targetTicketId = String(qrData).trim();
      }
    }

    if (!targetTicketId || typeof targetTicketId !== 'string' || !targetTicketId.trim()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Invalid ticket identifier supplied',
      });
    }

    const cleanTicketId = targetTicketId.trim();
    const tickets = getTicketsCollection();

    // Atomic findOneAndUpdate: only matches if status === 'valid'
    const redeemedAt = new Date().toISOString();
    const redeemedBy = req.conductorUser ? req.conductorUser.email : 'conductor';
    const verifiedByRole = req.conductorUser ? req.conductorUser.role : 'conductor';
    const redeemedByRole = verifiedByRole;

    const updateResult = await tickets.findOneAndUpdate(
      { ticketId: cleanTicketId, status: 'valid' },
      {
        $set: {
          status: 'redeemed',
          redeemedAt,
          redeemedBy,
          redeemedByRole,
        },
      },
      { returnDocument: 'after' }
    );

    if (updateResult) {
      return res.status(200).json({
        success: true,
        valid: true,
        status: 'redeemed',
        message: 'Ticket validated and redeemed successfully',
        verifiedByRole,
        ticket: updateResult,
      });
    }

    // Ticket was not valid or not found. Inspect database state for exact diagnosis
    const existing = await tickets.findOne({ ticketId: cleanTicketId });

    if (!existing) {
      return res.status(404).json({
        success: false,
        valid: false,
        status: 'not_found',
        message: 'Forged or unknown ticket: Ticket ID does not exist in TransitLK system',
      });
    }

    if (existing.status === 'redeemed') {
      return res.status(409).json({
        success: false,
        valid: false,
        status: 'redeemed',
        message: 'Duplicate scan rejected: Ticket has already been redeemed',
        redeemedAt: existing.redeemedAt,
        redeemedBy: existing.redeemedBy,
      });
    }

    return res.status(400).json({
      success: false,
      valid: false,
      status: existing.status || 'invalid',
      message: `Ticket is not valid (current status: ${existing.status})`,
      ticket: existing,
    });
  } catch (error) {
    console.error('Ticket verification error:', error);
    return res.status(500).json({
      success: false,
      valid: false,
      message: 'Server error during ticket verification',
      error: error.message,
    });
  }
});

/**
 * 3. POST /api/payments/tickets/inspect
 * Read-Only Ticket Inspection for Transport Authority Officers & Admins
 * Strictly audits ticket validity and metadata WITHOUT mutating ticket status,
 * WITHOUT calling findOneAndUpdate, and WITHOUT redeeming the ticket.
 * Exposes minimal metadata without sensitive passenger payment details.
 */
paymentsRouter.post('/tickets/inspect', requireAuthorityOrAdmin, async (req, res) => {
  try {
    const { qrData, ticketId } = req.body;

    let targetTicketId = ticketId;

    if (!targetTicketId && qrData) {
      try {
        const parsed = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
        targetTicketId = parsed.ticketId || parsed.id;
      } catch {
        targetTicketId = String(qrData).trim();
      }
    }

    if (!targetTicketId || typeof targetTicketId !== 'string' || !targetTicketId.trim()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Invalid ticket identifier supplied for inspection',
      });
    }

    const cleanTicketId = targetTicketId.trim();
    const tickets = getTicketsCollection();

    // READ-ONLY lookup: NEVER call findOneAndUpdate, NEVER change status, NEVER set redeemedAt
    const ticket = await tickets.findOne({ ticketId: cleanTicketId });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        valid: false,
        status: 'not_found',
        message: 'Forged or unknown ticket: Ticket ID does not exist in TransitLK system',
      });
    }

    const isValid = ticket.status === 'valid';

    return res.status(200).json({
      success: true,
      valid: isValid,
      status: ticket.status,
      inspectionType: 'READ_ONLY_AUDIT',
      inspectedBy: req.authorityUser ? req.authorityUser.email : 'authority_officer',
      inspectedAt: new Date().toISOString(),
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        busRegNumber: ticket.route?.bus || ticket.routeData?.bus || 'BUS 120',
        routeNumber: ticket.route?.routeNumber || ticket.routeData?.routeNumber || '120',
        operator: ticket.route?.type || 'TransitLK Bus',
        from: ticket.route?.from || ticket.routeData?.from || 'Origin',
        to: ticket.route?.to || ticket.routeData?.to || 'Destination',
        fare: ticket.amount,
        amount: ticket.amount,
        unitFare: ticket.unitFare || ticket.amount,
        seatNumber: ticket.numberOfTickets ? `${ticket.numberOfTickets} Seat(s)` : 'General',
        numberOfTickets: ticket.numberOfTickets || ticket.ticketCount || 1,
        ticketCount: ticket.ticketCount || ticket.numberOfTickets || 1,
        issuedAt: ticket.issuedAt,
        purchasedAt: ticket.issuedAt,
        redeemedAt: ticket.redeemedAt || null,
        redeemedBy: ticket.redeemedBy || null,
      },
    });
  } catch (error) {
    console.error('Ticket inspection error:', error);
    return res.status(500).json({
      success: false,
      valid: false,
      message: 'Server error during ticket inspection',
      error: error.message,
    });
  }
});

/**
 * 3. GET /api/payments/tickets/:ticketId
 * Public ticket status inquiry
 */
paymentsRouter.get('/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const tickets = getTicketsCollection();
    const ticket = await tickets.findOne({ ticketId });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    return res.json({
      success: true,
      ticket,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching ticket details',
      error: error.message,
    });
  }
});

/**
 * 4. GET /api/payments
 * Retrieve all payment records (sorted newest first)
 */
paymentsRouter.get('/', async (req, res) => {
  try {
    const payments = getPaymentsCollection();
    const list = await payments.find().sort().toArray();
    return res.json({
      success: true,
      count: list.length,
      data: list,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error: error.message,
    });
  }
});

/**
 * 5. GET /api/payments/:id
 * Retrieve single payment by MongoDB _id
 */
paymentsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payments = getPaymentsCollection();

    let query = { _id: id };
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
    }

    const payment = await payments.findOne(query);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    return res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching payment record',
      error: error.message,
    });
  }
});

/**
 * 6. PUT /api/payments/:id
 * Update payment record by MongoDB _id
 */
paymentsRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    updateData.updatedAt = new Date().toISOString();

    const payments = getPaymentsCollection();

    let query = { _id: id };
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
    }

    const result = await payments.findOneAndUpdate(
      query,
      { $set: updateData }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    return res.json({
      success: true,
      message: 'Payment record updated successfully',
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating payment record',
      error: error.message,
    });
  }
});

/**
 * 7. DELETE /api/payments/:id
 * Delete payment record by MongoDB _id
 */
paymentsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const payments = getPaymentsCollection();

    let query = { _id: id };
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      query = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
    }

    const result = await payments.deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    return res.json({
      success: true,
      message: 'Payment record deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error deleting payment record',
      error: error.message,
    });
  }
});
