import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  exchangeCodeForTokens,
  getAuthUrl,
  hasStoredTokens,
} from '../google';

export const authRouter = Router();

authRouter.get('/google', (req: Request, res: Response) => {
  const url = getAuthUrl();
  if (req.query.redirect === '0') {
    res.json({ url });
    return;
  }
  res.redirect(url);
});

authRouter.get(
  '/google/callback',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const code = typeof req.query.code === 'string' ? req.query.code : null;
      const error = typeof req.query.error === 'string' ? req.query.error : null;
      if (error) {
        res.status(400).json({ error: `Google OAuth error: ${error}` });
        return;
      }
      if (!code) {
        res.status(400).json({ error: 'Missing "code" query parameter' });
        return;
      }
      await exchangeCodeForTokens(code);
      res.json({ ok: true, message: 'Authentication successful. Tokens stored locally.' });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticated = await hasStoredTokens();
    res.json({ authenticated });
  } catch (err) {
    next(err);
  }
});
