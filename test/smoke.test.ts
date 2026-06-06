import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('project is configured as a Next.js app', () => {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
  };

  assert.equal(pkg.scripts.dev, 'next dev');
  assert.equal(pkg.scripts.build, 'next build');
  assert.equal(pkg.scripts.start, 'next start');
  assert.ok(pkg.dependencies.next);
  assert.ok(pkg.dependencies.react);
});

test('core pages and API routes exist', () => {
  const required = [
    'app/layout.tsx',
    'app/page.tsx',
    'app/api/health/route.ts',
    'app/api/auth/google/route.ts',
    'app/api/auth/google/callback/route.ts',
    'app/api/auth/status/route.ts',
    'app/api/auth/logout/route.ts',
    'app/api/drive/files/route.ts',
    'app/api/drive/files/[fileId]/route.ts',
    'app/api/drive/files/[fileId]/content/route.ts',
    'app/api/drive/files/[fileId]/metadata/route.ts',
    'lib/config.ts',
    'lib/google.ts',
    'lib/session.ts',
  ];

  for (const rel of required) {
    assert.equal(existsSync(path.join(root, rel)), true, `${rel} should exist`);
  }
});

test('README documents Vercel callback path', () => {
  const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /\/api\/auth\/google\/callback/);
  assert.match(readme, /Vercel/i);
});
