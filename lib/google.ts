import 'server-only';
import { google, drive_v3 } from 'googleapis';
import type { Credentials, OAuth2Client } from 'google-auth-library';
import { loadConfig } from './config';
import {
  readSessionCredentials,
  writeSessionCredentials,
} from './session';

export class AuthRequiredError extends Error {
  readonly status = 401;
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

function newOAuthClient(): OAuth2Client {
  const cfg = loadConfig();
  return new google.auth.OAuth2(
    cfg.google.clientId,
    cfg.google.clientSecret,
    cfg.google.redirectUri,
  );
}

/**
 * Return an OAuth2 client with no credentials attached. Use for kicking off
 * the consent flow or exchanging an authorization code.
 */
export function getAnonymousOAuthClient(): OAuth2Client {
  return newOAuthClient();
}

export function getAuthUrl(): string {
  const cfg = loadConfig();
  return getAnonymousOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: cfg.google.scopes,
    include_granted_scopes: true,
  });
}

export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  const client = getAnonymousOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Return a Drive client wired to the credentials in the current request's
 * session cookie. If the access token gets refreshed during the call, the
 * fresh credentials are persisted back to the cookie.
 *
 * Throws AuthRequiredError if no usable credentials are present.
 */
export async function getDriveClient(): Promise<drive_v3.Drive> {
  const stored = await readSessionCredentials();
  if (!stored || (!stored.access_token && !stored.refresh_token)) {
    throw new AuthRequiredError('Not authenticated. Visit /api/auth/google first.');
  }
  const client = newOAuthClient();
  client.setCredentials(stored);

  client.on('tokens', (next) => {
    const merged: Credentials = { ...stored, ...next };
    if (!merged.refresh_token && stored.refresh_token) {
      merged.refresh_token = stored.refresh_token;
    }
    // Best-effort: fire-and-forget the cookie write. cookies() must be
    // called inside a request scope; refresh during a request is fine.
    void writeSessionCredentials(merged).catch(() => {
      // Cookie write failure is non-fatal — next request will refresh again.
    });
  });

  return google.drive({ version: 'v3', auth: client });
}

export async function hasSessionCredentials(): Promise<boolean> {
  const creds = await readSessionCredentials();
  return !!(creds && (creds.access_token || creds.refresh_token));
}
