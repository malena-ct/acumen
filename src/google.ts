import { google, drive_v3 } from 'googleapis';
import type { Credentials, OAuth2Client } from 'google-auth-library';
import * as fs from 'fs/promises';
import { loadConfig } from './config';

let oauthClient: OAuth2Client | undefined;

export function getOAuthClient(): OAuth2Client {
  if (oauthClient) return oauthClient;
  const cfg = loadConfig();
  oauthClient = new google.auth.OAuth2(
    cfg.google.clientId,
    cfg.google.clientSecret,
    cfg.google.redirectUri,
  );
  oauthClient.on('tokens', (tokens) => {
    // Persist refreshed tokens automatically. Merge with existing on disk so we
    // never lose the refresh_token (Google only returns it on first consent).
    void mergeAndPersistTokens(tokens).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Failed to persist refreshed tokens:', err);
    });
  });
  return oauthClient;
}

async function readTokenFile(): Promise<Credentials | null> {
  const cfg = loadConfig();
  try {
    const raw = await fs.readFile(cfg.google.tokenPath, 'utf8');
    return JSON.parse(raw) as Credentials;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

async function writeTokenFile(creds: Credentials): Promise<void> {
  const cfg = loadConfig();
  await fs.writeFile(cfg.google.tokenPath, JSON.stringify(creds, null, 2), {
    mode: 0o600,
  });
}

export async function persistTokens(creds: Credentials): Promise<void> {
  await writeTokenFile(creds);
  getOAuthClient().setCredentials(creds);
}

async function mergeAndPersistTokens(partial: Credentials): Promise<void> {
  const existing = (await readTokenFile()) ?? {};
  const merged: Credentials = { ...existing, ...partial };
  // Never clobber an existing refresh_token with undefined.
  if (!merged.refresh_token && existing.refresh_token) {
    merged.refresh_token = existing.refresh_token;
  }
  await writeTokenFile(merged);
  getOAuthClient().setCredentials(merged);
}

export async function loadStoredTokens(): Promise<Credentials | null> {
  const creds = await readTokenFile();
  if (creds) {
    getOAuthClient().setCredentials(creds);
  }
  return creds;
}

export async function hasStoredTokens(): Promise<boolean> {
  const creds = await readTokenFile();
  return !!(creds && (creds.access_token || creds.refresh_token));
}

export function getAuthUrl(): string {
  const cfg = loadConfig();
  return getOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: cfg.google.scopes,
    include_granted_scopes: true,
  });
}

export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  await mergeAndPersistTokens(tokens);
  return tokens;
}

export async function getDriveClient(): Promise<drive_v3.Drive> {
  const client = getOAuthClient();
  if (!client.credentials || !client.credentials.access_token) {
    const stored = await loadStoredTokens();
    if (!stored) {
      throw new AuthRequiredError('Not authenticated. Visit /auth/google first.');
    }
  }
  return google.drive({ version: 'v3', auth: client });
}

export class AuthRequiredError extends Error {
  readonly status = 401;
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}
