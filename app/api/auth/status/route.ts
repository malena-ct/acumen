import { NextResponse } from 'next/server';
import { hasSessionCredentials } from '@/lib/google';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const authenticated = await hasSessionCredentials();
    return NextResponse.json({ authenticated });
  } catch (err) {
    return errorResponse(err);
  }
}
