import { NextResponse } from 'next/server';
import { clearSessionCredentials } from '@/lib/session';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await clearSessionCredentials();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
