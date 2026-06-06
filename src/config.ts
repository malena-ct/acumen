import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optionalEnv(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== '' ? v : fallback;
}

function requireEnvWithAliases(primary: string, aliases: string[]): string {
  for (const name of [primary, ...aliases]) {
    const v = process.env[name];
    if (v && v.trim() !== '') return v;
  }
  const names = [primary, ...aliases].join(' or ');
  throw new Error(`Missing required environment variable: ${names}`);
}

export interface AppConfig {
  port: number;
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
    tokenPath: string;
  };
}

let cached: AppConfig | undefined;

export function loadConfig(): AppConfig {
  if (cached) return cached;

  const port = Number.parseInt(optionalEnv('PORT', '3000'), 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  const scopesRaw = optionalEnv(
    'GOOGLE_DRIVE_SCOPES',
    'https://www.googleapis.com/auth/drive.file',
  );
  const scopes = scopesRaw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  cached = {
    port,
    google: {
      clientId: requireEnv('GOOGLE_CLIENT_ID'),
      clientSecret: requireEnvWithAliases('GOOGLE_CLIENT_SECRET', ['GOOGLE_API_CLIENT_SECRET']),
      redirectUri: optionalEnv(
        'GOOGLE_REDIRECT_URI',
        `http://localhost:${port}/auth/google/callback`,
      ),
      scopes,
      tokenPath: path.resolve(optionalEnv('GOOGLE_TOKEN_PATH', './google-token.json')),
    },
  };

  return cached;
}
