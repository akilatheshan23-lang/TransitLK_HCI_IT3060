import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { resetAdminMemoryStore } from '../src/routes/admin.js';

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
  resetAdminMemoryStore();
  const app = createApp(mockStore, { limit: 100 });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/admin`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function adminApi(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
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

test('1. Admin endpoints reject requests with missing authorization token', async () => {
  const resStats = await adminApi('/stats', 'GET');
  assert.equal(resStats.status, 401);
  assert.equal(resStats.data.success, false);
  assert.match(resStats.data.message, /token required/i);

  const resPending = await adminApi('/pending', 'GET');
  assert.equal(resPending.status, 401);
  assert.equal(resPending.data.success, false);

  const resApprove = await adminApi('/approve/user-123', 'POST');
  assert.equal(resApprove.status, 401);
  assert.equal(resApprove.data.success, false);

  const resReject = await adminApi('/reject/user-123', 'POST');
  assert.equal(resReject.status, 401);
  assert.equal(resReject.data.success, false);
});

test('2. Admin endpoints reject invalid or malformed bearer tokens', async () => {
  const resBadToken = await adminApi('/stats', 'GET', null, 'invalid-random-token-xyz');
  assert.equal(resBadToken.status, 401);
  assert.equal(resBadToken.data.success, false);
  assert.match(resBadToken.data.message, /session invalid|expired|failed/i);

  const resBadApprove = await adminApi('/approve/user-123', 'POST', null, 'expired-token');
  assert.equal(resBadApprove.status, 401);
  assert.equal(resBadApprove.data.success, false);
});

test('3. Non-admin roles (e.g. passenger) are forbidden from admin actions (403)', async () => {
  const resStats = await adminApi('/stats', 'GET', null, 'mock-passenger-token');
  assert.equal(resStats.status, 403);
  assert.equal(resStats.data.success, false);
  assert.match(resStats.data.message, /privileges required|admin/i);

  const resPending = await adminApi('/pending', 'GET', null, 'mock-passenger-token');
  assert.equal(resPending.status, 403);
  assert.equal(resPending.data.success, false);

  const resApprove = await adminApi('/approve/user-123', 'POST', null, 'mock-passenger-token');
  assert.equal(resApprove.status, 403);
  assert.equal(resApprove.data.success, false);

  const resReject = await adminApi('/reject/user-123', 'POST', null, 'mock-passenger-token');
  assert.equal(resReject.status, 403);
  assert.equal(resReject.data.success, false);
});

test('4. Authorized admin token is allowed to access admin endpoints', async () => {
  const resStats = await adminApi('/stats', 'GET', null, 'mock-admin-token');
  assert.equal(resStats.status, 200);
  assert.equal(resStats.data.success, true);
  assert.ok(resStats.data.stats);

  const resPending = await adminApi('/pending', 'GET', null, 'mock-admin-token');
  assert.equal(resPending.status, 200);
  assert.equal(resPending.data.success, true);
  assert.ok(Array.isArray(resPending.data.users));
});

test('5. Seed demo pending accounts is protected with admin authorization', async () => {
  const resNoAuth = await adminApi('/seed-demo-pending', 'POST');
  assert.equal(resNoAuth.status, 401);

  const resPassenger = await adminApi('/seed-demo-pending', 'POST', null, 'mock-passenger-token');
  assert.equal(resPassenger.status, 403);

  const resAdmin = await adminApi('/seed-demo-pending', 'POST', null, 'mock-admin-token');
  assert.equal(resAdmin.status, 200);
  assert.equal(resAdmin.data.success, true);
});

test('6. Unauthorized users cannot approve pending officers or bus owners', async () => {
  // First seed pending accounts using admin
  await adminApi('/seed-demo-pending', 'POST', null, 'mock-admin-token');

  const pendingRes = await adminApi('/pending', 'GET', null, 'mock-admin-token');
  assert.equal(pendingRes.status, 200);
  assert.ok(pendingRes.data.users.length > 0);
  const targetUser = pendingRes.data.users[0];
  const targetId = targetUser._id || targetUser.id;

  // 1. Unauthenticated request to approve is rejected with 401
  const unauthApprove = await adminApi(`/approve/${targetId}`, 'POST');
  assert.equal(unauthApprove.status, 401);
  assert.equal(unauthApprove.data.success, false);

  // 2. Passenger role request to approve is forbidden with 403
  const passengerApprove = await adminApi(`/approve/${targetId}`, 'POST', null, 'mock-passenger-token');
  assert.equal(passengerApprove.status, 403);
  assert.equal(passengerApprove.data.success, false);

  // 3. Conductor role request to approve is forbidden with 403
  const conductorApprove = await adminApi(`/approve/${targetId}`, 'POST', null, 'mock-conductor-token');
  assert.equal(conductorApprove.status, 403);
  assert.equal(conductorApprove.data.success, false);

  // 4. Authorized admin can approve
  const adminApprove = await adminApi(`/approve/${targetId}`, 'POST', null, 'mock-admin-token');
  assert.equal(adminApprove.status, 200);
  assert.equal(adminApprove.data.success, true);
  assert.match(adminApprove.data.message, /successfully approved/i);
});
