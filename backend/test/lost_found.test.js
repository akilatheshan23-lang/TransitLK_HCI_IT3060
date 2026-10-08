import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { tokenHash } from '../src/auth.js';

const token = 'c'.repeat(64);
const otherToken = 'd'.repeat(64);
const posts = new Map();
let sequence = 0;

const store = {
  findSession: async (hash) => {
    if (hash === tokenHash(token)) {
      return { userId: 'u_passenger', expiresAt: new Date(Date.now() + 86400000) };
    }
    if (hash === tokenHash(otherToken)) {
      return { userId: 'u_other', expiresAt: new Date(Date.now() + 86400000) };
    }
    return null;
  },
  findUser: async (id) => ({ _id: id, name: id === 'u_passenger' ? 'Test Passenger' : 'Other User' }),
  listLostFoundPosts: async () => [...posts.values()].sort((a, b) => b.createdAt - a.createdAt),
  findLostFoundPost: async (id) => posts.get(id) || null,
  createLostFoundPost: async (userId, data) => {
    const post = {
      id: String(++sequence),
      userId,
      ...data,
      comments: [],
      likes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    posts.set(post.id, post);
    return post;
  },
  updateLostFoundPost: async (userId, id, data) => {
    const existing = posts.get(id);
    if (!existing || existing.userId !== userId) return null;
    Object.assign(existing, data, { updatedAt: new Date() });
    return existing;
  },
  deleteLostFoundPost: async (userId, id) => {
    const existing = posts.get(id);
    if (!existing || existing.userId !== userId) return false;
    posts.delete(id);
    return true;
  },
  addLostFoundComment: async (id, comment) => {
    const existing = posts.get(id);
    if (!existing) return null;
    existing.comments.push({ ...comment, createdAt: new Date() });
    return existing;
  },
  ping: async () => {},
};

let server;
let base;

before(async () => {
  server = createApp(store).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function call(path, method = 'GET', body = null, bearer = token) {
  const headers = { 'Content-Type': 'application/json' };
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  const r = await fetch(base + path, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: r.status === 204 ? null : await r.json() };
}

test('1. Lost & Found rejects unauthenticated creation', async () => {
  const r = await call('/lost-found', 'POST', {
    type: 'lost',
    item: 'Blue Backpack',
    description: 'Left on seat 14',
    routeTime: 'Route 125 • 08:30 AM',
  }, null);
  assert.equal(r.status, 401);
});

test('2. Valid Lost & Found post creation with canonical fields', async () => {
  const r = await call('/lost-found', 'POST', {
    type: 'lost',
    item: 'Leather Wallet',
    description: 'Black leather wallet with ID card inside',
    routeTime: '138 • 09:15 AM',
  });
  assert.equal(r.status, 201);
  assert.ok(r.data.post);
  assert.equal(r.data.post.type, 'lost');
  assert.equal(r.data.post.item, 'Leather Wallet');
  assert.equal(r.data.post.description, 'Black leather wallet with ID card inside');
  assert.equal(r.data.post.routeTime, '138 • 09:15 AM');
  assert.equal(r.data.post.authorName, 'Test Passenger');
});

test('3. Maps UI title to item and preserves location/busRegNumber metadata', async () => {
  const r = await call('/lost-found', 'POST', {
    type: 'found',
    title: 'Silver Water Bottle',
    description: 'Stainless steel bottle found on overhead rack',
    location: 'Maharagama',
    busRegNumber: 'NB-4421',
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.post.type, 'found');
  assert.equal(r.data.post.item, 'Silver Water Bottle');
  assert.equal(r.data.post.location, 'Maharagama');
  assert.equal(r.data.post.busRegNumber, 'NB-4421');
  assert.equal(r.data.post.routeTime, 'Maharagama • NB-4421');
});

test('4. Rejects missing required fields (no item or title)', async () => {
  const r = await call('/lost-found', 'POST', {
    type: 'lost',
    description: 'Left on the bus',
    routeTime: '125 • Morning',
  });
  assert.equal(r.status, 400);
  assert.equal(r.data.error, 'Enter valid lost or found item details.');
});

test('5. Rejects missing description', async () => {
  const r = await call('/lost-found', 'POST', {
    type: 'lost',
    item: 'Keys',
    routeTime: '125 • Morning',
  });
  assert.equal(r.status, 400);
});

test('6. Rejects missing routeTime when no fallback location/busRegNumber provided', async () => {
  const r = await call('/lost-found', 'POST', {
    type: 'lost',
    item: 'Umbrella',
    description: 'Black folding umbrella',
  });
  assert.equal(r.status, 400);
});

test('7. Rejects invalid type enum (e.g. stolen)', async () => {
  const r = await call('/lost-found', 'POST', {
    type: 'stolen',
    item: 'Umbrella',
    description: 'Black folding umbrella',
    routeTime: '125 • Morning',
  });
  assert.equal(r.status, 400);
});

test('8. List and retrieve created Lost & Found posts', async () => {
  const listRes = await call('/lost-found', 'GET', null, null);
  assert.equal(listRes.status, 200);
  assert.ok(Array.isArray(listRes.data.posts));
  assert.ok(listRes.data.posts.length >= 2);

  const postId = listRes.data.posts[0].id;
  const singleRes = await call(`/lost-found/${postId}`, 'GET', null, null);
  assert.equal(singleRes.status, 200);
  assert.equal(singleRes.data.post.id, postId);
});
