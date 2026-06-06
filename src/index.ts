import express, { type NextFunction, type Request, type Response } from 'express';
import { loadConfig } from './config';
import { loadStoredTokens, AuthRequiredError } from './google';
import { authRouter } from './routes/auth';
import { driveRouter } from './routes/drive';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'halketon', time: new Date().toISOString() });
  });

  app.use('/auth', authRouter);
  app.use('/drive', driveRouter);

  app.use((req, res) => {
    res.status(404).json({ error: `Not Found: ${req.method} ${req.path}` });
  });

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const status =
        (err as { status?: number; code?: number }).status ??
        (err as { code?: number }).code ??
        500;
      const isAuthErr = err instanceof AuthRequiredError;
      const httpStatus = isAuthErr ? 401 : typeof status === 'number' && status >= 400 && status < 600 ? status : 500;

      const message =
        err instanceof Error ? err.message : 'Internal Server Error';

      if (!isAuthErr && httpStatus >= 500) {
        // eslint-disable-next-line no-console
        console.error('Server error:', err);
      }

      res.status(httpStatus).json({
        error: scrubMessage(message),
      });
    },
  );

  return app;
}

// Defence-in-depth: never echo back any token-shaped string in error messages.
function scrubMessage(msg: string): string {
  return msg
    .replace(/ya29\.[A-Za-z0-9_\-]+/g, '<redacted-token>')
    .replace(/1\/\/[A-Za-z0-9_\-]+/g, '<redacted-token>');
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  // Best-effort: load tokens at startup so the first request doesn't pay the cost.
  await loadStoredTokens().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('No stored Google tokens loaded:', (err as Error).message);
  });

  const app = createApp();
  app.listen(cfg.port, () => {
    // eslint-disable-next-line no-console
    console.log(`halketon listening on http://localhost:${cfg.port}`);
    // eslint-disable-next-line no-console
    console.log(`Start OAuth flow: http://localhost:${cfg.port}/auth/google`);
  });
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}
