import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import type { Credentials } from 'google-auth-library';
import fs from 'node:fs/promises';
import { loadConfig } from './config';

export const SESSION_COOKIE = 'halketon_session';

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptCredentials(creds: Credentials): string {
  const key = deriveKey(loadConfig().authSecret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(creds), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptCredentials(token: string): Credentials | null {
  try {
    const [version, ivB64, tagB64, dataB64] = token.split('.');
    if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) return null;
    const key = deriveKey(loadConfig().authSecret);
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const data = Buffer.from(dataB64, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8')) as Credentials;
  } catch {
    return null;
  }
}

interface CookieOptions {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge?: number;
}

function cookieOptions(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: loadConfig().isProduction,
    path: '/',
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

export async function readSessionCredentials(): Promise<Credentials | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (value) {
    const decoded = decryptCredentials(value);
    if (decoded) return decoded;
  }
  return readTokenFileFallback();
}

export async function writeSessionCredentials(creds: Credentials): Promise<void> {
  const store = await cookies();
  // 30 days. Refresh tokens last longer but cookie size + privacy: rotate often.
  store.set(SESSION_COOKIE, encryptCredentials(creds), cookieOptions(60 * 60 * 24 * 30));

  // Best-effort: mirror to local token file if configured (dev convenience).
  const cfg = loadConfig();
  if (cfg.google.tokenPath) {
    try {
      await fs.writeFile(cfg.google.tokenPath, JSON.stringify(creds, null, 2), {
        mode: 0o600,
      });
    } catch {
      // Non-fatal: cookie is authoritative.
    }
  }
}

export async function clearSessionCredentials(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', cookieOptions(0));
}

async function readTokenFileFallback(): Promise<Credentials | null> {
  const cfg = loadConfig();
  if (!cfg.google.tokenPath) return null;
  try {
    const raw = await fs.readFile(cfg.google.tokenPath, 'utf8');
    return JSON.parse(raw) as Credentials;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    return null;
  }
}
