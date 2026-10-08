import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { resetPaymentMemoryStore } from '../src/routes/payments.js';

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
  const app = createApp(mockStore, { limit: 100 });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/payments`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function api(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const opts = { method, headers };
  if (body) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(base + path, opts);
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

test('1. Valid simulated payment issues unique server-side ticket without leaking card secrets', async () => {
  const paymentPayload = {
    amount: 350,
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
  assert.equal(ticket.amount, 350);
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

test('6. Valid ticket verifies successfully and marks status as redeemed atomically', async () => {
  // First, issue a new ticket
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
  // Issue a ticket
  const issueRes = await api('/process', 'POST', {
    amount: 500,
    routeData: { bus: 'BUS-EXPRESS', from: 'Kandy', to: 'Colombo' },
  });
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
