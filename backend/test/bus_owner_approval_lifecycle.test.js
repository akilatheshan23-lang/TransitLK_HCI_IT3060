import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { resetAdminMemoryStore } from '../src/routes/admin.js';
import { resetBusesMemoryStore } from '../src/routes/buses.js';
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
  resetAdminMemoryStore();
  resetBusesMemoryStore();
  clearTestAuthFixtures();
  registerTestAuthFixture('test-admin-token', { username: 'admin', email: 'admin@transitlk.com', role: 'admin' });
  registerTestAuthFixture('test-passenger-token', { username: 'passenger', email: 'passenger@transitlk.com', role: 'passenger' });

  const app = createApp(mockStore, { limit: 100, testAuthFixtures: { 'test-admin-token': { role:'admin' }, 'test-passenger-token': { role:'passenger' }, 'test-owner-token': { _id:'default-owner-01',name:'Test Owner',email:'owner@example.test',role:'bus_owner',status:'approved' } } });
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  clearTestAuthFixtures();
  return new Promise((resolve) => server.close(resolve));
});

async function api(path, method = 'GET', body = null, token = 'test-owner-token') {
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

test('1. Bus owner can add new bus and schedule with status pending', async () => {
  const payload = {
    busRegNumber: 'WP ND-9988',
    routeNumber: '120',
    routeName: 'Horana - Colombo (Pettah)',
    startPoint: 'Horana Central Terminal',
    endPoint: 'Colombo (Pettah Bus Stand)',
    departureTime: '06:15 AM',
    arrivalTime: '07:35 AM',
    journeyDuration: '1 hr 20 mins',
    busType: 'Luxury AC',
    totalSeats: 48,
    baseFare: 240,
  };

  const res = await api('/buses', 'POST', payload);
  assert.equal(res.status, 201);
  assert.equal(res.data.success, true);
  assert.equal(res.data.bus.busRegNumber, 'WP ND-9988');
  assert.equal(res.data.bus.routeNumber, '120');
  assert.equal(res.data.bus.startPoint, 'Horana Central Terminal');
  assert.equal(res.data.bus.endPoint, 'Colombo (Pettah Bus Stand)');
  assert.equal(res.data.bus.departureTime, '06:15 AM');
  assert.equal(res.data.bus.arrivalTime, '07:35 AM');
  assert.equal(res.data.bus.journeyDuration, '1 hr 20 mins');
  assert.equal(res.data.bus.status, 'pending');
  assert.equal(res.data.bus.submissionType, 'new');
});

test('2. Admin can retrieve pending bus schedule submissions awaiting approval', async () => {
  const res = await api('/admin/pending-buses', 'GET', null, 'test-admin-token');
  assert.equal(res.status, 200);
  assert.equal(res.data.success, true);
  assert.ok(Array.isArray(res.data.buses));
  const found = res.data.buses.find((b) => b.busRegNumber === 'WP ND-9988');
  assert.ok(found, 'Pending bus should be returned in admin pending queue');
  assert.equal(found.status, 'pending');
});

test('3. Non-admin users cannot approve bus schedules', async () => {
  const pendingRes = await api('/admin/pending-buses', 'GET', null, 'test-admin-token');
  const bus = pendingRes.data.buses.find((b) => b.busRegNumber === 'WP ND-9988');
  assert.ok(bus);

  const res = await api(`/admin/buses/${bus._id}/approve`, 'POST', {}, 'test-passenger-token');
  assert.equal(res.status, 403);
  assert.equal(res.data.success, false);
});

test('4. Admin can approve pending bus submission, making it active/approved', async () => {
  const pendingRes = await api('/admin/pending-buses', 'GET', null, 'test-admin-token');
  const bus = pendingRes.data.buses.find((b) => b.busRegNumber === 'WP ND-9988');
  assert.ok(bus);

  const approveRes = await api(`/admin/buses/${bus._id}/approve`, 'POST', {}, 'test-admin-token');
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.data.success, true);
  assert.equal(approveRes.data.bus.status, 'approved');
  assert.ok(approveRes.data.bus.approvedAt);

  // Verify bus is no longer in pending list
  const verifyRes = await api('/admin/pending-buses', 'GET', null, 'test-admin-token');
  const stillPending = verifyRes.data.buses.find((b) => b.busRegNumber === 'WP ND-9988');
  assert.equal(stillPending, undefined);
});

test('5. Bus owner can edit bus details & timetable, which resets status to pending for Admin re-approval', async () => {
  const allRes = await api('/admin/buses', 'GET', null, 'test-admin-token');
  const bus = allRes.data.buses.find((b) => b.busRegNumber === 'WP ND-9988');
  assert.ok(bus);

  const editPayload = {
    busRegNumber: 'WP ND-9988',
    routeNumber: '120',
    routeName: 'Horana - Colombo (Express)',
    startPoint: 'Horana Bus Stand',
    endPoint: 'Colombo Fort',
    departureTime: '06:00 AM',
    arrivalTime: '07:15 AM',
    journeyDuration: '1 hr 15 mins',
    busType: 'Super Luxury AC',
    totalSeats: 45,
    baseFare: 260,
  };

  const editRes = await api(`/buses/${bus._id}`, 'PUT', editPayload);
  assert.equal(editRes.status, 200);
  assert.equal(editRes.data.success, true);
  assert.equal(editRes.data.bus.departureTime, '06:00 AM');
  assert.equal(editRes.data.bus.arrivalTime, '07:15 AM');
  assert.equal(editRes.data.bus.journeyDuration, '1 hr 15 mins');
  assert.equal(editRes.data.bus.status, 'pending');
  assert.equal(editRes.data.bus.submissionType, 'update');

  // Verify bus reappears in admin pending queue
  const pendingRes = await api('/admin/pending-buses', 'GET', null, 'test-admin-token');
  const reappeared = pendingRes.data.buses.find((b) => b.busRegNumber === 'WP ND-9988');
  assert.ok(reappeared, 'Edited bus must require Admin re-approval');
  assert.equal(reappeared.status, 'pending');
  assert.equal(reappeared.submissionType, 'update');
});

test('6. Admin can reject a bus submission with feedback reason', async () => {
  const pendingRes = await api('/admin/pending-buses', 'GET', null, 'test-admin-token');
  const bus = pendingRes.data.buses.find((b) => b.busRegNumber === 'WP ND-9988');
  assert.ok(bus);

  const rejectRes = await api(
    `/admin/buses/${bus._id}/reject`,
    'POST',
    { reason: 'Route permit not valid for 06:00 AM departure slot' },
    'test-admin-token'
  );
  assert.equal(rejectRes.status, 200);
  assert.equal(rejectRes.data.success, true);
  assert.equal(rejectRes.data.bus.status, 'rejected');
  assert.equal(rejectRes.data.bus.rejectionReason, 'Route permit not valid for 06:00 AM departure slot');
});

test('7. Bus owner can delete bus from the fleet', async () => {
  const allRes = await api('/admin/buses', 'GET', null, 'test-admin-token');
  const bus = allRes.data.buses.find((b) => b.busRegNumber === 'WP ND-9988');
  assert.ok(bus);

  const deleteRes = await api(`/buses/${bus._id}`, 'DELETE');
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.data.success, true);

  // Verify bus is gone
  const getRes = await api(`/buses/${bus._id}`, 'GET');
  assert.equal(getRes.status, 404);
});
test('8. Unauthenticated callers cannot register, edit or delete buses', async () => {
  assert.equal((await api('/buses', 'POST', {}, null)).status, 401);
  assert.equal((await api('/buses/unknown', 'PUT', {}, null)).status, 401);
  assert.equal((await api('/buses/unknown', 'DELETE', null, null)).status, 401);
});
