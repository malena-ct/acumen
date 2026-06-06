import 'server-only';
import { NextResponse } from 'next/server';
import { AuthRequiredError } from './google';
import { scrubMessage } from './config';

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof AuthRequiredError) {
    return NextResponse.json({ error: scrubMessage(err.message) }, { status: 401 });
  }
  const status =
    typeof (err as { status?: number })?.status === 'number'
      ? (err as { status: number }).status
      : typeof (err as { code?: number })?.code === 'number'
        ? (err as { code: number }).code
        : 500;
  const httpStatus = status >= 400 && status < 600 ? status : 500;
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  if (httpStatus >= 500) {
    // eslint-disable-next-line no-console
    console.error('Server error:', err);
  }
  return NextResponse.json({ error: scrubMessage(message) }, { status: httpStatus });
}
