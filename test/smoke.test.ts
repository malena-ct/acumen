import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

// Force fake env values BEFORE src/config.ts is loaded. Top-level `import`
// statements are hoisted above plain statements, so importing createApp at the
// top would let src/config.ts's dotenv.config() populate real credentials from
// .env before we can override them. We use require() below to guarantee the
// app module is evaluated *after* these assignments run.
process.env.GOOGLE_CLIENT_ID = 'fake-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'fake-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
process.env.GOOGLE_DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
process.env.GOOGLE_TOKEN_PATH = './test/.smoke-tokens-doesnt-exist.json';

const { createApp } = require('../src/index') as typeof import('../src/index');

test('GET /health returns ok', async () => {
  const app = createApp();
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.service, 'halketon');
});

test('GET /auth/status reports unauthenticated when no token file exists', async () => {
  const app = createApp();
  const res = await request(app).get('/auth/status');
  assert.equal(res.status, 200);
  assert.equal(res.body.authenticated, false);
});

test('GET /auth/google?redirect=0 returns a consent URL', async () => {
  const app = createApp();
  const res = await request(app).get('/auth/google?redirect=0');
  assert.equal(res.status, 200);
  assert.match(res.body.url, /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/);
  assert.match(res.body.url, /client_id=fake-client-id/);
});

test('GET /drive/files returns 401 when not authenticated', async () => {
  const app = createApp();
  const res = await request(app).get('/drive/files');
  assert.equal(res.status, 401);
  assert.match(res.body.error ?? '', /authenticat/i);
});

test('GET unknown route returns 404 JSON', async () => {
  const app = createApp();
  const res = await request(app).get('/does-not-exist');
  assert.equal(res.status, 404);
  assert.match(res.body.error ?? '', /Not Found/);
});
