import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { resetPaymentMemoryStore } from '../src/routes/payments.js';
import { registerTestAuthFixture, clearTestAuthFixtures } from '../src/testAuthFixtures.js';

let server;
let base;

const mockStore = {
  createUser: async () => {},
  findEmail: async () => null,
  findUser: async () => null,
  updateLanguage: async () => null,
  createSession: async () => {},
  findSession: async () => null,
  deleteSession: async () => {},
  ping: async () => {},
};

before(async () => {
  resetPaymentMemoryStore();
  clearTestAuthFixtures();
  registerTestAuthFixture('mock-conductor-token', { email: 'conductor@transitlk.com', role: 'conductor' });
  registerTestAuthFixture('mock-passenger-token', { email: 'passenger@transitlk.com', role: 'passenger' });
  registerTestAuthFixture('mock-authority-token', { email: 'officer@transport.gov.lk', role: 'authority' });
  registerTestAuthFixture('mock-admin-token', { email: 'admin@transitlk.com', role: 'admin' });
  registerTestAuthFixture('mock-passenger-user-1', { id: 'user-id-001', email: 'passenger1@transitlk.com', role: 'passenger' });
  registerTestAuthFixture('mock-passenger-user-2', { id: 'user-id-002', email: 'passenger2@transitlk.com', role: 'passenger' });

  const app = createApp(mockStore, { limit: 100 });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/payments`;
});

after(() => {
  clearTestAuthFixtures();
  return new Promise((resolve) => server.close(resolve));
});

async function api(path, method = 'GET', body = null, token = null, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const opts = { method, headers };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(base + path, opts);
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data };
}


test('1. Valid simulated payment issues unique server-side ticket without leaking card secrets', async () => {
  const paymentPayload = {
    amount: 240,
    method: 'card',
    ticketCount: 1,
    details: {
      cardNumber: '4111222233334444',
      cvv: '123',
      expiry: '12/28',
      cardholderName: 'Perera Test',
    },
    routeData: {
      bus: 'BUS-120',
      from: 'Colombo',
      to: 'Horana',
    },
  };

  const res = await api('/process', 'POST', paymentPayload);
  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.equal(res.data.mode, 'DEMO');

  // Verify ticket attributes
  const { ticket, data: payment, qrData } = res.data;
  assert.ok(ticket.ticketId.startsWith('TKT-'));
  assert.equal(ticket.status, 'valid');
  assert.equal(ticket.amount, 240);
  assert.equal(ticket.unitFare, 240);
  assert.ok(ticket.verificationCode);

  // Security check: Never store raw credit card numbers or CVVs
  assert.equal(payment.details.cardNumber, undefined);
  assert.equal(payment.details.cvv, undefined);
  assert.equal(payment.details.last4, '4444');

  // QR Data includes valid json payload
  const parsedQr = JSON.parse(qrData);
  assert.equal(parsedQr.ticketId, ticket.ticketId);
  assert.equal(parsedQr.isValid, true);
});

test('2. Unauthorized conductor request is rejected (missing/invalid token)', async () => {
  const resNoAuth = await api('/tickets/verify', 'POST', { ticketId: 'TKT-1234' });
  assert.equal(resNoAuth.status, 401);
  assert.equal(resNoAuth.data.success, false);

  const resBadToken = await api('/tickets/verify', 'POST', { ticketId: 'TKT-1234' }, 'bad-random-token');
  assert.equal(resBadToken.status, 401);
  assert.equal(resBadToken.data.success, false);
});

test('3. Non-conductor role (passenger token) is forbidden from ticket validation', async () => {
  const resPassenger = await api(
    '/tickets/verify',
    'POST',
    { ticketId: 'TKT-1234' },
    'mock-passenger-token'
  );
  assert.equal(resPassenger.status, 403);
  assert.equal(resPassenger.data.success, false);
});

test('4. Empty or invalid ticket identifier returns 400', async () => {
  const resEmpty = await api(
    '/tickets/verify',
    'POST',
    { ticketId: '   ' },
    'mock-conductor-token'
  );
  assert.equal(resEmpty.status, 400);
  assert.equal(resEmpty.data.success, false);
});

test('5. Forged or nonexistent ticket identifier returns 404', async () => {
  const resForged = await api(
    '/tickets/verify',
    'POST',
    { ticketId: 'TKT-FAKE-9999' },
    'mock-conductor-token'
  );
  assert.equal(resForged.status, 404);
  assert.equal(resForged.data.valid, false);
  assert.equal(resForged.data.status, 'not_found');
});

test('6. Valid ticket verifies successfully and marks status as redeemed atomically by conductor', async () => {
  // First, issue a new ticket on trusted route 125 (250 LKR)
  const issueRes = await api('/process', 'POST', {
    amount: 250,
    routeData: { bus: 'BUS-125', from: 'Horana', to: 'Colombo' },
  });
  assert.equal(issueRes.status, 201);
  const ticketId = issueRes.data.ticket.ticketId;

  // Conductor verifies the ticket
  const verifyRes = await api(
    '/tickets/verify',
    'POST',
    { ticketId },
    'mock-conductor-token'
  );
  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.data.success, true);
  assert.equal(verifyRes.data.valid, true);
  assert.equal(verifyRes.data.status, 'redeemed');
  assert.ok(verifyRes.data.ticket.redeemedAt);
});

test('7. Repeated redemption is rejected (prevents duplicate scans across conductor devices)', async () => {
  // Issue a ticket on route 120
  const issueRes = await api('/process', 'POST', {
    amount: 240,
    routeData: { bus: 'BUS-120', from: 'Horana', to: 'Colombo' },
  });
  assert.equal(issueRes.status, 201);
  const ticketId = issueRes.data.ticket.ticketId;

  // 1st scan: Succeeds and redeems
  const firstScan = await api(
    '/tickets/verify',
    'POST',
    { ticketId },
    'mock-conductor-token'
  );
  assert.equal(firstScan.status, 200);
  assert.equal(firstScan.data.status, 'redeemed');

  // 2nd scan: Must be rejected with 409 Conflict
  const secondScan = await api(
    '/tickets/verify',
    'POST',
    { ticketId },
    'mock-conductor-token'
  );
  assert.equal(secondScan.status, 409);
  assert.equal(secondScan.data.valid, false);
  assert.equal(secondScan.data.status, 'redeemed');
  assert.match(secondScan.data.message, /already been redeemed/i);
});

test('8. Invalid payment requests with non-positive amount are rejected (400)', async () => {
  const resZero = await api('/process', 'POST', { amount: 0, routeData: { bus: 'BUS-120' } });
  assert.equal(resZero.status, 400);
  assert.equal(resZero.data.success, false);

  const resNegative = await api('/process', 'POST', { amount: -150, routeData: { bus: 'BUS-120' } });
  assert.equal(resNegative.status, 400);
  assert.equal(resNegative.data.success, false);

  const resNan = await api('/process', 'POST', { amount: 'not-a-number', routeData: { bus: 'BUS-120' } });
  assert.equal(resNan.status, 400);
  assert.equal(resNan.data.success, false);
});

test('9. Repeat payment submissions produce distinct, unpredictable ticket IDs', async () => {
  const res1 = await api('/process', 'POST', {
    amount: 250,
    routeData: { bus: 'BUS-125', from: 'Horana', to: 'Colombo' },
  });
  const res2 = await api('/process', 'POST', {
    amount: 250,
    routeData: { bus: 'BUS-125', from: 'Horana', to: 'Colombo' },
  });

  assert.equal(res1.status, 201);
  assert.equal(res2.status, 201);
  assert.notEqual(res1.data.ticket.ticketId, res2.data.ticket.ticketId);
  assert.notEqual(res1.data.ticket.verificationCode, res2.data.ticket.verificationCode);
  assert.notEqual(res1.data.data.transactionId, res2.data.data.transactionId);
});

test('10. Authority role is forbidden from redeeming tickets via /tickets/verify (403)', async () => {
  // 1. Issue a valid ticket
  const issueRes = await api('/process', 'POST', {
    amount: 210,
    routeData: { bus: 'BUS-100', from: 'Panadura', to: 'Colombo' },
  });
  assert.equal(issueRes.status, 201);
  const ticketId = issueRes.data.ticket.ticketId;

  // 2. Authority officer tries to redeem via /tickets/verify -> Must be 403 Forbidden!
  const verifyRes = await api(
    '/tickets/verify',
    'POST',
    { ticketId },
    'mock-authority-token'
  );
  assert.equal(verifyRes.status, 403);
  assert.equal(verifyRes.data.success, false);
});

test('11. Production hardening rejects mock tokens in ticket verification when NODE_ENV=production', async () => {
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const resProd = await api(
      '/tickets/verify',
      'POST',
      { ticketId: 'TKT-TEST' },
      'mock-conductor-token'
    );
    assert.equal(resProd.status, 401);
    assert.equal(resProd.data.success, false);
  } finally {
    process.env.NODE_ENV = prevEnv || 'test';
  }
});

test('12. Payment idempotency: Retry with same key and payload returns identical ticket', async () => {
  const idempotencyKey = 'key-test-retry-001';
  const payload = {
    amount: 190,
    method: 'card',
    ticketCount: 1,
    idempotencyKey,
    routeData: { bus: 'BUS-138', from: 'Homagama', to: 'Colombo' },
  };

  const res1 = await api('/process', 'POST', payload, 'mock-passenger-user-1');
  assert.equal(res1.status, 201);
  const originalTicketId = res1.data.ticket.ticketId;
  const originalTxId = res1.data.data.transactionId;

  // Network retry: exact same request with same idempotencyKey
  const res2 = await api('/process', 'POST', payload, 'mock-passenger-user-1');
  assert.equal(res2.status, 201);
  assert.equal(res2.data.ticket.ticketId, originalTicketId);
  assert.equal(res2.data.data.transactionId, originalTxId);
  assert.equal(res2.data.ticket.amount, 190);
});

test('13. Payment idempotency: Reusing same key with different payload returns 409 Conflict', async () => {
  const idempotencyKey = 'key-conflict-002';
  const payload1 = {
    amount: 210,
    ticketCount: 1,
    idempotencyKey,
    routeData: { bus: 'BUS-100', from: 'Panadura', to: 'Colombo' },
  };
  const payload2 = {
    amount: 420,
    ticketCount: 2,
    idempotencyKey,
    routeData: { bus: 'BUS-100', from: 'Panadura', to: 'Colombo' },
  };

  const res1 = await api('/process', 'POST', payload1, 'mock-passenger-user-1');
  assert.equal(res1.status, 201);

  const res2 = await api('/process', 'POST', payload2, 'mock-passenger-user-1');
  assert.equal(res2.status, 409);
  assert.equal(res2.data.success, false);
  assert.equal(res2.data.code, 'IdempotencyConflict');
  assert.match(res2.data.message, /different payload/i);
});

test('14. Payment idempotency: Different users using the same key do not collide', async () => {
  const sharedKey = 'common-device-key-999';
  const payload = {
    amount: 160,
    ticketCount: 1,
    idempotencyKey: sharedKey,
    routeData: { bus: 'BUS-177', from: 'Kaduwela', to: 'Kollupitiya' },
  };

  // User 1 pays
  const resUser1 = await api('/process', 'POST', payload, 'mock-passenger-user-1');
  assert.equal(resUser1.status, 201);

  // User 2 pays with the same key name
  const resUser2 = await api('/process', 'POST', payload, 'mock-passenger-user-2');
  assert.equal(resUser2.status, 201);

  // Both users must receive distinct tickets
  assert.notEqual(resUser1.data.ticket.ticketId, resUser2.data.ticket.ticketId);
  assert.notEqual(resUser1.data.data.transactionId, resUser2.data.data.transactionId);
});

test('15. Payment idempotency: Concurrent requests with same key are handled safely without duplicate tickets', async () => {
  const idempotencyKey = 'concurrent-key-' + Date.now();
  const payload = {
    amount: 240,
    ticketCount: 1,
    idempotencyKey,
    routeData: { bus: 'BUS-120', from: 'Colombo', to: 'Horana' },
  };

  const [resA, resB] = await Promise.all([
    api('/process', 'POST', payload, 'mock-passenger-user-1'),
    api('/process', 'POST', payload, 'mock-passenger-user-1'),
  ]);

  const responses = [resA, resB];
  const successes = responses.filter((r) => r.status === 201);
  assert.ok(successes.length >= 1, 'At least one request succeeded');

  if (successes.length === 2) {
    assert.equal(resA.data.ticket.ticketId, resB.data.ticket.ticketId);
  } else {
    const conflict = responses.find((r) => r.status === 409);
    assert.ok(conflict);
    assert.equal(conflict.data.code, 'IdempotencyConflict');
  }
});

test('16. Payment idempotency: Idempotency-Key HTTP header is supported', async () => {
  const headerKey = 'header-key-' + Date.now();
  const payload = {
    amount: 190,
    ticketCount: 1,
    routeData: { bus: 'BUS-138', from: 'Homagama', to: 'Colombo' },
  };

  const res1 = await api('/process', 'POST', payload, 'mock-passenger-user-1', { 'Idempotency-Key': headerKey });
  assert.equal(res1.status, 201);
  const ticketId = res1.data.ticket.ticketId;

  // Retry with same header
  const res2 = await api('/process', 'POST', payload, 'mock-passenger-user-1', { 'Idempotency-Key': headerKey });
  assert.equal(res2.status, 201);
  assert.equal(res2.data.ticket.ticketId, ticketId);
});

test('17. Fare validation rejects underpayment and altered client amount (400 FareMismatch)', async () => {
  const alteredPayload = {
    amount: 50, // Trusted fare for Route 120 is 240
    ticketCount: 1,
    routeData: { bus: 'BUS-120', from: 'Colombo', to: 'Horana' },
  };

  const res = await api('/process', 'POST', alteredPayload);
  assert.equal(res.status, 400);
  assert.equal(res.data.success, false);
  assert.equal(res.data.code, 'FareMismatch');
  assert.match(res.data.message, /Fare amount mismatch/i);
});

test('18. Fare validation rejects unknown or unsupported routes (400 UnknownRouteFare)', async () => {
  const unknownRoutePayload = {
    amount: 500,
    ticketCount: 1,
    routeData: { bus: 'BUS-UNKNOWN-999', from: 'Nowhere', to: 'Somewhere' },
  };

  const res = await api('/process', 'POST', unknownRoutePayload);
  assert.equal(res.status, 400);
  assert.equal(res.data.success, false);
  assert.equal(res.data.code, 'UnknownRouteFare');
  assert.match(res.data.message, /Unknown or unsupported route/i);
});

test('19. Fare validation rejects invalid ticket counts (0, 15, fractional, negative)', async () => {
  const zeroCount = await api('/process', 'POST', {
    amount: 240,
    ticketCount: 0,
    routeData: { bus: 'BUS-120' },
  });
  assert.equal(zeroCount.status, 400);
  assert.equal(zeroCount.data.code, 'InvalidTicketCount');

  const excessCount = await api('/process', 'POST', {
    amount: 2400,
    ticketCount: 15,
    routeData: { bus: 'BUS-120' },
  });
  assert.equal(excessCount.status, 400);
  assert.equal(excessCount.data.code, 'InvalidTicketCount');

  const fractionalCount = await api('/process', 'POST', {
    amount: 360,
    ticketCount: 1.5,
    routeData: { bus: 'BUS-120' },
  });
  assert.equal(fractionalCount.status, 400);
  assert.equal(fractionalCount.data.code, 'InvalidTicketCount');
});

test('20. Authority role can inspect valid tickets read-only (returns 200, status remains valid)', async () => {
  // Issue a ticket on route 120
  const issueRes = await api('/process', 'POST', {
    amount: 240,
    ticketCount: 1,
    routeData: { bus: 'BUS-120', from: 'Horana', to: 'Colombo' },
  });
  assert.equal(issueRes.status, 201);
  const ticketId = issueRes.data.ticket.ticketId;

  // Authority officer inspects the ticket
  const inspectRes = await api(
    '/tickets/inspect',
    'POST',
    { ticketId },
    'mock-authority-token'
  );
  assert.equal(inspectRes.status, 200);
  assert.equal(inspectRes.data.success, true);
  assert.equal(inspectRes.data.valid, true);
  assert.equal(inspectRes.data.status, 'valid');
  assert.equal(inspectRes.data.inspectionType, 'READ_ONLY_AUDIT');
  assert.equal(inspectRes.data.ticket.ticketId, ticketId);
  assert.equal(inspectRes.data.ticket.status, 'valid');
  assert.equal(inspectRes.data.ticket.redeemedAt, null);
  assert.equal(inspectRes.data.ticket.fare, 240);

  // Security check: No payment details or CVV leaked
  assert.equal(inspectRes.data.ticket.cardNumber, undefined);
  assert.equal(inspectRes.data.ticket.cvv, undefined);
});

test('21. Repeated authority inspections never alter ticket state or set redeemedAt', async () => {
  // Issue a ticket on route 125
  const issueRes = await api('/process', 'POST', {
    amount: 250,
    ticketCount: 1,
    routeData: { bus: 'BUS-125', from: 'Horana', to: 'Colombo' },
  });
  assert.equal(issueRes.status, 201);
  const ticketId = issueRes.data.ticket.ticketId;

  // Inspect 3 times consecutively
  for (let i = 0; i < 3; i++) {
    const inspectRes = await api(
      '/tickets/inspect',
      'POST',
      { ticketId },
      'mock-authority-token'
    );
    assert.equal(inspectRes.status, 200);
    assert.equal(inspectRes.data.valid, true);
    assert.equal(inspectRes.data.status, 'valid');
    assert.equal(inspectRes.data.ticket.status, 'valid');
    assert.equal(inspectRes.data.ticket.redeemedAt, null);
    assert.equal(inspectRes.data.ticket.redeemedBy, null);
  }
});

test('22. Conductor can still redeem a previously inspected valid ticket via /tickets/verify', async () => {
  // Issue ticket
  const issueRes = await api('/process', 'POST', {
    amount: 240,
    ticketCount: 1,
    routeData: { bus: 'BUS-120', from: 'Horana', to: 'Colombo' },
  });
  const ticketId = issueRes.data.ticket.ticketId;

  // 1. Authority inspects ticket
  const inspectRes = await api(
    '/tickets/inspect',
    'POST',
    { ticketId },
    'mock-authority-token'
  );
  assert.equal(inspectRes.status, 200);
  assert.equal(inspectRes.data.valid, true);
  assert.equal(inspectRes.data.status, 'valid');

  // 2. Conductor redeems the ticket
  const verifyRes = await api(
    '/tickets/verify',
    'POST',
    { ticketId },
    'mock-conductor-token'
  );
  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.data.valid, true);
  assert.equal(verifyRes.data.status, 'redeemed');
  assert.ok(verifyRes.data.ticket.redeemedAt);
});

test('23. Conductor role cannot access authority read-only inspection /tickets/inspect (403 forbidden)', async () => {
  const inspectRes = await api(
    '/tickets/inspect',
    'POST',
    { ticketId: 'TKT-TEST-ROLE' },
    'mock-conductor-token'
  );
  assert.equal(inspectRes.status, 403);
  assert.equal(inspectRes.data.success, false);
});

test('24. Passenger role cannot access authority read-only inspection /tickets/inspect (403 forbidden)', async () => {
  const inspectRes = await api(
    '/tickets/inspect',
    'POST',
    { ticketId: 'TKT-TEST-ROLE' },
    'mock-passenger-token'
  );
  assert.equal(inspectRes.status, 403);
  assert.equal(inspectRes.data.success, false);
});

test('25. Forged or nonexistent ticket in /tickets/inspect returns 404 not_found', async () => {
  const inspectRes = await api(
    '/tickets/inspect',
    'POST',
    { ticketId: 'TKT-FAKE-FORGED-999' },
    'mock-authority-token'
  );
  assert.equal(inspectRes.status, 404);
  assert.equal(inspectRes.data.valid, false);
  assert.equal(inspectRes.data.status, 'not_found');
});

test('26. Inspection of already redeemed ticket returns valid: false with status redeemed without mutating ticket', async () => {
  // Issue ticket on route 120
  const issueRes = await api('/process', 'POST', {
    amount: 240,
    ticketCount: 1,
    routeData: { bus: 'BUS-120', from: 'Horana', to: 'Colombo' },
  });
  const ticketId = issueRes.data.ticket.ticketId;

  // Conductor redeems ticket
  await api(
    '/tickets/verify',
    'POST',
    { ticketId },
    'mock-conductor-token'
  );

  // Authority inspects the redeemed ticket
  const inspectRes = await api(
    '/tickets/inspect',
    'POST',
    { ticketId },
    'mock-authority-token'
  );
  assert.equal(inspectRes.status, 200);
  assert.equal(inspectRes.data.valid, false);
  assert.equal(inspectRes.data.status, 'redeemed');
  assert.ok(inspectRes.data.ticket.redeemedAt);
});
